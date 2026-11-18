"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, UserPlus, ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function EventVolunteersPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [uRes, eRes, iRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/events/${params.id}`),
        fetch(`/api/events/${params.id}/invitations`),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (!eRes.ok) throw new Error("Event not found");
      const eData = await eRes.json();
      setEvent(eData.event);

      if (iRes.ok) {
        const iData = await iRes.json();
        setInvitations(iData.invitations || []);
      }

      // Load society members to suggest first
      const mRes = await fetch(`/api/societies/${eData.event.societyId}/members`);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMembers(mData.members || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load volunteers data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setInviting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${params.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitation");

      setMessage("Volunteer invitation sent successfully!");
      setSelectedStudentId("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
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

  // Filter available students from members who haven't been invited yet
  const invitedIds = new Set(invitations.map((i) => i.studentId));
  const availableMembers = members.filter(
    (m) => m.status === "APPROVED" && !invitedIds.has(m.studentId)
  );

  return (
    <AppShell role="PRESIDENT" user={user} title={`Volunteers — ${event?.title}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href={`/president/events/${params.id}`}
          className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Event Management
        </Link>

        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Event Volunteer Crew
          </h2>
          <p className="text-sm text-ink/70">
            Invite students to coordinate logistical stations. Once accepted, they can be assigned tasks on the Kanban board.
          </p>
        </div>

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

        {/* Invite Form */}
        <Card variant="surface" className="p-6">
          <h3 className="font-display font-bold text-lg text-ink mb-2">
            Send Volunteer Invitation
          </h3>
          <p className="text-xs text-ink/70 mb-4">
            Official approved society members are recommended first below.
          </p>

          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-surface text-ink border-2 rounded-[8px] border-ink shadow-hard-sm font-medium text-sm focus:outline-none"
              required
            >
              <option value="">-- Choose Society Member to Invite --</option>
              {availableMembers.map((m) => (
                <option key={m.student.id} value={m.student.id}>
                  {m.student.name} ({m.student.email}) {m.label === "CORE" ? "⭐ Core" : ""}
                </option>
              ))}
            </select>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={inviting || !selectedStudentId}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </Card>

        {/* Invitations List */}
        <Card variant="surface" className="p-6">
          <h3 className="font-display font-bold text-lg text-ink mb-4 pb-2 border-b-2 border-mist">
            Invitation Statuses ({invitations.length})
          </h3>

          {invitations.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink/60">
              No volunteer invitations sent for this event yet.
            </div>
          ) : (
            <div className="divide-y divide-mist">
              {invitations.map((inv) => (
                <div key={inv.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-ink">{inv.student.name}</p>
                    <p className="text-xs text-ink/60">{inv.student.email}</p>
                  </div>

                  <div>
                    {inv.status === "ACCEPTED" && (
                      <Badge variant="approved">Accepted Volunteer</Badge>
                    )}
                    {inv.status === "PENDING" && (
                      <Badge variant="pending">Awaiting Student Response</Badge>
                    )}
                    {inv.status === "DECLINED" && (
                      <Badge variant="rejected">Declined</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

