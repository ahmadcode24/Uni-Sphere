"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Calendar,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function PresidentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [society, setSociety] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch("/api/auth/me");
        if (!userRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await userRes.json();
        setUser(uData.user);

        const sRes = await fetch("/api/societies?my=true");
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.society) {
            setSociety(sData.society);

            // Fetch members and events for this society
            const [memRes, evRes] = await Promise.all([
              fetch(`/api/societies/${sData.society.id}/members`),
              fetch("/api/events"),
            ]);

            if (memRes.ok) {
              const mData = await memRes.json();
              setMembers(mData.members || []);
            }
            if (evRes.ok) {
              const eData = await evRes.json();
              setEvents(eData.events || []);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!society) {
    return (
      <AppShell role="PRESIDENT" user={user} title="President Dashboard">
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-emerald" />}
          title="Welcome President! Set up your society."
          description="Every student society president commands an official campus noticeboard. Start by creating your society charter."
          action={
            <Button variant="primary" size="lg" onClick={() => router.push("/president/society")}>
              <PlusCircle className="w-5 h-5 mr-1" /> Create Society
            </Button>
          }
        />
      </AppShell>
    );
  }

  const pendingMembers = members.filter((m) => m.status === "PENDING");
  const approvedMembers = members.filter((m) => m.status === "APPROVED");
  const pendingEvents = events.filter((e) => e.approvalStatus === "PENDING");
  const rejectedEvents = events.filter((e) => e.approvalStatus === "REJECTED");
  const approvedUpcoming = events.filter((e) => e.approvalStatus === "APPROVED" && !e.isCancelled);

  return (
    <AppShell role="PRESIDENT" user={user} title={society.name}>
      <div className="space-y-8">
        {/* Society Hero Band (emerald per Design System) */}
        <Card variant="featured" colorBlock="emerald" className="p-6 md:p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="inline-block px-3 py-1 bg-marigold text-ink font-bold text-xs rounded-full border border-ink shadow-hard-sm mb-3">
                {society.category} Society
              </span>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                {society.name}
              </h2>
              <p className="text-white/90 text-sm md:text-base max-w-2xl mt-2 line-clamp-2">
                {society.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/president/events/new">
                <Button variant="marigold" size="md">
                  <PlusCircle className="w-4 h-4 mr-1" /> New Event Proposal
                </Button>
              </Link>
              <Link href="/president/society">
                <Button variant="secondary" size="md">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Stat Tiles with Asymmetric Sizes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="surface" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink/70">
              <span className="text-xs font-bold uppercase tracking-wider">Active Members</span>
              <Users className="w-5 h-5 text-emerald" />
            </div>
            <div className="mt-3">
              <span className="font-display font-extrabold text-3xl text-ink">
                {approvedMembers.length}
              </span>
              <p className="text-xs text-ink/60 mt-1">
                {pendingMembers.length} pending review
              </p>
            </div>
          </Card>

          <Card variant="surface" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink/70">
              <span className="text-xs font-bold uppercase tracking-wider">Approved Events</span>
              <Calendar className="w-5 h-5 text-sky" />
            </div>
            <div className="mt-3">
              <span className="font-display font-extrabold text-3xl text-ink">
                {approvedUpcoming.length}
              </span>
              <p className="text-xs text-ink/60 mt-1">Live on campus</p>
            </div>
          </Card>

          <Card variant="surface" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink/70">
              <span className="text-xs font-bold uppercase tracking-wider">Under Admin Review</span>
              <Clock className="w-5 h-5 text-marigold" />
            </div>
            <div className="mt-3">
              <span className="font-display font-extrabold text-3xl text-ink">
                {pendingEvents.length}
              </span>
              <p className="text-xs text-ink/60 mt-1">Pending proposals</p>
            </div>
          </Card>

          <Card variant="surface" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink/70">
              <span className="text-xs font-bold uppercase tracking-wider">Revisions Needed</span>
              <AlertCircle className="w-5 h-5 text-rose" />
            </div>
            <div className="mt-3">
              <span className="font-display font-extrabold text-3xl text-rose">
                {rejectedEvents.length}
              </span>
              <p className="text-xs text-ink/60 mt-1">Requires president edit</p>
            </div>
          </Card>
        </div>

        {/* Needs Your Attention Section */}
        <div>
          <h3 className="font-display font-extrabold text-xl text-ink tracking-tight mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose" />
            Needs Your Attention
          </h3>

          <div className="space-y-3">
            {pendingMembers.length > 0 && (
              <div className="p-4 bg-marigold/20 border-2 border-ink rounded-[14px] shadow-hard-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-ink">
                    {pendingMembers.length} Student Join Request{pendingMembers.length > 1 ? "s" : ""}
                  </h4>
                  <p className="text-xs text-ink/70 mt-0.5">
                    Students are waiting to become official society members.
                  </p>
                </div>
                <Link href="/president/members">
                  <Button size="sm" variant="marigold">
                    Review Requests <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}

            {rejectedEvents.map((e) => (
              <div
                key={e.id}
                className="p-4 bg-rose/15 border-2 border-ink rounded-[14px] shadow-hard-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-ink">{e.title}</h4>
                    <Badge variant="rejected">Rejected by Admin</Badge>
                  </div>
                  <p className="text-xs text-ink/70 mt-1">
                    Remarks: &ldquo;{e.adminRemarks || "Revise details and submit again."}&rdquo;
                  </p>
                </div>
                <Link href={`/president/events/${e.id}/edit`}>
                  <Button size="sm" variant="rose">
                    Revise Proposal <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}

            {pendingMembers.length === 0 && rejectedEvents.length === 0 && (
              <div className="p-6 bg-surface border-2 border-dashed border-ink/40 rounded-[14px] text-center">
                <p className="text-sm font-semibold text-ink/75">
                  ✨ All caught up! No pending membership requests or rejected events requiring attention.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
