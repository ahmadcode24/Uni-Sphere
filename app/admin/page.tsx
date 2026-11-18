"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  DollarSign,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { fmtPKTShort } from "@/lib/time";
import { useLive } from "@/lib/use-live";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const { data: liveStats, refresh } = useLive("/api/admin/stats", 3000);

  useEffect(() => {
    if (liveStats) {
      setStats(liveStats);
    }
  }, [liveStats]);

  useEffect(() => {
    async function load() {
      try {
        const uRes = await fetch("/api/auth/me");
        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        setUser(uData.user);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // Quick Decision (Approve / Reject) for Pending Proposals
  const handleQuickDecision = async (
    eventId: string,
    eventTitle: string,
    decision: "APPROVE" | "REJECT"
  ) => {
    let remarks = "Approved by administration.";
    if (decision === "REJECT") {
      const input = window.prompt(`Enter reason for declining proposal "${eventTitle}":`);
      if (input === null) return; // user cancelled prompt
      if (!input.trim()) {
        alert("Rejection remarks are required.");
        return;
      }
      remarks = input.trim();
    } else {
      if (!confirm(`Are you sure you want to APPROVE proposal "${eventTitle}"?`)) return;
    }

    setActionLoadingId(eventId);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/events/${eventId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, remarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit decision");

      setMessage(`Proposal "${eventTitle}" has been ${decision === "APPROVE" ? "Approved" : "Declined"}.`);
      if (refresh) refresh();
    } catch (err: any) {
      setError(err.message || "Failed to process decision");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancellation Request Decision (Approve / Reject Cancellation)
  const handleCancelDecision = async (
    eventId: string,
    eventTitle: string,
    decision: "APPROVE_CANCEL" | "REJECT_CANCEL"
  ) => {
    const confirmMsg =
      decision === "APPROVE_CANCEL"
        ? `Approve cancellation of "${eventTitle}"? This will cancel the event and notify registered attendees.`
        : `Decline cancellation request for "${eventTitle}" and keep event active?`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(eventId);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/events/${eventId}/cancel-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, remarks: "Decided by administration" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process cancellation decision");

      setMessage(
        decision === "APPROVE_CANCEL"
          ? `Event "${eventTitle}" cancellation approved.`
          : `Cancellation request for "${eventTitle}" declined. Event remains active.`
      );
      if (refresh) refresh();
    } catch (err: any) {
      setError(err.message || "Failed to process cancellation");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Direct Admin Delete Event
  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently DELETE "${eventTitle}"?\n\nThis will remove all registrations, invitations, tasks, and expenses permanently.`
      )
    ) {
      return;
    }

    setActionLoadingId(eventId);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete event");

      setMessage(`Event "${eventTitle}" deleted successfully.`);
      if (refresh) refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete event");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const pendingList = stats?.pendingProposals || [];
  const cancelRequests = stats?.cancelRequests || [];
  const allEventsList = stats?.allEvents || [];

  // Filter and search All Events
  const filteredEvents = allEventsList.filter((e: any) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.society?.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "ALL") return true;
    if (filterStatus === "APPROVED") return e.approvalStatus === "APPROVED" && !e.isCancelled;
    if (filterStatus === "PENDING") return e.approvalStatus === "PENDING";
    if (filterStatus === "DRAFT") return e.approvalStatus === "DRAFT";
    if (filterStatus === "CANCELLED") return e.isCancelled || e.approvalStatus === "CANCELLED";
    if (filterStatus === "CANCEL_REQUESTED") return e.approvalStatus === "CANCEL_REQUESTED";

    return true;
  });

  const getStatusBadge = (e: any) => {
    if (e.isCancelled || e.approvalStatus === "CANCELLED") {
      return <Badge variant="cancelled">Cancelled</Badge>;
    }
    if (e.approvalStatus === "CANCEL_REQUESTED") {
      return <Badge variant="high">Cancellation Requested</Badge>;
    }
    if (e.approvalStatus === "APPROVED") {
      return <Badge variant="approved">Approved</Badge>;
    }
    if (e.approvalStatus === "PENDING") {
      return <Badge variant="pending">Pending Review</Badge>;
    }
    if (e.approvalStatus === "REJECTED") {
      return <Badge variant="rejected">Rejected</Badge>;
    }
    return <Badge variant="draft">Draft</Badge>;
  };

  return (
    <AppShell role="ADMIN" user={user} title="Campus Oversight & Administration">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Campus Oversight & Governance
            </h2>
            <p className="text-sm text-ink/70">
              Live telemetry, real-time proposal approval/decline, cancellation decisions, and full campus event management.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald/10 text-emerald text-xs font-bold rounded-full border border-emerald/30">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              Live Synced (3s)
            </span>
          </div>
        </div>

        {/* Global Notifications / Error Messages */}
        {message && (
          <div className="p-4 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage("")} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3 Real Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between text-ink/70 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Registered Societies</span>
              <Building2 className="w-5 h-5 text-emerald" />
            </div>
            <span className="font-display font-extrabold text-4xl text-ink">
              {stats?.societiesCount || 0}
            </span>
            <p className="text-xs text-ink/60 mt-1">Official university student societies</p>
          </Card>

          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between text-ink/70 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total Campus Events</span>
              <Calendar className="w-5 h-5 text-sky" />
            </div>
            <span className="font-display font-extrabold text-4xl text-ink">
              {stats?.eventsCount || 0}
            </span>
            <p className="text-xs text-ink/60 mt-1">Active, pending, and scheduled events</p>
          </Card>

          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between text-ink/70 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Student Registrations</span>
              <Users className="w-5 h-5 text-marigold" />
            </div>
            <span className="font-display font-extrabold text-4xl text-ink">
              {stats?.registrationsCount || 0}
            </span>
            <p className="text-xs text-ink/60 mt-1">Live confirmed student attendances</p>
          </Card>
        </div>

        {/* SECTION 1: Pending Event Proposals (With Quick Approve & Decline) */}
        <Card variant="surface" className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-mist mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-marigold" />
                <h3 className="font-display font-bold text-xl text-ink">
                  Pending Event Proposals
                </h3>
              </div>
              <p className="text-xs text-ink/70 mt-0.5">
                Proposals submitted by society presidents awaiting administrative budget, date, and venue review.
              </p>
            </div>
            <Badge variant="pending">
              {pendingList.length} Awaiting Decision
            </Badge>
          </div>

          {pendingList.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink/60 bg-paper/50 rounded-[12px] border border-dashed border-ink/20">
              ✨ All caught up! There are currently no pending event proposals waiting for decision.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                    <th className="py-3 px-2">Event Proposal</th>
                    <th className="py-3 px-2">Society</th>
                    <th className="py-3 px-2">Proposed Budget</th>
                    <th className="py-3 px-2">Date (PKT)</th>
                    <th className="py-3 px-2 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {pendingList.map((e: any) => {
                    const isBusy = actionLoadingId === e.id;
                    const isPastStart = new Date() >= new Date(e.startAt);
                    return (
                      <tr key={e.id} className="font-medium text-ink hover:bg-mist/20 transition-colors">
                        <td className="py-4 px-2">
                          <p className="font-bold text-base text-ink leading-tight">{e.title}</p>
                          <p className="text-xs text-ink/60 mt-0.5">{e.venue} • Cap: {e.capacity}</p>
                        </td>
                        <td className="py-4 px-2">
                          <span className="px-2.5 py-1 bg-paper border border-ink/40 rounded text-xs font-bold">
                            {e.society?.name}
                          </span>
                        </td>
                        <td className="py-4 px-2 font-bold text-emerald">
                          Rs {e.proposedBudget?.toLocaleString()} PKR
                        </td>
                        <td className="py-4 px-2 text-xs font-semibold text-ink/75">
                          {fmtPKTShort(e.startAt)}
                          {isPastStart && (
                            <span className="block mt-1 px-1.5 py-0.5 bg-rose text-white text-[10px] font-extrabold rounded text-center">
                              Past Start Time
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Quick Approve Button */}
                            {isPastStart ? (
                              <span
                                className="px-2.5 py-1 bg-mist/60 text-ink/40 text-xs font-bold rounded border border-ink/20 cursor-not-allowed"
                                title="Cannot approve: Event start time has already passed. Under university rules, expired proposals cannot be approved."
                              >
                                Expired Start
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={isBusy}
                                onClick={() => handleQuickDecision(e.id, e.title, "APPROVE")}
                                className="bg-emerald hover:bg-emerald/90 text-white shadow-hard-sm"
                                title="Instantly Approve Proposal"
                              >
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                            )}

                            {/* Quick Decline Button */}
                            <Button
                              size="sm"
                              variant="rose"
                              disabled={isBusy}
                              onClick={() => handleQuickDecision(e.id, e.title, "REJECT")}
                              title="Decline with Remarks"
                            >
                              <X className="w-4 h-4 mr-1" /> Decline
                            </Button>

                            {/* Review Link */}
                            <Link href={`/admin/review/${e.id}`}>
                              <Button size="sm" variant="secondary" title="View Full Proposal Details">
                                Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* SECTION 2: Cancellation & Deletion Requests from Presidents */}
        {cancelRequests.length > 0 && (
          <Card variant="surface" className="p-6 md:p-8 border-2 border-rose">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-rose/30 mb-6 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose" />
                  <h3 className="font-display font-bold text-xl text-ink">
                    Event Cancellation Requests
                  </h3>
                </div>
                <p className="text-xs text-ink/70 mt-0.5">
                  Society presidents have submitted cancellation requests for these events. Review and approve or decline.
                </p>
              </div>
              <Badge variant="high">
                {cancelRequests.length} Cancellation Requests
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                    <th className="py-3 px-2">Event Title</th>
                    <th className="py-3 px-2">Society</th>
                    <th className="py-3 px-2">Registered Attendees</th>
                    <th className="py-3 px-2">Remarks / Reason</th>
                    <th className="py-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {cancelRequests.map((e: any) => {
                    const isBusy = actionLoadingId === e.id;
                    return (
                      <tr key={e.id} className="font-medium text-ink hover:bg-mist/20 transition-colors">
                        <td className="py-4 px-2">
                          <p className="font-bold text-base text-ink">{e.title}</p>
                          <p className="text-xs text-ink/60">{fmtPKTShort(e.startAt)} • {e.venue}</p>
                        </td>
                        <td className="py-4 px-2">
                          <span className="px-2.5 py-1 bg-paper border border-ink/40 rounded text-xs font-bold">
                            {e.society?.name}
                          </span>
                        </td>
                        <td className="py-4 px-2 font-bold text-sky">
                          {e._count?.registrations || 0} registered
                        </td>
                        <td className="py-4 px-2 text-xs text-ink/80 max-w-xs truncate">
                          {e.adminRemarks || "No reason provided"}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="rose"
                              disabled={isBusy}
                              onClick={() => handleCancelDecision(e.id, e.title, "APPROVE_CANCEL")}
                              title="Approve Cancellation & Close Event"
                            >
                              Approve Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isBusy}
                              onClick={() => handleCancelDecision(e.id, e.title, "REJECT_CANCEL")}
                              title="Decline & Keep Active"
                            >
                              Keep Active
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* SECTION 3: All Campus Events Management (View, Filter, Approve/Decline, Delete) */}
        <Card variant="surface" className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b-2 border-mist mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald" />
                <h3 className="font-display font-bold text-xl text-ink">
                  All Campus Events ({filteredEvents.length})
                </h3>
              </div>
              <p className="text-xs text-ink/70 mt-0.5">
                Comprehensive university-wide event directory across all societies with full administrative deletion and moderation authority.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: "All Events" },
                { id: "APPROVED", label: "Approved" },
                { id: "PENDING", label: "Pending" },
                { id: "DRAFT", label: "Draft" },
                { id: "CANCELLED", label: "Cancelled" },
                { id: "CANCEL_REQUESTED", label: "Cancel Requests" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-[8px] border-2 transition-all ${
                    filterStatus === f.id
                      ? "bg-marigold text-ink border-ink shadow-hard-sm"
                      : "bg-paper text-ink/70 border-ink/30 hover:border-ink hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="mb-6 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-ink/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events by title, society name, or venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-paper text-ink text-sm rounded-[10px] border-2 border-ink focus:outline-none focus:border-emerald font-medium placeholder:text-ink/40"
              />
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink/60 bg-paper/40 rounded-[12px] border border-dashed border-ink/20">
              No campus events matched the selected filter or search keywords.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                    <th className="py-3 px-2">Event Title & Venue</th>
                    <th className="py-3 px-2">Society</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Date (PKT)</th>
                    <th className="py-3 px-2">Seats / Cap</th>
                    <th className="py-3 px-2">Budget</th>
                    <th className="py-3 px-2 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {filteredEvents.map((e: any) => {
                    const isBusy = actionLoadingId === e.id;
                    const registeredCount = e._count?.registrations || 0;
                    return (
                      <tr key={e.id} className="font-medium text-ink hover:bg-mist/20 transition-colors">
                        <td className="py-4 px-2 max-w-xs">
                          <p className="font-bold text-base text-ink leading-tight truncate">{e.title}</p>
                          <p className="text-xs text-ink/60 mt-0.5 truncate">{e.venue}</p>
                        </td>
                        <td className="py-4 px-2 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-paper border border-ink/40 rounded text-xs font-bold">
                            {e.society?.name || "Independent"}
                          </span>
                        </td>
                        <td className="py-4 px-2 whitespace-nowrap">
                          {getStatusBadge(e)}
                        </td>
                        <td className="py-4 px-2 text-xs font-semibold text-ink/75 whitespace-nowrap">
                          {fmtPKTShort(e.startAt)}
                        </td>
                        <td className="py-4 px-2 whitespace-nowrap">
                          <span className="text-xs font-bold text-ink">
                            {registeredCount} / {e.capacity}
                          </span>
                        </td>
                        <td className="py-4 px-2 whitespace-nowrap font-bold text-xs text-emerald">
                          Rs {(e.approvedBudget || e.proposedBudget)?.toLocaleString()} PKR
                        </td>
                        <td className="py-4 px-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If pending, show Quick Approve */}
                            {e.approvalStatus === "PENDING" && (
                              <button
                                onClick={() => handleQuickDecision(e.id, e.title, "APPROVE")}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-emerald text-white rounded-[6px] border border-ink text-xs font-bold hover:bg-emerald/90 transition-all shadow-sm"
                                title="Approve Proposal"
                              >
                                Approve
                              </button>
                            )}

                            {/* If pending, show Quick Decline */}
                            {e.approvalStatus === "PENDING" && (
                              <button
                                onClick={() => handleQuickDecision(e.id, e.title, "REJECT")}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-rose text-white rounded-[6px] border border-ink text-xs font-bold hover:bg-rose/90 transition-all shadow-sm"
                                title="Decline Proposal"
                              >
                                Decline
                              </button>
                            )}

                            {/* If cancel requested, show Quick Approve Cancel */}
                            {e.approvalStatus === "CANCEL_REQUESTED" && (
                              <button
                                onClick={() => handleCancelDecision(e.id, e.title, "APPROVE_CANCEL")}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-rose text-white rounded-[6px] border border-ink text-xs font-bold hover:bg-rose/90 transition-all shadow-sm"
                                title="Approve Cancellation"
                              >
                                Cancel
                              </button>
                            )}

                            {/* View / Review Link */}
                            <Link href={e.approvalStatus === "PENDING" ? `/admin/review/${e.id}` : `/events/${e.id}`}>
                              <button
                                className="p-1.5 bg-paper hover:bg-mist text-ink border border-ink rounded-[6px] transition-all"
                                title="View Event Notice"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </Link>

                            {/* Delete Event Button */}
                            <button
                              onClick={() => handleDeleteEvent(e.id, e.title)}
                              disabled={isBusy}
                              className="p-1.5 bg-paper hover:bg-rose hover:text-white text-rose border border-ink rounded-[6px] transition-all"
                              title="Permanently Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
