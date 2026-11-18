"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, Clock, MapPin, Calendar, CheckCircle, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtPKTShort } from "@/lib/time";

export default function StudentTasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/tasks/my"),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData.tasks || []);
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

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setActionLoading(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update task status");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message);
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

  const now = new Date();

  return (
    <AppShell role="STUDENT" user={user} title="My Assigned Tasks">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            My Volunteer Tasks
          </h2>
          <p className="text-sm text-ink/70">
            Action items assigned to you for events you have accepted to volunteer with.
          </p>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-6 h-6 text-ink" />}
            title="No Tasks Assigned"
            description="You do not have any active volunteer assignments right now."
          />
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const isOverdue = new Date(task.dueDate) < now && task.status !== "COMPLETED";

              return (
                <Card key={task.id} variant="surface" className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-paper rounded border border-ink/40">
                        {task.event.society?.name} • {task.event.title}
                      </span>
                      <Badge variant={task.priority === "HIGH" ? "high" : task.priority === "MEDIUM" ? "medium" : "low"}>
                        {task.priority} Priority
                      </Badge>
                      <Badge
                        variant={
                          task.status === "COMPLETED"
                            ? "approved"
                            : task.status === "IN_PROGRESS"
                            ? "upcoming"
                            : "draft"
                        }
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <span className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? "text-rose" : "text-ink/60"}`}>
                      <Clock className="w-3.5 h-3.5" /> Due: {fmtPKTShort(task.dueDate)} {isOverdue ? "(Overdue)" : ""}
                    </span>
                  </div>

                  <div>
                    <h3 className={`font-display font-bold text-lg text-ink ${task.status === "COMPLETED" ? "line-through opacity-75" : ""}`}>
                      {task.title}
                    </h3>
                    <p className="text-xs text-ink/75 mt-1 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="pt-3 border-t-2 border-mist flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-ink/60">Update My Status:</span>
                    <div className="flex gap-2">
                      {task.status !== "TODO" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs border-ink/20"
                          disabled={actionLoading === task.id}
                          onClick={() => handleStatusChange(task.id, "TODO")}
                        >
                          To Do
                        </Button>
                      )}
                      {task.status !== "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          disabled={actionLoading === task.id}
                          onClick={() => handleStatusChange(task.id, "IN_PROGRESS")}
                        >
                          In Progress
                        </Button>
                      )}
                      {task.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="text-xs"
                          disabled={actionLoading === task.id}
                          onClick={() => handleStatusChange(task.id, "COMPLETED")}
                        >
                          Mark Completed ✓
                        </Button>
                      )}
                    </div>
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

