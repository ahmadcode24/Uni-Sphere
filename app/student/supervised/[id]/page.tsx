"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLive } from "@/lib/use-live";

export default function StudentSupervisedDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subEvent, setSubEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { data: liveData, refresh } = useLive<{ subEvent: any }>(
    params.id ? `/api/student/sub-events/${params.id}` : null,
    3000
  );

  useEffect(() => {
    async function load() {
      try {
        const [uRes, sRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/student/sub-events/${params.id}`),
        ]);

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

        if (!sRes.ok) {
          const errData = await sRes.json();
          throw new Error(errData.error || "You do not have access to supervise this sub-event.");
        }
        const sData = await sRes.json();
        setSubEvent(sData.subEvent);
      } catch (err: any) {
        setError(err.message || "Failed to load sub-event");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  useEffect(() => {
    if (liveData?.subEvent) {
      setSubEvent(liveData.subEvent);
    }
  }, [liveData]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/student/sub-tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok && refresh) {
        refresh();
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (error || !subEvent) {
    return (
      <AppShell role="STUDENT" user={user} title="Access Restricted">
        <div className="p-8 text-center space-y-4 max-w-md mx-auto">
          <div className="p-4 bg-rose text-white text-sm font-bold rounded-[12px] border-2 border-ink shadow-hard-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error || "You are not designated as the supervisor of this sub-event."}</span>
          </div>
          <Link href="/student">
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Student Dashboard
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const tasks = subEvent.tasks || [];
  const todoTasks = tasks.filter((t: any) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t: any) => t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t: any) => t.status === "COMPLETED");

  return (
    <AppShell role="STUDENT" user={user} title={`Supervising: ${subEvent.title}`}>
      <div className="space-y-8 max-w-6xl mx-auto">
        <Link
          href="/student"
          className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
        </Link>

        {/* Hero Card */}
        <Card variant="featured" colorBlock="marigold" className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-ink text-paper font-bold text-xs rounded-full border border-ink shadow-hard-sm">
                  Part of {subEvent.megaEvent?.title}
                </span>
                <span className="text-xs font-extrabold text-emerald flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> You are the Designated Supervisor
                </span>
              </div>

              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
                {subEvent.title}
              </h1>

              <p className="text-sm md:text-base text-ink/85 max-w-2xl font-medium">
                {subEvent.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-ink/80 pt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-ink" /> {subEvent.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose" /> {subEvent.venue}
                </span>
              </div>
            </div>

            <div className="border-t-2 md:border-t-0 md:border-l-2 border-ink pt-4 md:pt-0 md:pl-6 flex-shrink-0 min-w-[200px]">
              <span className="text-xs font-extrabold uppercase text-ink/70 block">Preparation Status</span>
              <p className="font-display font-extrabold text-2xl text-ink mt-0.5">
                {subEvent.progressPercent}% Complete
              </p>
              <div className="w-full bg-paper h-2.5 rounded-full border border-ink overflow-hidden mt-1.5">
                <div
                  className="bg-emerald h-full transition-all"
                  style={{ width: `${subEvent.progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-ink/70 block mt-1">
                {subEvent.completedTasks} / {subEvent.totalTasks} Tasks Done
              </span>
            </div>
          </div>
        </Card>

        {/* Supervisor Instructions */}
        <div className="p-4 bg-surface border-2 border-ink rounded-[14px] shadow-hard-sm text-xs font-semibold text-ink/80 flex items-center justify-between gap-4">
          <span>
            📋 <strong>Supervisor Responsibilities:</strong> Track and update the progress of preparation checklist items below. Drag or click status buttons as tasks move forward.
          </span>
          <Badge variant="upcoming">Live Synced (3s)</Badge>
        </div>

        {/* 3 Columns Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: To Do */}
          <div className="bg-paper border-2 border-ink rounded-[14px] p-4 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-ink/20">
              <span className="font-display font-bold text-sm text-ink">To Do</span>
              <Badge variant="draft">{todoTasks.length}</Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {todoTasks.map((t: any) => (
                <Card key={t.id} variant="surface" className="p-3 space-y-2">
                  <h5 className="font-bold text-sm text-ink leading-tight">{t.title}</h5>
                  {t.description && <p className="text-xs text-ink/70">{t.description}</p>}

                  <div className="flex items-center justify-between text-[11px] font-semibold text-ink/70 pt-1">
                    <span>👤 {t.assignee?.name || "Unassigned"}</span>
                    <span className="text-[10px] uppercase font-bold text-marigold">{t.priority}</span>
                  </div>

                  <div className="pt-2 border-t border-mist flex justify-end">
                    <button
                      onClick={() => handleStatusChange(t.id, "IN_PROGRESS")}
                      className="px-2.5 py-1 bg-paper hover:bg-mist text-xs font-bold border border-ink rounded transition-colors"
                    >
                      Start →
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="bg-paper border-2 border-ink rounded-[14px] p-4 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-ink/20">
              <span className="font-display font-bold text-sm text-ink">In Progress</span>
              <Badge variant="pending">{inProgressTasks.length}</Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {inProgressTasks.map((t: any) => (
                <Card key={t.id} variant="surface" className="p-3 space-y-2 border-l-4 border-l-marigold">
                  <h5 className="font-bold text-sm text-ink leading-tight">{t.title}</h5>
                  {t.description && <p className="text-xs text-ink/70">{t.description}</p>}

                  <div className="flex items-center justify-between text-[11px] font-semibold text-ink/70 pt-1">
                    <span>👤 {t.assignee?.name || "Unassigned"}</span>
                    <span className="text-[10px] uppercase font-bold text-marigold">{t.priority}</span>
                  </div>

                  <div className="pt-2 border-t border-mist flex justify-between">
                    <button
                      onClick={() => handleStatusChange(t.id, "TODO")}
                      className="px-2 py-0.5 bg-paper hover:bg-mist text-[11px] font-bold border border-ink rounded"
                    >
                      ← To Do
                    </button>
                    <button
                      onClick={() => handleStatusChange(t.id, "COMPLETED")}
                      className="px-2 py-0.5 bg-emerald text-white hover:bg-emerald/90 text-[11px] font-bold rounded"
                    >
                      Complete ✔
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="bg-paper border-2 border-ink rounded-[14px] p-4 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-ink/20">
              <span className="font-display font-bold text-sm text-ink">Completed</span>
              <Badge variant="approved">{completedTasks.length}</Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {completedTasks.map((t: any) => (
                <Card key={t.id} variant="surface" className="p-3 space-y-2 border-l-4 border-l-emerald bg-emerald/5">
                  <h5 className="font-bold text-sm text-ink leading-tight line-through opacity-80">{t.title}</h5>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-ink/70 pt-1">
                    <span>👤 {t.assignee?.name || "Unassigned"}</span>
                    <span className="text-emerald font-bold">Done ✔</span>
                  </div>

                  <div className="pt-2 border-t border-mist flex justify-start">
                    <button
                      onClick={() => handleStatusChange(t.id, "IN_PROGRESS")}
                      className="px-2 py-0.5 bg-paper hover:bg-mist text-[11px] font-bold border border-ink rounded"
                    >
                      ← Reopen
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
