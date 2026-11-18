"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  PlusCircle,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle,
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

export default function AdminMegaEventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [megaEvents, setMegaEvents] = useState<any[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    societyId: "",
    startDate: "",
    endDate: "",
    overallBudget: 100000,
  });

  const { data: liveData, refresh } = useLive<{ megaEvents: any[] }>("/api/admin/mega-events", 3000);

  useEffect(() => {
    async function init() {
      try {
        const [uRes, socRes, mRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/societies"),
          fetch("/api/admin/mega-events"),
        ]);

        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        if (uData.user?.role !== "ADMIN") {
          router.push("/login");
          return;
        }
        setUser(uData.user);

        if (socRes.ok) {
          const sData = await socRes.json();
          setSocieties(sData.societies || []);
          if (sData.societies?.length > 0 && !form.societyId) {
            setForm((prev) => ({ ...prev, societyId: sData.societies[0].id }));
          }
        }

        if (mRes.ok) {
          const mData = await mRes.json();
          setMegaEvents(mData.megaEvents || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    if (liveData?.megaEvents) {
      setMegaEvents(liveData.megaEvents);
    }
  }, [liveData]);

  const selectedSociety = societies.find((s) => s.id === form.societyId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    if (form.startDate > form.endDate) {
      setFormError("Start date must be less than or equal to end date.");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/mega-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          societyId: form.societyId,
          startDate: form.startDate,
          endDate: form.endDate,
          overallBudget: Number(form.overallBudget),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create Mega Event");
      }

      setModalOpen(false);
      setForm({
        title: "",
        description: "",
        societyId: societies[0]?.id || "",
        startDate: "",
        endDate: "",
        overallBudget: 100000,
      });
      if (refresh) refresh();
    } catch (err: any) {
      setFormError(err.message || "Failed to create Mega Event");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const totalOverallBudget = megaEvents.reduce((acc, m) => acc + (m.overallBudget || 0), 0);
  const totalAllocatedBudget = megaEvents.reduce((acc, m) => acc + (m.totalAllocated || 0), 0);
  const totalSpentBudget = megaEvents.reduce((acc, m) => acc + (m.totalSpent || 0), 0);

  return (
    <AppShell role="ADMIN" user={user} title="Campus Mega Events">
      <div className="space-y-8">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-mist">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-marigold" />
              <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
                Campus Mega Events
              </h2>
            </div>
            <p className="text-sm text-ink/70 mt-1">
              Create university-wide flagship festivals and oversee multi-sub-event allocations.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setModalOpen(true)}
            className="self-start sm:self-auto shadow-hard-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Create Mega Event
          </Button>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="surface" className="p-5">
            <span className="text-xs uppercase font-extrabold text-ink/60 block">Mega Events Created</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display font-extrabold text-4xl text-ink">{megaEvents.length}</span>
              <Sparkles className="w-6 h-6 text-marigold" />
            </div>
            <p className="text-xs text-ink/60 mt-2">Managed under your administration</p>
          </Card>

          <Card variant="surface" className="p-5">
            <span className="text-xs uppercase font-extrabold text-ink/60 block">Total Overall Budget</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display font-extrabold text-3xl text-emerald">
                Rs {totalOverallBudget.toLocaleString()} PKR
              </span>
              <DollarSign className="w-6 h-6 text-emerald" />
            </div>
            <p className="text-xs text-ink/60 mt-2">Allocated by societies: Rs {totalAllocatedBudget.toLocaleString()} PKR</p>
          </Card>

          <Card variant="surface" className="p-5">
            <span className="text-xs uppercase font-extrabold text-ink/60 block">Total Spent Across Festivals</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display font-extrabold text-3xl text-ink">
                Rs {totalSpentBudget.toLocaleString()} PKR
              </span>
              <DollarSign className="w-6 h-6 text-ink/40" />
            </div>
            <p className="text-xs text-ink/60 mt-2">Direct sub-event logged expenditures</p>
          </Card>
        </div>

        {/* Mega Events List */}
        {megaEvents.length === 0 ? (
          <EmptyState
            title="No Mega Events Created Yet"
            description="Create university flagship festivals (like NEXUS Tech Fest) and assign them to societies for preparation."
            action={
              <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
                <PlusCircle className="w-4 h-4 mr-1.5" /> Create First Mega Event
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg text-ink">Active Campus Festivals</h3>
            <div className="grid grid-cols-1 gap-4">
              {megaEvents.map((m) => (
                <Card key={m.id} variant="surface" className="p-6 hover:shadow-hard-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-paper text-ink font-bold text-xs rounded border border-ink/40">
                          {m.society?.name}
                        </span>
                        <span className="text-xs text-ink/60 font-semibold">
                          President: {m.president?.name}
                        </span>
                      </div>

                      <h4 className="font-display font-extrabold text-2xl text-ink leading-tight">
                        {m.title}
                      </h4>

                      <p className="text-sm text-ink/75 line-clamp-2">{m.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-ink/80 pt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-sky" />
                          {m.startDate} to {m.endDate}
                        </span>
                        <span>•</span>
                        <span>{m.subEventCount} Sub-events</span>
                        <span>•</span>
                        <span>{m.completedTasks} / {m.totalTasks} Tasks Done</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t-2 lg:border-t-0 lg:border-l-2 border-mist pt-4 lg:pt-0 lg:pl-8 flex-shrink-0 min-w-[220px]">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Overall Budget</span>
                        <p className="font-display font-extrabold text-xl text-emerald">
                          Rs {m.overallBudget?.toLocaleString()} PKR
                        </p>
                        <p className="text-xs text-ink/60 mt-0.5">
                          Spent: Rs {m.totalSpent?.toLocaleString()} PKR
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>Prep Progress</span>
                          <span>{m.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-paper h-2.5 rounded-full border border-ink overflow-hidden">
                          <div
                            className="bg-emerald h-full transition-all"
                            style={{ width: `${m.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <Link href={`/admin/mega-events/${m.id}`}>
                        <Button variant="secondary" size="sm" className="w-full">
                          View Summary <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Create Mega Event */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border-2 border-ink rounded-[16px] shadow-hard-xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b-2 border-mist mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-marigold" />
                  <h3 className="font-display font-extrabold text-xl text-ink">Create Mega Event</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 hover:bg-mist rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose text-white text-xs font-bold rounded-[8px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Mega Event Title"
                  placeholder="e.g. NEXUS Tech Fest 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />

                <Textarea
                  label="Description"
                  placeholder="Comprehensive description of the flagship campus festival..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  rows={3}
                />

                {/* Society Select */}
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                    Assigned Society
                  </label>
                  <select
                    value={form.societyId}
                    onChange={(e) => setForm({ ...form, societyId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-paper text-ink border-2 border-ink rounded-[10px] text-sm font-semibold focus:outline-none focus:border-emerald"
                    required
                  >
                    {societies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>

                  {/* Auto-assigned President Preview */}
                  {selectedSociety && (
                    <div className="mt-2 p-2.5 bg-mist/40 border border-ink/30 rounded-[8px] text-xs font-semibold text-ink">
                      <span className="text-ink/60 block text-[10px] uppercase font-extrabold">
                        Designated Society President (Auto-Assigned):
                      </span>
                      <p className="mt-0.5 font-bold text-emerald">
                        👤 {selectedSociety.president?.name || "Society President"} ({selectedSociety.president?.email})
                      </p>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Festival Start Date"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    helper="YYYY-MM-DD"
                  />
                  <Input
                    label="Festival End Date"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    helper="Must be >= Start Date"
                  />
                </div>

                {/* Overall Budget */}
                <Input
                  label="Overall Approved Budget (PKR)"
                  type="number"
                  min={0}
                  step={1000}
                  value={form.overallBudget}
                  onChange={(e) => setForm({ ...form, overallBudget: parseInt(e.target.value) || 0 })}
                  required
                  helper="Total budget cap for all sub-events"
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-mist">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setModalOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md" disabled={creating}>
                    {creating ? "Creating Festival..." : "Create Mega Event"}
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
