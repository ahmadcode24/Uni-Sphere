"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Calendar,
  MapPin,
  CheckCircle2,
  ListTodo,
  ArrowRight,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLive } from "@/lib/use-live";

export default function StudentSupervisedIndexPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { data: liveData, refresh } = useLive<{ subEvents: any[] }>(
    "/api/student/supervised",
    3000
  );

  useEffect(() => {
    async function init() {
      try {
        const uRes = await fetch("/api/auth/me");
        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        if (uData.user?.role !== "STUDENT") {
          router.push("/login");
          return;
        }
        setUser(uData.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const subEvents = liveData?.subEvents || [];

  const filteredSubs = subEvents.filter((s: any) => {
    const q = search.toLowerCase();
    const titleMatch = s.title?.toLowerCase().includes(q);
    const megaMatch = s.megaEvent?.title?.toLowerCase().includes(q);
    const venueMatch = s.venue?.toLowerCase().includes(q);
    return titleMatch || megaMatch || venueMatch;
  });

  const totalSubs = subEvents.length;
  const totalTasks = subEvents.reduce((acc, s) => acc + (s.totalTasks || 0), 0);
  const completedTasks = subEvents.reduce((acc, s) => acc + (s.completedTasks || 0), 0);
  const overallProgress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AppShell role="STUDENT" user={user} title="Supervised Sub-events">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-mist">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-marigold/20 text-marigold rounded-[10px] border border-ink/20">
                <Sparkles className="w-6 h-6" />
              </span>
              <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
                Supervised Sub-events
              </h1>
            </div>
            <p className="text-sm text-ink/70 mt-1">
              Festival tracks and activities you are designated to supervise. Track preparation checklists and execution readiness.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald/10 text-emerald text-xs font-bold rounded-full border border-emerald/30">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              Live Sync (3s)
            </span>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="surface" className="p-5">
            <div className="flex items-center justify-between text-ink/70 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Supervised Tracks</span>
              <Sparkles className="w-5 h-5 text-marigold" />
            </div>
            <span className="font-display font-extrabold text-3xl text-ink">
              {totalSubs}
            </span>
            <p className="text-xs text-ink/60 mt-1">Designated by Society Presidents</p>
          </Card>

          <Card variant="surface" className="p-5">
            <div className="flex items-center justify-between text-ink/70 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Preparation Progress</span>
              <TrendingUp className="w-5 h-5 text-emerald" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-extrabold text-3xl text-emerald">
                {overallProgress}%
              </span>
              <span className="text-xs font-bold text-ink/60">overall</span>
            </div>
            <div className="w-full bg-mist rounded-full h-2 mt-2 overflow-hidden border border-ink/20">
              <div
                className="bg-emerald h-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </Card>

          <Card variant="surface" className="p-5">
            <div className="flex items-center justify-between text-ink/70 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Checklist Tasks</span>
              <ListTodo className="w-5 h-5 text-sky" />
            </div>
            <span className="font-display font-extrabold text-3xl text-ink">
              {completedTasks} <span className="text-base font-semibold text-ink/50">/ {totalTasks}</span>
            </span>
            <p className="text-xs text-ink/60 mt-1">Completed readiness tasks</p>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        {totalSubs > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by sub-event name, mega event, or venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-paper border-2 border-ink rounded-[10px] text-sm font-semibold placeholder:text-ink/40 focus:outline-none focus:border-marigold transition-colors"
              />
            </div>
          </div>
        )}

        {/* Sub-events List */}
        {totalSubs === 0 ? (
          <Card variant="surface" className="p-8 md:p-12 text-center space-y-5 border-2 border-dashed border-ink/20">
            <div className="w-16 h-16 mx-auto rounded-full bg-marigold/20 border-2 border-ink flex items-center justify-center text-marigold shadow-hard-sm">
              <ShieldCheck className="w-8 h-8 text-ink" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-display font-bold text-xl text-ink">
                No Supervised Sub-events Yet
              </h3>
              <p className="text-sm text-ink/70 leading-relaxed">
                You are currently signed in with your student email. When a Society President selects you to supervise a track in a Mega Event (e.g., Coding Competition, Web3 Hackathon), it will appear here immediately!
              </p>
            </div>

            <div className="p-4 bg-paper max-w-lg mx-auto rounded-[12px] border-2 border-ink text-left text-xs space-y-2">
              <p className="font-bold text-ink">💡 How Track Supervision Works:</p>
              <ul className="list-disc pl-4 space-y-1 text-ink/75 font-medium">
                <li>Presidents pick students as supervisors for festival sub-events.</li>
                <li>Supervisors oversee the preparation checklist (To Do → In Progress → Completed).</li>
                <li>Supervisors coordinate volunteers and track readiness on the day of the event.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <Link href="/student">
                <Button variant="secondary" size="md">
                  Back to Dashboard
                </Button>
              </Link>
              <Link href="/student/events">
                <Button variant="primary" size="md">
                  Browse Campus Events
                </Button>
              </Link>
            </div>
          </Card>
        ) : filteredSubs.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink/60 bg-paper/50 rounded-[12px] border border-dashed border-ink/20">
            No supervised sub-events match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSubs.map((sub: any) => {
              const pct = sub.progressPercent || 0;
              return (
                <Card
                  key={sub.id}
                  variant="surface"
                  className="p-6 flex flex-col justify-between hover:shadow-hard-md transition-all border-2 border-ink"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 bg-ink text-paper text-[11px] font-bold rounded-full">
                        Part of {sub.megaEvent?.title || "Mega Event"}
                      </span>
                      <span className="text-xs font-bold text-emerald flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Supervisor
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-extrabold text-xl text-ink leading-tight">
                        {sub.title}
                      </h3>
                      {sub.description && (
                        <p className="text-xs text-ink/75 mt-1 line-clamp-2">
                          {sub.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-ink/70 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-ink" /> {sub.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-ink" /> {sub.venue}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-ink/70">Checklist Readiness</span>
                        <span className="font-extrabold text-emerald">
                          {sub.completedTasks} / {sub.totalTasks} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-mist rounded-full h-2.5 overflow-hidden border border-ink/20">
                        <div
                          className="bg-emerald h-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t-2 border-mist flex items-center justify-between">
                    <span className="text-xs font-bold text-ink/60">
                      {sub.totalTasks - sub.completedTasks} tasks remaining
                    </span>

                    <Link href={`/student/supervised/${sub.id}`}>
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-marigold hover:bg-marigold/90 text-ink shadow-hard-sm"
                      >
                        Open Checklist & Tasks <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

