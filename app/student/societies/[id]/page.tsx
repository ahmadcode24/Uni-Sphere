"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentSocietyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [society, setSociety] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadSociety = async () => {
    try {
      const res = await fetch(`/api/societies/${params.id}`);
      if (!res.ok) {
        throw new Error("Society not found");
      }
      const data = await res.json();
      setSociety(data.society);
      setMembership(data.myMembership);

      // Load events for this society
      const evRes = await fetch(`/api/events/public?societyId=${params.id}`);
      if (evRes.ok) {
        const evData = await evRes.json();
        setEvents(evData.events || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch("/api/auth/me");
        if (!userRes.ok) {
          router.push(`/login?next=/student/societies/${params.id}`);
          return;
        }
        const uData = await userRes.json();
        setUser(uData.user);

        await loadSociety();
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id, router]);

  const handleJoinRequest = async () => {
    setActionLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/societies/${params.id}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }
      setMembership(data.membership);
      setMessage("Membership request sent to the society president!");
    } catch (err: any) {
      alert(err.message || "Failed to submit request");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!society) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Society not found.</h2>
        <Link href="/student/societies" className="text-emerald underline mt-2 inline-block">
          Return to Societies
        </Link>
      </div>
    );
  }

  const membershipStatus = membership?.status;

  return (
    <AppShell role="STUDENT" user={user} title={society.name}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/student/societies"
          className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to all societies
        </Link>

        {message && (
          <div className="p-3.5 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Hero Card */}
        <Card variant="surface" className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {society.logoUrl && (
                  <div className="w-12 h-12 rounded-[8px] border-2 border-ink overflow-hidden bg-paper flex-shrink-0">
                    <img src={society.logoUrl} alt={society.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <Badge variant="upcoming">{society.category}</Badge>
                </div>
                {membershipStatus === "APPROVED" && (
                  <Badge variant="approved">
                    {membership?.label === "CORE" ? "⭐ Core Member" : "Official Member"}
                  </Badge>
                )}
                {membershipStatus === "PENDING" && (
                  <Badge variant="pending">Join Request Pending</Badge>
                )}
                {membershipStatus === "REJECTED" && (
                  <Badge variant="rejected">Request Declined</Badge>
                )}
                {membershipStatus === "REMOVED" && (
                  <Badge variant="default">Membership Ended</Badge>
                )}
              </div>

              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
                {society.name}
              </h1>

              <p className="text-ink/80 text-base mt-3 leading-relaxed">
                {society.description}
              </p>

              {/* Society Meta */}
              <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-ink/75">
                <span className="flex items-center gap-1.5 bg-paper px-3 py-1.5 rounded-[8px] border border-ink/30">
                  <Mail className="w-4 h-4 text-emerald" /> {society.contactEmail}
                </span>
                {society.contactPhone && (
                  <span className="flex items-center gap-1.5 bg-paper px-3 py-1.5 rounded-[8px] border border-ink/30">
                    <Phone className="w-4 h-4 text-sky" /> {society.contactPhone}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-paper px-3 py-1.5 rounded-[8px] border border-ink/30">
                  <Users className="w-4 h-4 text-marigold" /> {society._count?.memberships || 0} active members
                </span>
              </div>
            </div>

            {/* Membership Action Panel */}
            <div className="md:w-64 flex-shrink-0 flex flex-col gap-3 p-4 bg-paper border-2 border-ink rounded-[14px] shadow-hard-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
                Society Membership
              </span>

              {!membershipStatus && (
                <div>
                  <p className="text-xs text-ink/70 mb-3">
                    Become an official member to vote, volunteer for events, and join internal meetings.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={actionLoading}
                    onClick={handleJoinRequest}
                  >
                    <UserPlus className="w-4 h-4 mr-1" /> Request to Join
                  </Button>
                </div>
              )}

              {membershipStatus === "PENDING" && (
                <div className="p-3 bg-marigold/30 border border-ink rounded-[10px] text-xs">
                  <p className="font-bold text-ink flex items-center gap-1 mb-1">
                    <Clock className="w-4 h-4 text-ink" /> Pending Approval
                  </p>
                  <p className="text-ink/80">
                    Your request was sent to {society.president?.name}. You will be notified once reviewed.
                  </p>
                </div>
              )}

              {membershipStatus === "APPROVED" && (
                <div className="p-3 bg-emerald/20 border border-ink rounded-[10px] text-xs">
                  <p className="font-bold text-emerald flex items-center gap-1 mb-1">
                    <CheckCircle className="w-4 h-4" /> Member in Good Standing
                  </p>
                  <p className="text-ink/80">
                    You have active access to society discussions and volunteer assignments.
                  </p>
                </div>
              )}

              {(membershipStatus === "REJECTED" || membershipStatus === "REMOVED") && (
                <div>
                  <p className="text-xs text-ink/70 mb-3">
                    {membershipStatus === "REJECTED"
                      ? "Your previous join request was declined."
                      : "You were previously removed from this society."}
                  </p>
                  <Button
                    variant="marigold"
                    size="md"
                    className="w-full"
                    disabled={actionLoading}
                    onClick={handleJoinRequest}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> Request Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Society Upcoming Events */}
        <div>
          <h2 className="font-display font-extrabold text-2xl text-ink tracking-tight mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-sky" />
            Events by {society.name}
          </h2>

          {events.length === 0 ? (
            <Card variant="surface" className="p-6 text-center text-sm text-ink/60">
              No public upcoming events scheduled right now. Check back soon!
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((e) => (
                <Card key={e.id} variant="surface" className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-sky">{e.venue}</span>
                      <Badge variant="upcoming">{e.scheduleStatus || "Upcoming"}</Badge>
                    </div>
                    <h3 className="font-display font-bold text-lg text-ink">{e.title}</h3>
                    <p className="text-xs text-ink/70 mt-1 line-clamp-2">{e.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t-2 border-mist flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald">
                      {e.seatsRemaining} seats left
                    </span>
                    <Link href={`/events/${e.id}`}>
                      <span className="text-xs font-bold text-ink hover:underline">
                        Event Details →
                      </span>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

