"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKT } from "@/lib/time";

export default function AdminReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [caps, setCaps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [uRes, eRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/events/${params.id}`),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (!eRes.ok) throw new Error("Proposal not found");
      const eData = await eRes.json();
      setEvent(eData.event);
      setCaps(eData.caps);
    } catch (err: any) {
      setError(err.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleDecision = async (decision: "APPROVE" | "REJECT") => {
    if (decision === "REJECT" && !remarks.trim()) {
      setError("Administrative remarks are strictly mandatory when rejecting a proposal.");
      return;
    }

    const confirmMsg =
      decision === "APPROVE"
        ? `Approve this event and authorize the requested budget of Rs ${event.proposedBudget.toLocaleString()} PKR?`
        : "Reject this event proposal and send back remarks to the society president?";

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/events/${params.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, remarks }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit decision");

      setMessage(`Decision recorded: Proposal marked as ${decision}. President has been notified.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Decision submission failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="font-bold">Proposal not found.</p>
        <Link href="/admin" className="text-emerald underline mt-2 block">
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  const isPastStart = new Date() >= new Date(event.startAt);

  return (
    <AppShell role="ADMIN" user={user} title="Proposal Review">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
        </Link>

        {message && (
          <div className="p-4 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Proposal Header Card */}
        <Card variant="surface" className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-mist">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-ink text-paper text-xs font-bold rounded-full border border-ink">
                {event.society?.name}
              </span>
              <Badge variant="upcoming">{event.society?.category}</Badge>
              <Badge variant="pending">Status: {event.approvalStatus}</Badge>
            </div>
            <span className="text-xs font-bold text-ink/60">
              Submitted: {new Date(event.submittedAt || event.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
              {event.title}
            </h1>
            <p className="text-ink/80 text-base mt-3 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Proposal Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-paper border-2 border-ink rounded-[14px]">
            <div>
              <span className="text-xs font-bold text-ink/60 uppercase block">Venue</span>
              <p className="text-sm font-bold text-ink mt-0.5">{event.venue}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-ink/60 uppercase block">Schedule (PKT)</span>
              <p className="text-xs font-bold text-ink mt-0.5">{fmtPKT(event.startAt)}</p>
              <p className="text-[11px] text-ink/60">to {fmtPKT(event.endAt)}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-ink/60 uppercase block">Requested Allocation</span>
              <p className="text-xl font-extrabold text-emerald mt-0.5">
                Rs {event.proposedBudget.toLocaleString()} PKR
              </p>
            </div>
          </div>

          {/* Past Start Warning (if applicable) */}
          {isPastStart && event.approvalStatus === "PENDING" && (
            <div className="p-4 bg-rose/15 border-2 border-rose rounded-[12px] text-xs font-bold text-rose flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>
                Event start date has already passed. Under campus governance rules, expired proposals cannot be approved and must be rejected.
              </span>
            </div>
          )}

          {/* Admin Decision Action Panel */}
          {event.approvalStatus === "PENDING" && (
            <div className="pt-6 border-t-2 border-mist space-y-4">
              <Textarea
                label="Administrative Remarks & Governance Notes"
                placeholder="Enter approval conditions or detailed reasons if rejecting..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                helper="Mandatory when rejecting a proposal. Visible to society president."
                rows={3}
              />

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  variant="rose"
                  size="md"
                  disabled={actionLoading}
                  onClick={() => handleDecision("REJECT")}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject Proposal
                </Button>

                {!isPastStart && (
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={actionLoading}
                    onClick={() => handleDecision("APPROVE")}
                  >
                    <CheckCircle className="w-5 h-5 mr-1" /> Approve Event & Budget
                  </Button>
                )}
              </div>
            </div>
          )}

          {event.approvalStatus !== "PENDING" && (
            <div className="p-4 bg-paper rounded-[12px] border border-ink/40 text-sm font-semibold">
              <span className="block text-xs uppercase tracking-wider text-ink/60 mb-1">
                Formal Administrative Decision:
              </span>
              <p>Decision: <strong>{event.approvalStatus}</strong></p>
              {event.adminRemarks && <p className="mt-1">Remarks: &ldquo;{event.adminRemarks}&rdquo;</p>}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

