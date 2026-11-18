"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  PlusCircle,
  ArrowLeft,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Trash2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKTShort } from "@/lib/time";

export default function EventTasksPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    dueDate: "",
    assigneeId: "",
  });

  const loadData = async () => {
    try {
      const [uRes, eRes, tRes, vRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/events/${params.id}`),
        fetch(`/api/events/${params.id}/tasks`),
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

      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData.tasks || []);
      }

      if (vRes.ok) {
        const vData = await vRes.json();
        // Only ACCEPTED volunteers can be assigned tasks
        const accepted = (vData.invitations || []).filter((i: any) => i.status === "ACCEPTED");
        setVolunteers(accepted);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load task board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${params.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      setModalOpen(false);
      setForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        dueDate: "",
        assigneeId: "",
      });
      setMessage("Task created successfully!");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Task creation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to move task");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  const now = new Date();

  return (
    <AppShell role="PRESIDENT" user={user} title={`Task Board — ${event?.title}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={`/president/events/${params.id}`}
            className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Event Management
          </Link>

          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-1" /> Add New Task
          </Button>
        </div>

        {message && (
          <div className="p-3.5 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm">
            {message}
          </div>
        )}

        {/* Progress Bar Card */}
        <Card variant="surface" className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-base text-ink flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald" /> Sprint Progress
            </span>
            <span className="font-display font-extrabold text-lg text-ink">
              {progressPercent}% Completed ({completed}/{total})
            </span>
          </div>

          <div className="w-full bg-mist h-4 rounded-full border-2 border-ink overflow-hidden">
            <div
              className="bg-emerald h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>

        {/* Kanban 3-Column Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* Column 1: To Do (Mist Header) */}
          <div className="space-y-3">
            <div className="p-3 bg-mist border-2 border-ink rounded-[12px] shadow-hard-sm flex items-center justify-between">
              <h3 className="font-display font-extrabold text-base text-ink">To Do</h3>
              <span className="px-2 py-0.5 bg-surface text-ink text-xs font-bold rounded-full border border-ink">
                {todoTasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[250px]">
              {todoTasks.map((t) => {
                const isOverdue = new Date(t.dueDate) < now;
                return (
                  <Card key={t.id} variant="surface" className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={t.priority === "HIGH" ? "high" : t.priority === "MEDIUM" ? "medium" : "low"}>
                        {t.priority}
                      </Badge>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-ink/40 hover:text-rose p-1 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-display font-bold text-base text-ink">{t.title}</h4>
                    <p className="text-xs text-ink/75 leading-relaxed">{t.description}</p>

                    <div className="pt-2 border-t border-mist/70 flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1 font-semibold ${isOverdue ? "text-rose font-bold" : "text-ink/60"}`}>
                        <Clock className="w-3.5 h-3.5" /> {fmtPKTShort(t.dueDate)} {isOverdue ? "(Overdue)" : ""}
                      </span>

                      <span className="flex items-center gap-1 text-ink font-semibold">
                        <User className="w-3.5 h-3.5 text-sky" /> {t.assignee?.name || "Unassigned"}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button size="sm" variant="secondary" className="text-xs py-1 px-2.5" onClick={() => handleMoveStatus(t.id, "IN_PROGRESS")}>
                        Start →
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Column 2: In Progress (Sky Header) */}
          <div className="space-y-3">
            <div className="p-3 bg-sky border-2 border-ink rounded-[12px] shadow-hard-sm flex items-center justify-between text-ink">
              <h3 className="font-display font-extrabold text-base text-ink">In Progress</h3>
              <span className="px-2 py-0.5 bg-surface text-ink text-xs font-bold rounded-full border border-ink">
                {inProgressTasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[250px]">
              {inProgressTasks.map((t) => {
                const isOverdue = new Date(t.dueDate) < now;
                return (
                  <Card key={t.id} variant="surface" className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={t.priority === "HIGH" ? "high" : t.priority === "MEDIUM" ? "medium" : "low"}>
                        {t.priority}
                      </Badge>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-ink/40 hover:text-rose p-1 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-display font-bold text-base text-ink">{t.title}</h4>
                    <p className="text-xs text-ink/75 leading-relaxed">{t.description}</p>

                    <div className="pt-2 border-t border-mist/70 flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1 font-semibold ${isOverdue ? "text-rose font-bold" : "text-ink/60"}`}>
                        <Clock className="w-3.5 h-3.5" /> {fmtPKTShort(t.dueDate)} {isOverdue ? "(Overdue)" : ""}
                      </span>

                      <span className="flex items-center gap-1 text-ink font-semibold">
                        <User className="w-3.5 h-3.5 text-sky" /> {t.assignee?.name || "Unassigned"}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-between gap-2">
                      <Button size="sm" variant="ghost" className="text-xs py-1 px-2 border-ink/20" onClick={() => handleMoveStatus(t.id, "TODO")}>
                        ← To Do
                      </Button>
                      <Button size="sm" variant="primary" className="text-xs py-1 px-2.5" onClick={() => handleMoveStatus(t.id, "COMPLETED")}>
                        Complete ✓
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Column 3: Completed (Emerald Header) */}
          <div className="space-y-3">
            <div className="p-3 bg-emerald border-2 border-ink rounded-[12px] shadow-hard-sm flex items-center justify-between text-white">
              <h3 className="font-display font-extrabold text-base text-white">Completed</h3>
              <span className="px-2 py-0.5 bg-surface text-ink text-xs font-bold rounded-full border border-ink">
                {completedTasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[250px]">
              {completedTasks.map((t) => (
                <Card key={t.id} variant="surface" className="p-4 space-y-3 opacity-90">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="approved">Done</Badge>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="text-ink/40 hover:text-rose p-1 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="font-display font-bold text-base text-ink line-through">{t.title}</h4>
                  <p className="text-xs text-ink/60 leading-relaxed">{t.description}</p>

                  <div className="pt-2 border-t border-mist/70 flex items-center justify-between text-xs">
                    <span className="text-ink/60">Done</span>
                    <span className="flex items-center gap-1 text-ink font-semibold">
                      <User className="w-3.5 h-3.5 text-sky" /> {t.assignee?.name || "Unassigned"}
                    </span>
                  </div>

                  <div className="pt-2 flex justify-start">
                    <Button size="sm" variant="ghost" className="text-xs py-1 px-2 border-ink/20" onClick={() => handleMoveStatus(t.id, "IN_PROGRESS")}>
                      ← Reopen
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Event Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Set up registration check-in tablets"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <Textarea
            label="Description & Instructions"
            placeholder="Specify what needs to be accomplished and any resource links..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            rows={3}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
            >
              <option value="LOW">Low (Mist)</option>
              <option value="MEDIUM">Medium (Marigold)</option>
              <option value="HIGH">High (Rose)</option>
            </Select>

            <Input
              label="Due Date & Time (PKT)"
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </div>

          <Select
            label="Assignee (Accepted Volunteers Only)"
            value={form.assigneeId}
            onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          >
            <option value="">-- Leave Unassigned for now --</option>
            {volunteers.map((v) => (
              <option key={v.student.id} value={v.student.id}>
                {v.student.name} ({v.student.email})
              </option>
            ))}
          </Select>

          <div className="pt-4 border-t-2 border-mist flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Create Task"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

