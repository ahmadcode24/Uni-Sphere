"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Send,
  Edit,
  XCircle,
  CheckCircle,
  AlertCircle,
  DollarSign,
  ArrowLeft,
  UserCheck,
  CheckSquare,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtPKT, toPKTInput } from "@/lib/time";

export default function PresidentEventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [caps, setCaps] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    venue: "",
    startAt: "",
    endAt: "",
    registrationDeadline: "",
    capacity: 50,
    proposedBudget: 25000,
  });

  const loadData = async () => {
    try {
      const [uRes, eRes, rRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/events/${params.id}`),
        fetch(`/api/events/${params.id}/registrations`),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (!eRes.ok) {
        throw new Error("Event not found");
      }
      const eData = await eRes.json();
      setEvent(eData.event);
      setCaps(eData.caps);

      // Populate edit form
      setEditForm({
        title: eData.event.title,
        description: eData.event.description,
        venue: eData.event.venue,
        startAt: toPKTInput(eData.event.startAt),
        endAt: toPKTInput(eData.event.endAt),
        registrationDeadline: toPKTInput(eData.event.registrationDeadline),
        capacity: eData.event.capacity,
        proposedBudget: eData.event.proposedBudget,
      });

      if (rRes.ok) {
        const rData = await rRes.json();
        setRegistrations(rData.registrations || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/stream?event=${params.id}`);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.kind === "seats" || data.kind === "task") {
            loadData();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      if (es) es.close();
    };
  }, [params.id]);

  const handleSubmitProposal = async () => {
    if (!confirm("Submit this proposal to university administration for approval?")) return;
    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${params.id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit proposal");

      setMessage("Event proposal submitted for admin approval!");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!confirm("Are you sure you want to CANCEL this event? Cancellation is irreversible and will notify all registered attendees.")) {
      return;
    }
    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${params.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel event");

      setMessage("Event has been cancelled. Registrations have been closed.");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update event");

      setEditOpen(false);
      setMessage("Event updated successfully!" + (event.approvalStatus === "APPROVED" ? " Proposal returned to Pending for admin re-approval." : ""));
      await loadData();
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="font-bold">Event not found.</p>
        <Link href="/president/events" className="text-emerald underline mt-2 block">
          Return to Events
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string, isCancelled: boolean): BadgeVariant => {
    if (isCancelled) return "cancelled";
    switch (status) {
      case "APPROVED":
        return "approved";
      case "PENDING":
        return "pending";
      case "REJECTED":
        return "rejected";
      case "DRAFT":
      default:
        return "draft";
    }
  };

  const tabs = [
    { id: "overview", label: "Overview & Logistics" },
    { id: "registrations", label: `Registrations (${registrations.filter((r) => r.status === "REGISTERED").length})` },
    { id: "volunteers", label: "Volunteers" },
    { id: "tasks", label: "Tasks" },
    { id: "expenses", label: "Budget & Expenses" },
  ];

  return (
    <AppShell role="PRESIDENT" user={user} title={event.title}>
      <div className="space-y-6">
        {/* Top Navigation & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/president/events"
            className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to all events
          </Link>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {caps?.canSubmit && (
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={handleSubmitProposal}
              >
                <Send className="w-4 h-4 mr-1" /> Submit for Approval
              </Button>
            )}

            {caps?.canEdit && (
              <Button
                variant="secondary"
                size="sm"
                disabled={actionLoading}
                onClick={() => setEditOpen(true)}
              >
                <Edit className="w-4 h-4 mr-1" /> Edit Event
              </Button>
            )}

            {caps?.canCancel && (
              <Button
                variant="rose"
                size="sm"
                disabled={actionLoading}
                onClick={handleCancelEvent}
              >
                <XCircle className="w-4 h-4 mr-1" /> Cancel Event
              </Button>
            )}

            {caps?.publicVisible && (
              <Link href={`/events/${event.id}`} target="_blank">
                <Button variant="ghost" size="sm">
                  View Public Link ↗
                </Button>
              </Link>
            )}
          </div>
        </div>

        {message && (
          <div className="p-3.5 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status Callout Banner */}
        <div
          className={`p-5 rounded-[16px] border-2 border-ink shadow-hard-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            event.isCancelled
              ? "bg-paper text-ink"
              : event.approvalStatus === "APPROVED"
              ? "bg-emerald text-white"
              : event.approvalStatus === "PENDING"
              ? "bg-marigold text-ink"
              : event.approvalStatus === "REJECTED"
              ? "bg-rose text-white"
              : "bg-surface text-ink"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight">
                Status: {event.isCancelled ? "Cancelled" : event.approvalStatus}
              </span>
              <Badge variant={getStatusBadge(event.approvalStatus, event.isCancelled)}>
                {caps?.scheduleStatus}
              </Badge>
            </div>
            <p className="text-xs md:text-sm opacity-90">
              {event.isCancelled
                ? "This event was cancelled. Registrations and public links are permanently deactivated."
                : event.approvalStatus === "APPROVED"
                ? `Approved by Administration. Budget: Rs ${event.approvedBudget?.toLocaleString()} PKR.`
                : event.approvalStatus === "PENDING"
                ? "Submitted to administration for event & budget approval. Details are currently locked."
                : event.approvalStatus === "REJECTED"
                ? `Proposal declined by admin. Remarks: "${event.adminRemarks || "Revise and resubmit."}"`
                : "Draft proposal. Complete details and click 'Submit for Approval' to request budget."}
            </p>
          </div>

          {event.adminRemarks && event.approvalStatus === "APPROVED" && (
            <div className="text-xs bg-white/20 p-2.5 rounded-[10px] border border-white/40">
              <span className="font-bold block">Admin note:</span>
              <span>{event.adminRemarks}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="surface" className="md:col-span-2 p-6 space-y-4">
              <div>
                <h3 className="font-display font-bold text-xl text-ink">Description & Scope</h3>
                <p className="text-ink/80 text-sm mt-2 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>

              <div className="pt-4 border-t-2 border-mist grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-ink/60 uppercase block">Start Time (PKT)</span>
                  <p className="text-sm font-bold text-ink mt-0.5">{fmtPKT(event.startAt)}</p>
                </div>
                <div>
                  <span className="text-ink/60 uppercase block">End Time (PKT)</span>
                  <p className="text-sm font-bold text-ink mt-0.5">{fmtPKT(event.endAt)}</p>
                </div>
                <div>
                  <span className="text-ink/60 uppercase block">Venue</span>
                  <p className="text-sm font-bold text-ink mt-0.5">{event.venue}</p>
                </div>
                <div>
                  <span className="text-ink/60 uppercase block">Registration Deadline</span>
                  <p className="text-sm font-bold text-ink mt-0.5">
                    {fmtPKT(event.registrationDeadline)}
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="surface" className="p-6 space-y-4">
              <h3 className="font-display font-bold text-lg text-ink">Key Figures</h3>

              <div className="p-3.5 bg-paper rounded-[10px] border border-ink/30 space-y-1">
                <span className="text-xs font-bold text-ink/60 uppercase">Capacity</span>
                <p className="font-display font-extrabold text-2xl text-ink">{event.capacity}</p>
                <p className="text-xs text-ink/70">
                  {event.registeredCount || 0} registered ({event.seatsRemaining} seats left)
                </p>
              </div>

              <div className="p-3.5 bg-paper rounded-[10px] border border-ink/30 space-y-1">
                <span className="text-xs font-bold text-ink/60 uppercase">Budget</span>
                <p className="font-display font-extrabold text-2xl text-emerald">
                  Rs {(event.approvedBudget || event.proposedBudget).toLocaleString()}
                </p>
                <p className="text-xs text-ink/70">
                  {event.approvedBudget ? "Official Approved Allocation" : "Proposed to Admin"}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Registrations */}
        {activeTab === "registrations" && (
          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-mist mb-4">
              <div>
                <h3 className="font-display font-bold text-xl text-ink">Registered Students</h3>
                <p className="text-xs text-ink/70">
                  {registrations.filter((r) => r.status === "REGISTERED").length} confirmed attendees
                </p>
              </div>
            </div>

            {registrations.length === 0 ? (
              <p className="text-sm text-center py-8 text-ink/60">No student registrations recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                      <th className="py-2.5">Student Name</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Registered At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {registrations.map((r) => (
                      <tr key={r.id} className="font-medium text-ink">
                        <td className="py-3 font-bold">{r.student.name}</td>
                        <td className="py-3 text-ink/70">{r.student.email}</td>
                        <td className="py-3">
                          <Badge variant={r.status === "REGISTERED" ? "approved" : "cancelled"}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-ink/60">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 3: Volunteers (Linked to Phase 4) */}
        {activeTab === "volunteers" && (
          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-mist mb-4">
              <h3 className="font-display font-bold text-xl text-ink">Volunteer Crew</h3>
              <Link href={`/president/events/${event.id}/volunteers`}>
                <Button variant="primary" size="sm">
                  Manage Volunteer Invitations
                </Button>
              </Link>
            </div>
            <p className="text-sm text-ink/70">
              Invite students who have requested to join or are official society members to help coordinate event tracks, stage logistics, and registration desks.
            </p>
          </Card>
        )}

        {/* Tab 4: Tasks (Linked to Phase 4) */}
        {activeTab === "tasks" && (
          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-mist mb-4">
              <h3 className="font-display font-bold text-xl text-ink">Event Task Board</h3>
              <Link href={`/president/events/${event.id}/tasks`}>
                <Button variant="marigold" size="sm">
                  Open Kanban Board
                </Button>
              </Link>
            </div>
            <p className="text-sm text-ink/70">
              Assign action items to accepted student volunteers and track sprint progress.
            </p>
          </Card>
        )}

        {/* Tab 5: Expenses (Linked to Phase 4) */}
        {activeTab === "expenses" && (
          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-mist mb-4">
              <h3 className="font-display font-bold text-xl text-ink">Budget Receipts & Expenses</h3>
              <Link href={`/president/events/${event.id}/expenses`}>
                <Button variant="secondary" size="sm">
                  Manage Expenses
                </Button>
              </Link>
            </div>
            <p className="text-sm text-ink/70">
              Record receipts against the approved budget cap of Rs {event.approvedBudget?.toLocaleString() || event.proposedBudget.toLocaleString()}.
            </p>
          </Card>
        )}
      </div>

      {/* Edit Event Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Event Proposal" maxWidth="max-w-2xl">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Event Title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            required
            rows={3}
          />

          <Input
            label="Campus Venue"
            value={editForm.venue}
            onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time (PKT)"
              type="datetime-local"
              value={editForm.startAt}
              onChange={(e) => setEditForm({ ...editForm, startAt: e.target.value })}
              required
            />
            <Input
              label="End Time (PKT)"
              type="datetime-local"
              value={editForm.endAt}
              onChange={(e) => setEditForm({ ...editForm, endAt: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capacity"
              type="number"
              min={event.registeredCount || 1}
              value={editForm.capacity}
              onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 1 })}
              required
              helper={`Must be >= active count (${event.registeredCount || 0})`}
            />
            <Input
              label="Proposed Budget (PKR)"
              type="number"
              min={0}
              value={editForm.proposedBudget}
              onChange={(e) => setEditForm({ ...editForm, proposedBudget: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          {event.approvalStatus === "APPROVED" && (
            <div className="p-3 bg-marigold/30 border border-ink rounded-[10px] text-xs font-semibold text-ink">
              ⚠️ Note: Editing an Approved event will return its status to Pending for admin re-approval. Current registrations are preserved.
            </div>
          )}

          <div className="pt-4 border-t-2 border-mist flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save & Update"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

