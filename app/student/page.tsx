"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Compass,
  CheckSquare,
  Users,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKTShort } from "@/lib/time";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [supervisedSubEvents, setSupervisedSubEvents] = useState<any[]>([]);
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

        // Fetch student registrations, invitations, tasks, and supervised sub-events
        const [regRes, invRes, taskRes, supRes] = await Promise.all([
          fetch("/api/events/my-registrations"),
          fetch("/api/invitations/my"),
          fetch("/api/tasks/my"),
          fetch("/api/student/supervised"),
        ]);

        if (regRes.ok) {
          const rData = await regRes.json();
          setRegistrations(rData.registrations || []);
        }
        if (invRes.ok) {
          const iData = await invRes.json();
          setInvitations(iData.invitations || []);
        }
        if (taskRes.ok) {
          const tData = await taskRes.json();
          setTasks(tData.tasks || []);
        }
        if (supRes.ok) {
          const sData = await supRes.json();
          setSupervisedSubEvents(sData.subEvents || []);
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
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const nextRegistration = registrations.find((r) => r.status === "REGISTERED");
  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");
  const openTasks = tasks.filter((t) => t.status !== "COMPLETED");

  return (
    <AppShell role="STUDENT" user={user} title="Student Noticeboard">
      <div className="space-y-8">
        {/* Welcome Hero Banner */}
        <Card variant="featured" colorBlock="marigold" className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-ink text-paper font-bold text-xs rounded-full border border-ink shadow-hard-sm mb-3">
                Student Campus Portal
              </span>
              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
                Welcome back, {user?.name.split(" ")[0]}!
              </h1>
              <p className="text-ink/80 text-sm md:text-base max-w-2xl mt-1.5 font-medium">
                Here is your live itinerary across university societies, registered event seats, and volunteer duties.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/student/events">
                <Button variant="primary" size="md">
                  <Calendar className="w-4 h-4 mr-1" /> Browse Events
                </Button>
              </Link>
              <Link href="/student/societies">
                <Button variant="secondary" size="md">
                  <Compass className="w-4 h-4 mr-1" /> Discover Societies
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* 3 Main Grid Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Panel 1: Your Next Event */}
          <Card variant="surface" className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-mist">
                <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky" /> Your Next Event
                </h3>
              </div>

              {nextRegistration ? (
                <div className="space-y-2.5">
                  <Badge variant="approved">Seat Confirmed</Badge>
                  <h4 className="font-display font-bold text-xl text-ink leading-tight">
                    {nextRegistration.event.title}
                  </h4>
                  <p className="text-xs text-ink/70 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-marigold" />
                    {fmtPKTShort(nextRegistration.event.startAt)}
                  </p>
                  <p className="text-xs text-ink/70 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose" />
                    {nextRegistration.event.venue}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-ink/60">
                  You are not registered for any upcoming events yet.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t-2 border-mist">
              <Link
                href="/student/registrations"
                className="text-xs font-bold text-sky hover:underline flex items-center justify-between"
              >
                <span>View all my registrations ({registrations.length})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          {/* Panel 2: Volunteer Invitations */}
          <Card variant="surface" className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-mist">
                <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald" /> Volunteer Invites
                </h3>
                {pendingInvitations.length > 0 && (
                  <Badge variant="high">{pendingInvitations.length} New</Badge>
                )}
              </div>

              {pendingInvitations.length > 0 ? (
                <div className="space-y-3">
                  {pendingInvitations.slice(0, 2).map((inv) => (
                    <div key={inv.id} className="p-3 bg-paper border border-ink/40 rounded-[10px]">
                      <h4 className="font-bold text-sm text-ink">{inv.event.title}</h4>
                      <p className="text-xs text-ink/70 mt-1">
                        Invited by {inv.event.society.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-ink/60">
                  No pending volunteer invitations right now.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t-2 border-mist">
              <Link
                href="/student/invitations"
                className="text-xs font-bold text-emerald hover:underline flex items-center justify-between"
              >
                <span>Manage volunteer invites</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          {/* Panel 3: My Tasks */}
          <Card variant="surface" className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-mist">
                <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-marigold" /> My Tasks
                </h3>
                <span className="text-xs font-bold text-ink/60">
                  {openTasks.length} Incomplete
                </span>
              </div>

              {openTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {openTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 bg-paper border border-ink/30 rounded-[8px] flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <p className="text-xs font-bold text-ink truncate">{task.title}</p>
                        <p className="text-[11px] text-ink/60">
                          Due: {fmtPKTShort(task.dueDate)}
                        </p>
                      </div>
                      <Badge variant={task.priority === "HIGH" ? "high" : "medium"}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-ink/60">
                  No active tasks assigned to you.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t-2 border-mist">
              <Link
                href="/student/tasks"
                className="text-xs font-bold text-marigold hover:underline flex items-center justify-between"
              >
                <span>Open task board</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>

        {/* SECTION: My Supervised Sub-events (Task 2) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-mist">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-marigold" />
              <h3 className="font-display font-bold text-xl text-ink">
                My Supervised Sub-events ({supervisedSubEvents.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-ink/60">
              Assigned by Society Presidents
            </span>
          </div>

          {supervisedSubEvents.length === 0 ? (
            <Card variant="surface" className="p-6 text-center text-xs text-ink/60 border border-dashed border-ink/20">
              You are not supervising any sub-events right now.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supervisedSubEvents.map((sub) => (
                <Card key={sub.id} variant="surface" className="p-5 flex flex-col justify-between hover:shadow-hard-md transition-shadow">
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-ink/60 block">
                      Part of {sub.megaEvent?.title}
                    </span>
                    <h4 className="font-display font-extrabold text-xl text-ink leading-tight">
                      {sub.title}
                    </h4>
                    <p className="text-xs text-ink/75 line-clamp-2">{sub.description}</p>
                    <div className="flex items-center gap-3 text-xs font-semibold text-ink/70 pt-1">
                      <span>📅 {sub.date}</span>
                      <span>•</span>
                      <span>📍 {sub.venue}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t-2 border-mist">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>Preparation Checklist</span>
                      <span>{sub.completedTasks}/{sub.totalTasks} ({sub.progressPercent}%)</span>
                    </div>
                    <div className="w-full bg-paper h-2 rounded-full border border-ink overflow-hidden mb-3">
                      <div
                        className="bg-emerald h-full transition-all"
                        style={{ width: `${sub.progressPercent}%` }}
                      />
                    </div>

                    <Link href={`/student/supervised/${sub.id}`}>
                      <Button variant="primary" size="sm" className="w-full">
                        Manage Sub-event Checklist <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
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

