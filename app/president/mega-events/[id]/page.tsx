"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Calendar,
  DollarSign,
  ArrowLeft,
  Users,
  Clock,
  MapPin,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  ListTodo,
  CheckSquare,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLive } from "@/lib/use-live";

export default function PresidentMegaEventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mega, setMega] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "subevents" | "checklist" | "budget">("overview");
  const [loading, setLoading] = useState(true);

  // Sub-event modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSubEvent, setEditingSubEvent] = useState<any>(null);
  const [subForm, setSubForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "10:00",
    endTime: "13:00",
    venue: "",
    supervisorId: "",
  });
  const [subFormError, setSubFormError] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  // Task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedSubEventForTask, setSelectedSubEventForTask] = useState<string>("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assigneeId: "",
  });
  const [taskFormError, setTaskFormError] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);

  // Allocation & Expense states (Phase E)
  const [allocAmounts, setAllocAmounts] = useState<Record<string, number>>({});
  const [allocError, setAllocError] = useState("");
  const [allocLoading, setAllocLoading] = useState<string | null>(null);

  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expSubEvent, setExpSubEvent] = useState<any>(null);
  const [expForm, setExpForm] = useState({
    title: "",
    amount: 1000,
    note: "",
    spentOn: new Date().toISOString().split("T")[0],
  });
  const [expError, setExpError] = useState("");
  const [expSaving, setExpSaving] = useState(false);

  // Filter in checklist
  const [checklistFilter, setChecklistFilter] = useState<string>("ALL");

  const { data: liveMega, refresh } = useLive<{ megaEvent: any }>(
    params.id ? `/api/president/mega-events/${params.id}` : null,
    3000
  );

  useEffect(() => {
    async function load() {
      try {
        const [uRes, mRes, studRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/president/mega-events/${params.id}`),
          fetch("/api/societies/members-list").catch(() => null), // fallback
        ]);

        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        if (uData.user?.role !== "PRESIDENT") {
          router.push("/login");
          return;
        }
        setUser(uData.user);

        if (!mRes.ok) {
          throw new Error("Mega Event not found");
        }
        const mData = await mRes.json();
        setMega(mData.megaEvent);

        // Fetch students for supervisor and assignee assignment
        const studentsFetch = await fetch("/api/admin/events"); // just to see students or fetch users
        // Let's create an endpoint or fetch students from a dedicated API
        const sRes = await fetch("/api/student/list").catch(() => null);
        if (sRes && sRes.ok) {
          const sData = await sRes.json();
          setStudents(sData.students || []);
        }
      } catch (err: any) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  useEffect(() => {
    if (liveMega?.megaEvent) {
      setMega(liveMega.megaEvent);
    }
  }, [liveMega]);

  // Fetch all registered students for supervisor & task assignment
  useEffect(() => {
    fetch("/api/users/students")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.students) setStudents(data.students);
      })
      .catch(() => {});
  }, []);

  const openCreateSubEventModal = () => {
    setEditingSubEvent(null);
    setSubForm({
      title: "",
      description: "",
      date: mega?.startDate || "",
      startTime: "10:00",
      endTime: "13:00",
      venue: "",
      supervisorId: students[0]?.id || "",
    });
    setSubFormError("");
    setSubModalOpen(true);
  };

  const openEditSubEventModal = (sub: any) => {
    setEditingSubEvent(sub);
    setSubForm({
      title: sub.title,
      description: sub.description,
      date: sub.date,
      startTime: "10:00",
      endTime: "13:00",
      venue: sub.venue,
      supervisorId: sub.supervisorId,
    });
    setSubFormError("");
    setSubModalOpen(true);
  };

  const handleSubEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubFormError("");
    setSubSaving(true);

    if (subForm.date < mega.startDate || subForm.date > mega.endDate) {
      setSubFormError(`Sub-event date must be between ${mega.startDate} and ${mega.endDate}.`);
      setSubSaving(false);
      return;
    }

    if (subForm.startTime >= subForm.endTime) {
      setSubFormError("Start time must be before end time.");
      setSubSaving(false);
      return;
    }

    try {
      if (editingSubEvent) {
        const res = await fetch(`/api/president/sub-events/${editingSubEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update sub-event");
      } else {
        const res = await fetch(`/api/president/mega-events/${params.id}/sub-events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create sub-event");
      }

      setSubModalOpen(false);
      if (refresh) refresh();
    } catch (err: any) {
      setSubFormError(err.message || "Failed to save sub-event");
    } finally {
      setSubSaving(false);
    }
  };

  const openAddTaskModal = (subEventId?: string) => {
    const targetSubId = subEventId || (mega?.subEvents?.[0]?.id ?? "");
    setSelectedSubEventForTask(targetSubId);
    const sub = mega?.subEvents?.find((s: any) => s.id === targetSubId);
    setTaskForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      dueDate: sub?.date || mega?.startDate || "",
      assigneeId: "",
    });
    setTaskFormError("");
    setTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError("");
    setTaskSaving(true);

    try {
      const res = await fetch(`/api/president/sub-events/${selectedSubEventForTask}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      setTaskModalOpen(false);
      if (refresh) refresh();
    } catch (err: any) {
      setTaskFormError(err.message || "Failed to create task");
    } finally {
      setTaskSaving(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/president/sub-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (refresh) refresh();
    } catch {
      // ignore
    }
  };

  const handleAllocate = async (subId: string) => {
    setAllocError("");
    setAllocLoading(subId);
    const amount = Number(allocAmounts[subId] || 0);

    try {
      const res = await fetch(`/api/president/sub-events/${subId}/allocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to allocate budget");
      if (refresh) refresh();
    } catch (err: any) {
      setAllocError(err.message || "Failed to allocate budget");
    } finally {
      setAllocLoading(null);
    }
  };

  const openAddExpenseModal = (sub: any) => {
    setExpSubEvent(sub);
    setExpForm({
      title: "",
      amount: 1000,
      note: "",
      spentOn: sub.date || new Date().toISOString().split("T")[0],
    });
    setExpError("");
    setExpModalOpen(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expSubEvent) return;
    setExpError("");
    setExpSaving(true);

    try {
      const res = await fetch(`/api/president/sub-events/${expSubEvent.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expForm.title,
          amount: Number(expForm.amount),
          note: expForm.note,
          spentOn: expForm.spentOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add expense");

      setExpModalOpen(false);
      if (refresh) refresh();
    } catch (err: any) {
      setExpError(err.message || "Failed to add expense");
    } finally {
      setExpSaving(false);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this checklist task?")) return;
    try {
      await fetch(`/api/president/sub-tasks/${taskId}`, { method: "DELETE" });
      if (refresh) refresh();
    } catch {
      // ignore
    }
  };

  const handleAllocate = async (subId: string) => {
    setAllocError("");
    setAllocLoading(subId);
    const amount = Number(allocAmounts[subId] || 0);

    try {
      const res = await fetch(`/api/president/sub-events/${subId}/allocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to allocate budget");
      if (refresh) refresh();
    } catch (err: any) {
      setAllocError(err.message || "Failed to allocate budget");
    } finally {
      setAllocLoading(null);
    }
  };

  const openAddExpenseModal = (sub: any) => {
    setExpSubEvent(sub);
    setExpForm({
      title: "",
      amount: 1000,
      note: "",
      spentOn: sub.date || new Date().toISOString().split("T")[0],
    });
    setExpError("");
    setExpModalOpen(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expSubEvent) return;
    setExpError("");
    setExpSaving(true);

    try {
      const res = await fetch(`/api/president/sub-events/${expSubEvent.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expForm.title,
          amount: Number(expForm.amount),
          note: expForm.note,
          spentOn: expForm.spentOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add expense");

      setExpModalOpen(false);
      if (refresh) refresh();
    } catch (err: any) {
      setExpError(err.message || "Failed to add expense");
    } finally {
      setExpSaving(false);
    }
  };

  if (loading || !mega) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  // All tasks across sub-events
  const allSubEvents = mega.subEvents || [];
  const filteredSubEvents = checklistFilter === "ALL"
    ? allSubEvents
    : allSubEvents.filter((s: any) => s.id === checklistFilter);

  const allTasks = filteredSubEvents.flatMap((s: any) =>
    (s.tasks || []).map((t: any) => ({ ...t, subEventTitle: s.title, subEventId: s.id }))
  );

  const todoTasks = allTasks.filter((t: any) => t.status === "TODO");
  const inProgressTasks = allTasks.filter((t: any) => t.status === "IN_PROGRESS");
  const completedTasks = allTasks.filter((t: any) => t.status === "COMPLETED");

  return (
    <AppShell role="PRESIDENT" user={user} title={mega.title}>
      <div className="space-y-8 max-w-6xl mx-auto">
        <Link
          href="/president/mega-events"
          className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to assigned Mega Events
        </Link>

        {/* Hero Card */}
        <Card variant="featured" colorBlock="marigold" className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-ink text-paper font-bold text-xs rounded-full border border-ink shadow-hard-sm">
                {mega.society?.name}
              </span>
              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
                {mega.title}
              </h1>
              <p className="text-sm md:text-base text-ink/85 max-w-2xl font-medium">
                {mega.description}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 border-t-2 md:border-t-0 md:border-l-2 border-ink pt-4 md:pt-0 md:pl-6 flex-shrink-0">
              <span className="text-xs font-extrabold uppercase text-ink/70">Festival Dates</span>
              <p className="font-display font-extrabold text-lg text-ink flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-ink" /> {mega.startDate} to {mega.endDate}
              </p>
              <span className="text-xs font-bold text-emerald mt-1">
                Budget Cap: Rs {mega.overallBudget?.toLocaleString()} PKR
              </span>
            </div>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-mist gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-display font-bold text-sm rounded-t-lg border-2 border-b-0 transition-colors ${
              activeTab === "overview"
                ? "bg-surface text-ink border-ink shadow-hard-sm"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("subevents")}
            className={`px-4 py-2 font-display font-bold text-sm rounded-t-lg border-2 border-b-0 transition-colors ${
              activeTab === "subevents"
                ? "bg-surface text-ink border-ink shadow-hard-sm"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            Sub-events ({allSubEvents.length})
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-4 py-2 font-display font-bold text-sm rounded-t-lg border-2 border-b-0 transition-colors ${
              activeTab === "checklist"
                ? "bg-surface text-ink border-ink shadow-hard-sm"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            Preparation Checklist ({allTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("budget")}
            className={`px-4 py-2 font-display font-bold text-sm rounded-t-lg border-2 border-b-0 transition-colors ${
              activeTab === "budget"
                ? "bg-surface text-ink border-ink shadow-hard-sm"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            Budget & Allocations
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="surface" className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Overall Budget</span>
                <p className="font-display font-extrabold text-2xl text-emerald mt-1">
                  Rs {mega.overallBudget?.toLocaleString()} PKR
                </p>
                <p className="text-[11px] text-ink/60 mt-1">Fixed festival limit</p>
              </Card>

              <Card variant="surface" className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Allocated to Sub-events</span>
                <p className="font-display font-extrabold text-2xl text-ink mt-1">
                  Rs {mega.totalAllocated?.toLocaleString()} PKR
                </p>
                <p className="text-[11px] text-ink/60 mt-1">Unallocated: Rs {mega.unallocated?.toLocaleString()} PKR</p>
              </Card>

              <Card variant="surface" className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Logged Expenses</span>
                <p className="font-display font-extrabold text-2xl text-rose mt-1">
                  Rs {mega.totalSpent?.toLocaleString()} PKR
                </p>
                <p className="text-[11px] text-ink/60 mt-1">Direct sub-event costs</p>
              </Card>

              <Card variant="surface" className="p-4">
                <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Overall Progress</span>
                <p className="font-display font-extrabold text-2xl text-ink mt-1">
                  {mega.progressPercent}%
                </p>
                <p className="text-[11px] text-ink/60 mt-1">
                  {mega.completedTasks} of {mega.totalTasks} tasks complete
                </p>
              </Card>
            </div>

            {/* Quick summary card */}
            <Card variant="surface" className="p-6">
              <h3 className="font-display font-bold text-lg text-ink mb-2">President Management Guide</h3>
              <p className="text-sm text-ink/75 leading-relaxed">
                As the Society President, you have full operational control over this Mega Event.
                Create sub-events (e.g. Gaming Competition, Coding Marathon, Project Exhibition) under the <strong>Sub-events</strong> tab, assign dedicated student supervisors, break down preparation into tasks under the <strong>Preparation Checklist</strong> tab, and allocate budgets under <strong>Budget & Allocations</strong>.
              </p>
            </Card>
          </div>
        )}

        {/* TAB 2: SUB-EVENTS */}
        {activeTab === "subevents" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-mist">
              <div>
                <h3 className="font-display font-bold text-xl text-ink">Festival Sub-events</h3>
                <p className="text-xs text-ink/60">
                  Plan individual activities within the festival date range.
                </p>
              </div>

              <Button variant="primary" size="md" onClick={openCreateSubEventModal}>
                <PlusCircle className="w-4 h-4 mr-1.5" /> Add Sub-event
              </Button>
            </div>

            {allSubEvents.length === 0 ? (
              <EmptyState
                title="No Sub-events Created Yet"
                description="Add sub-events (e.g., Gaming Competition, Web Development Workshop) and assign student supervisors."
                action={
                  <Button variant="primary" size="md" onClick={openCreateSubEventModal}>
                    <PlusCircle className="w-4 h-4 mr-1.5" /> Add First Sub-event
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSubEvents.map((sub: any) => (
                  <Card key={sub.id} variant="surface" className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-paper text-ink font-bold text-xs rounded border border-ink/40">
                          📅 {sub.date}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSubEventModal(sub)}
                          className="text-xs font-bold"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      </div>

                      <h4 className="font-display font-extrabold text-xl text-ink leading-tight">
                        {sub.title}
                      </h4>
                      <p className="text-xs text-ink/75 mt-1 line-clamp-2">{sub.description}</p>

                      <div className="mt-3 pt-3 border-t-2 border-mist space-y-1.5 text-xs text-ink/80 font-medium">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose" /> {sub.venue}
                        </p>
                        <p className="flex items-center gap-1.5 font-bold text-emerald">
                          👤 Supervisor: {sub.supervisor?.name || "Student"} ({sub.supervisor?.email})
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t-2 border-mist">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span>Preparation Tasks</span>
                        <span>{sub.completedTasks}/{sub.totalTasks} ({sub.progressPercent}%)</span>
                      </div>
                      <div className="w-full bg-paper h-2 rounded-full border border-ink overflow-hidden">
                        <div
                          className="bg-emerald h-full transition-all"
                          style={{ width: `${sub.progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-3 text-xs">
                        <span className="font-bold text-ink/70">
                          Budget: {sub.allocatedBudget !== null ? `Rs ${sub.allocatedBudget.toLocaleString()} PKR` : "Unallocated"}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setChecklistFilter(sub.id);
                            setActiveTab("checklist");
                          }}
                        >
                          Checklist ({sub.totalTasks}) →
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHECKLIST */}
        {activeTab === "checklist" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-mist gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-display font-bold text-xl text-ink">Preparation Checklist</h3>
                  <p className="text-xs text-ink/60">
                    Track preparation tasks across sub-events. Any student can be assigned.
                  </p>
                </div>

                {/* Sub-event Filter */}
                <select
                  value={checklistFilter}
                  onChange={(e) => setChecklistFilter(e.target.value)}
                  className="px-3 py-1.5 bg-paper text-ink border-2 border-ink rounded-[8px] text-xs font-bold"
                >
                  <option value="ALL">All Sub-events ({allSubEvents.length})</option>
                  {allSubEvents.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              {allSubEvents.length > 0 && (
                <Button variant="primary" size="md" onClick={() => openAddTaskModal(checklistFilter !== "ALL" ? checklistFilter : undefined)}>
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Add Task
                </Button>
              )}
            </div>

            {/* 3 Columns: To Do, In Progress, Completed */}
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
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase text-sky">
                          {t.subEventTitle}
                        </span>
                        <button
                          onClick={() => handleTaskDelete(t.id)}
                          className="text-ink/40 hover:text-rose p-0.5"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h5 className="font-bold text-sm text-ink leading-tight">{t.title}</h5>
                      {t.description && <p className="text-xs text-ink/70">{t.description}</p>}

                      <div className="flex items-center justify-between text-[11px] font-semibold text-ink/70 pt-1">
                        <span>👤 {t.assignee?.name || "Unassigned"}</span>
                        <span className="text-[10px] uppercase font-bold text-marigold">{t.priority}</span>
                      </div>

                      <div className="pt-2 border-t border-mist flex justify-end gap-1">
                        <button
                          onClick={() => handleTaskStatusChange(t.id, "IN_PROGRESS")}
                          className="px-2 py-0.5 bg-paper hover:bg-mist text-[10px] font-bold border border-ink rounded"
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
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase text-sky">
                          {t.subEventTitle}
                        </span>
                        <button
                          onClick={() => handleTaskDelete(t.id)}
                          className="text-ink/40 hover:text-rose p-0.5"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h5 className="font-bold text-sm text-ink leading-tight">{t.title}</h5>
                      {t.description && <p className="text-xs text-ink/70">{t.description}</p>}

                      <div className="flex items-center justify-between text-[11px] font-semibold text-ink/70 pt-1">
                        <span>👤 {t.assignee?.name || "Unassigned"}</span>
                        <span className="text-[10px] uppercase font-bold text-marigold">{t.priority}</span>
                      </div>

                      <div className="pt-2 border-t border-mist flex justify-between gap-1">
                        <button
                          onClick={() => handleTaskStatusChange(t.id, "TODO")}
                          className="px-2 py-0.5 bg-paper hover:bg-mist text-[10px] font-bold border border-ink rounded"
                        >
                          ← To Do
                        </button>
                        <button
                          onClick={() => handleTaskStatusChange(t.id, "COMPLETED")}
                          className="px-2 py-0.5 bg-emerald text-white hover:bg-emerald/90 text-[10px] font-bold rounded"
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
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase text-sky">
                          {t.subEventTitle}
                        </span>
                        <button
                          onClick={() => handleTaskDelete(t.id)}
                          className="text-ink/40 hover:text-rose p-0.5"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h5 className="font-bold text-sm text-ink leading-tight line-through opacity-80">{t.title}</h5>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-ink/70 pt-1">
                        <span>👤 {t.assignee?.name || "Unassigned"}</span>
                        <span className="text-emerald font-bold">Done ✔</span>
                      </div>

                      <div className="pt-2 border-t border-mist flex justify-start gap-1">
                        <button
                          onClick={() => handleTaskStatusChange(t.id, "IN_PROGRESS")}
                          className="px-2 py-0.5 bg-paper hover:bg-mist text-[10px] font-bold border border-ink rounded"
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
        )}

        {/* TAB 4: BUDGET & ALLOCATIONS */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            <div className="pb-3 border-b-2 border-mist">
              <h3 className="font-display font-bold text-xl text-ink">Festival Budget & Allocations</h3>
              <p className="text-xs text-ink/60">
                Allocate portion of the overall budget to each sub-event (set once) and track expenditures.
              </p>
            </div>

            {allocError && (
              <div className="p-3 bg-rose text-white text-xs font-bold rounded-[8px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{allocError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="surface" className="p-4">
                <span className="text-[11px] uppercase font-extrabold text-ink/60 block">Overall Budget</span>
                <p className="font-display font-extrabold text-2xl text-emerald mt-1">
                  Rs {mega.overallBudget?.toLocaleString()} PKR
                </p>
                <p className="text-[10px] text-ink/60 mt-0.5">Fixed festival limit</p>
              </Card>

              <Card variant="surface" className="p-4">
                <span className="text-[11px] uppercase font-extrabold text-ink/60 block">Total Allocated</span>
                <p className="font-display font-extrabold text-2xl text-ink mt-1">
                  Rs {mega.totalAllocated?.toLocaleString()} PKR
                </p>
                <p className="text-[10px] text-ink/60 mt-0.5">Across all sub-events</p>
              </Card>

              <Card variant="surface" className="p-4">
                <span className="text-[11px] uppercase font-extrabold text-ink/60 block">Unallocated Available</span>
                <p className="font-display font-extrabold text-2xl text-marigold mt-1">
                  Rs {mega.unallocated?.toLocaleString()} PKR
                </p>
                <p className="text-[10px] text-ink/60 mt-0.5">Available for remaining sub-events</p>
              </Card>

              <Card variant="surface" className="p-4">
                <span className="text-[11px] uppercase font-extrabold text-ink/60 block">Total Spent</span>
                <p className="font-display font-extrabold text-2xl text-rose mt-1">
                  Rs {mega.totalSpent?.toLocaleString()} PKR
                </p>
                <p className="text-[10px] text-ink/60 mt-0.5">Remaining: Rs {(mega.overallBudget - mega.totalSpent)?.toLocaleString()} PKR</p>
              </Card>
            </div>

            {/* Sub-events budget cards */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-lg text-ink">Sub-events Allocations & Expenditures</h4>
              {allSubEvents.map((sub: any) => {
                const isOver80 = sub.allocatedBudget > 0 && sub.spent * 5 >= sub.allocatedBudget * 4;

                return (
                  <Card key={sub.id} variant="surface" className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-mist">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-display font-extrabold text-lg text-ink">{sub.title}</h5>
                          {isOver80 && (
                            <span className="px-2 py-0.5 bg-rose text-white text-[10px] font-extrabold rounded-full border border-ink shadow-hard-sm">
                              ⚠️ 80% Budget Threshold Reached
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/60 mt-0.5">
                          {sub.date} • Venue: {sub.venue} • Supervisor: {sub.supervisor?.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-bold">
                        <div>
                          <span className="text-[10px] uppercase font-extrabold text-ink/60 block">Allocated</span>
                          <span className="text-sm font-extrabold text-emerald">
                            {sub.allocatedBudget !== null ? `Rs ${sub.allocatedBudget.toLocaleString()} PKR` : "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-extrabold text-ink/60 block">Spent</span>
                          <span className="text-sm font-extrabold text-rose">
                            Rs {sub.spent?.toLocaleString()} PKR
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-extrabold text-ink/60 block">Remaining</span>
                          <span className="text-sm font-extrabold text-ink">
                            {sub.allocatedBudget !== null ? `Rs ${sub.remaining?.toLocaleString()} PKR` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* If budget not yet allocated: show allocation input */}
                    {sub.allocatedBudget === null ? (
                      <div className="p-4 bg-paper rounded-[12px] border border-ink/30 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-ink/80">
                          <DollarSign className="w-4 h-4 text-emerald" />
                          <span>Set Sub-event Budget Allocation (One-Time Action)</span>
                        </div>
                        <p className="text-[11px] text-ink/60">
                          Maximum available unallocated budget: <strong>Rs {mega.unallocated?.toLocaleString()} PKR</strong>. Once allocated, this amount is locked and cannot be edited.
                        </p>
                        <div className="flex items-center gap-3 max-w-md">
                          <Input
                            type="number"
                            min={0}
                            step={1000}
                            placeholder="Amount in PKR"
                            value={allocAmounts[sub.id] || ""}
                            onChange={(e) => setAllocAmounts({ ...allocAmounts, [sub.id]: parseInt(e.target.value) || 0 })}
                          />
                          <Button
                            size="md"
                            variant="primary"
                            disabled={allocLoading === sub.id}
                            onClick={() => handleAllocate(sub.id)}
                            className="flex-shrink-0"
                          >
                            {allocLoading === sub.id ? "Setting..." : "Lock Allocation"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Add Expense Button & Table */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                            Logged Expenses ({sub.expenses?.length || 0})
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openAddExpenseModal(sub)}
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Expense
                          </Button>
                        </div>

                        {sub.expenses?.length === 0 ? (
                          <div className="p-4 text-center text-xs text-ink/60 bg-paper/40 rounded border border-dashed border-ink/20">
                            No expenses logged for this sub-event yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-ink/30 text-ink/60 font-extrabold uppercase">
                                  <th className="py-2 px-2">Expense Item</th>
                                  <th className="py-2 px-2">Date</th>
                                  <th className="py-2 px-2">Note</th>
                                  <th className="py-2 px-2 text-right">Amount (PKR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-mist">
                                {sub.expenses.map((exp: any) => (
                                  <tr key={exp.id} className="font-medium text-ink">
                                    <td className="py-2 px-2 font-bold">{exp.title}</td>
                                    <td className="py-2 px-2 text-ink/70">{new Date(exp.spentOn).toLocaleDateString()}</td>
                                    <td className="py-2 px-2 text-ink/60">{exp.note || "—"}</td>
                                    <td className="py-2 px-2 text-right font-extrabold text-emerald">
                                      Rs {exp.amount?.toLocaleString()} PKR
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Sub-event */}
        {subModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border-2 border-ink rounded-[16px] shadow-hard-xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b-2 border-mist mb-5">
                <h3 className="font-display font-extrabold text-xl text-ink">
                  {editingSubEvent ? "Edit Sub-event" : "Add Sub-event"}
                </h3>
                <button onClick={() => setSubModalOpen(false)} className="p-1 hover:bg-mist rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {subFormError && (
                <div className="mb-4 p-3 bg-rose text-white text-xs font-bold rounded-[8px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{subFormError}</span>
                </div>
              )}

              <form onSubmit={handleSubEventSubmit} className="space-y-4">
                <Input
                  label="Sub-event Title"
                  placeholder="e.g. Gaming Competition / Web Dev Workshop"
                  value={subForm.title}
                  onChange={(e) => setSubForm({ ...subForm, title: e.target.value })}
                  required
                />

                <Textarea
                  label="Description"
                  placeholder="Details and agenda for this activity..."
                  value={subForm.description}
                  onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
                  required
                  rows={2}
                />

                <Input
                  label="Date (Must be within festival dates)"
                  type="date"
                  min={mega.startDate}
                  max={mega.endDate}
                  value={subForm.date}
                  onChange={(e) => setSubForm({ ...subForm, date: e.target.value })}
                  required
                  helper={`Festival duration: ${mega.startDate} to ${mega.endDate}`}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Time (PKT)"
                    type="time"
                    value={subForm.startTime}
                    onChange={(e) => setSubForm({ ...subForm, startTime: e.target.value })}
                    required
                  />
                  <Input
                    label="End Time (PKT)"
                    type="time"
                    value={subForm.endTime}
                    onChange={(e) => setSubForm({ ...subForm, endTime: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Campus Venue"
                  placeholder="e.g. CS Lab 2, Main Hall"
                  value={subForm.venue}
                  onChange={(e) => setSubForm({ ...subForm, venue: e.target.value })}
                  required
                />

                {/* Supervisor Picker (Student only) */}
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                    Designated Supervisor (Student)
                  </label>
                  <select
                    value={subForm.supervisorId}
                    onChange={(e) => setSubForm({ ...subForm, supervisorId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-paper text-ink border-2 border-ink rounded-[10px] text-sm font-semibold focus:outline-none focus:border-emerald"
                    required
                  >
                    <option value="">Select a student supervisor...</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-ink/60 mt-1 block">
                    Supervisor will manage the preparation checklist for this sub-event.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-mist">
                  <Button type="button" variant="ghost" size="md" onClick={() => setSubModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md" disabled={subSaving}>
                    {subSaving ? "Saving..." : editingSubEvent ? "Save Changes" : "Create Sub-event"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Task */}
        {taskModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border-2 border-ink rounded-[16px] shadow-hard-xl p-6 md:p-8 max-w-lg w-full">
              <div className="flex items-center justify-between pb-3 border-b-2 border-mist mb-5">
                <h3 className="font-display font-extrabold text-xl text-ink">Add Preparation Task</h3>
                <button onClick={() => setTaskModalOpen(false)} className="p-1 hover:bg-mist rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {taskFormError && (
                <div className="mb-4 p-3 bg-rose text-white text-xs font-bold rounded-[8px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{taskFormError}</span>
                </div>
              )}

              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                    Sub-event
                  </label>
                  <select
                    value={selectedSubEventForTask}
                    onChange={(e) => setSelectedSubEventForTask(e.target.value)}
                    className="w-full px-3 py-2 bg-paper text-ink border-2 border-ink rounded-[10px] text-sm font-semibold"
                    required
                  >
                    {allSubEvents.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Task Title"
                  placeholder="e.g. Configure Gaming PCs / Print Certificates"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />

                <Textarea
                  label="Description (Optional)"
                  placeholder="Details for this preparation item..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={2}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                      Priority
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e: any) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-paper text-ink border-2 border-ink rounded-[10px] text-sm font-semibold"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <Input
                    label="Due Date"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    required
                  />
                </div>

                {/* Assignee (Any student, optional) */}
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                    Assignee (Optional)
                  </label>
                  <select
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-paper text-ink border-2 border-ink rounded-[10px] text-sm font-semibold"
                  >
                    <option value="">Leave Unassigned</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-ink/60 mt-1 block">
                    No society membership or invitation required.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-mist">
                  <Button type="button" variant="ghost" size="md" onClick={() => setTaskModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md" disabled={taskSaving}>
                    {taskSaving ? "Creating Task..." : "Add Task to Checklist"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Expense (Phase E) */}
        {expModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border-2 border-ink rounded-[16px] shadow-hard-xl p-6 md:p-8 max-w-md w-full">
              <div className="flex items-center justify-between pb-3 border-b-2 border-mist mb-5">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-ink">Add Expense</h3>
                  <p className="text-xs text-ink/60 mt-0.5">{expSubEvent?.title}</p>
                </div>
                <button onClick={() => setExpModalOpen(false)} className="p-1 hover:bg-mist rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {expError && (
                <div className="mb-4 p-3 bg-rose text-white text-xs font-bold rounded-[8px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{expError}</span>
                </div>
              )}

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <Input
                  label="Expense Title / Item"
                  placeholder="e.g. Cables & Adapters / Refreshments"
                  value={expForm.title}
                  onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                  required
                />

                <Input
                  label="Amount (PKR)"
                  type="number"
                  min={1}
                  step={100}
                  value={expForm.amount}
                  onChange={(e) => setExpForm({ ...expForm, amount: parseInt(e.target.value) || 0 })}
                  required
                  helper={`Remaining sub-event budget: Rs ${expSubEvent?.remaining?.toLocaleString()} PKR`}
                />

                <Input
                  label="Date of Expenditure"
                  type="date"
                  value={expForm.spentOn}
                  onChange={(e) => setExpForm({ ...expForm, spentOn: e.target.value })}
                  required
                />

                <Textarea
                  label="Note / Details (Optional)"
                  placeholder="Receipt number, vendor name, etc."
                  value={expForm.note}
                  onChange={(e) => setExpForm({ ...expForm, note: e.target.value })}
                  rows={2}
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-mist">
                  <Button type="button" variant="ghost" size="md" onClick={() => setExpModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md" disabled={expSaving}>
                    {expSaving ? "Recording..." : "Record Expense"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
