"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Check, X, Calendar, MapPin, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtPKTShort } from "@/lib/time";

export default function StudentInvitationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [uRes, iRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/invitations/my"),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (iRes.ok) {
        const iData = await iRes.json();
        setInvitations(iData.invitations || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleRespond = async (invitationId: string, action: "accept" | "decline") => {
    const verb = action === "accept" ? "Accept" : "Decline";
    if (!confirm(`${verb} this volunteer invitation? Your response is final.`)) return;

    setActionLoading(invitationId);
    setMessage("");

    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond");

      setMessage(`You have ${action}ed the volunteer invitation!`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to respond");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  const pendingInvites = invitations.filter((i) => i.status === "PENDING");
  const pastInvites = invitations.filter((i) => i.status !== "PENDING");

  return (
    <AppShell role="STUDENT" user={user} title="Volunteer Invitations">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Volunteer Invitations Inbox
          </h2>
          <p className="text-sm text-ink/70">
            Societies invite students to help organize and coordinate approved campus events.
          </p>
        </div>

        {message && (
          <div className="p-3.5 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {invitations.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-ink" />}
            title="No Invitations"
            description="You do not have any pending or past volunteer invitations."
          />
        ) : (
          <div className="space-y-6">
            {/* Pending Section */}
            <div>
              <h3 className="font-display font-bold text-lg text-ink mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-marigold" /> Awaiting Your Response ({pendingInvites.length})
              </h3>

              {pendingInvites.length === 0 ? (
                <Card variant="surface" className="p-5 text-center text-xs text-ink/60">
                  No invitations waiting for your response.
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingInvites.map((inv) => (
                    <Card
                      key={inv.id}
                      variant="surface"
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 bg-paper rounded border border-ink/40">
                            {inv.event.society?.name}
                          </span>
                          <Badge variant="pending">Awaiting Response</Badge>
                        </div>
                        <h4 className="font-display font-bold text-lg text-ink">
                          {inv.event.title}
                        </h4>
                        <p className="text-xs text-ink/70 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose" /> {inv.event.venue}
                          <span>•</span>
                          <Calendar className="w-3.5 h-3.5 text-emerald" /> {fmtPKTShort(inv.event.startAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-mist">
                        <Button
                          variant="rose"
                          size="sm"
                          disabled={actionLoading === inv.id}
                          onClick={() => handleRespond(inv.id, "decline")}
                        >
                          <X className="w-4 h-4 mr-1" /> Decline
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={actionLoading === inv.id}
                          onClick={() => handleRespond(inv.id, "accept")}
                        >
                          <Check className="w-4 h-4 mr-1" /> Accept Invite
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Past Responses */}
            {pastInvites.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-lg text-ink mb-3">Past Invitations</h3>
                <div className="space-y-2.5">
                  {pastInvites.map((inv) => (
                    <Card key={inv.id} variant="surface" className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-ink">{inv.event.title}</h4>
                        <p className="text-xs text-ink/60">{inv.event.society?.name}</p>
                      </div>
                      <Badge variant={inv.status === "ACCEPTED" ? "approved" : "rejected"}>
                        {inv.status === "ACCEPTED" ? "Accepted Volunteer" : "Declined"}
                      </Badge>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

