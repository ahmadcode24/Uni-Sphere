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
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKT } from "@/lib/time";
import { useLive } from "@/lib/use-live";

export default function AdminMegaEventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mega, setMega] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
  });

  const { data: liveMega, refresh } = useLive<{ megaEvent: any }>(
    params.id ? `/api/admin/mega-events/${params.id}` : null,
    3000
  );

  useEffect(() => {
    async function load() {
      try {
        const [uRes, mRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/admin/mega-events/${params.id}`),
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

        if (!mRes.ok) {
          throw new Error("Mega Event not found");
        }
        const mData = await mRes.json();
        setMega(mData.megaEvent);
        setEditForm({
          title: mData.megaEvent.title,
          description: mData.megaEvent.description,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load Mega Event");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  useEffect(() => {
    if (liveMega?.megaEvent) {
      setMega(liveMega.megaEvent);
      if (!editForm.title) {
        setEditForm({
          title: liveMega.megaEvent.title,
          description: liveMega.megaEvent.description,
        });
      }
    }
  }, [liveMega]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/admin/mega-events/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update Mega Event");
      }

      setSaveSuccess(true);
      if (refresh) refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update");
    } finally {
      setSaving(false);
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

  if (error && !mega) {
    return (
      <AppShell role="ADMIN" user={user} title="Mega Event Not Found">
        <div className="p-8 text-center space-y-4">
          <p className="font-bold text-rose">{error}</p>
          <Link href="/admin/mega-events">
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Mega Events
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="ADMIN" user={user} title="Mega Event Summary">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Navigation Breadcrumb */}
        <Link
          href="/admin/mega-events"
          className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to all Mega Events
        </Link>

        {/* Header Hero */}
        <Card variant="featured" colorBlock="marigold" className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-ink text-paper font-bold text-xs rounded-full border border-ink shadow-hard-sm">
                  {mega.society?.name}
                </span>
                <span className="text-xs font-bold text-ink/80">
                  President: {mega.president?.name}
                </span>
              </div>
              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
                {mega.title}
              </h1>
              <p className="text-ink/85 text-sm md:text-base max-w-3xl font-medium">
                {mega.description}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 border-t-2 md:border-t-0 md:border-l-2 border-ink pt-4 md:pt-0 md:pl-6 flex-shrink-0">
              <span className="text-xs font-extrabold uppercase text-ink/70">Festival Duration</span>
              <p className="font-display font-extrabold text-lg text-ink flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-ink" /> {mega.startDate} to {mega.endDate}
              </p>
            </div>
          </div>
        </Card>

        {/* 4 Financial & Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="surface" className="p-4">
            <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Overall Budget</span>
            <p className="font-display font-extrabold text-2xl text-emerald mt-1">
              Rs {mega.overallBudget?.toLocaleString()} PKR
            </p>
            <p className="text-[11px] text-ink/60 mt-1">Fixed festival cap</p>
          </Card>

          <Card variant="surface" className="p-4">
            <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Allocated to Sub-events</span>
            <p className="font-display font-extrabold text-2xl text-ink mt-1">
              Rs {mega.totalAllocated?.toLocaleString()} PKR
            </p>
            <p className="text-[11px] text-ink/60 mt-1">Unallocated: Rs {mega.unallocated?.toLocaleString()} PKR</p>
          </Card>

          <Card variant="surface" className="p-4">
            <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Total Spent Logged</span>
            <p className="font-display font-extrabold text-2xl text-rose mt-1">
              Rs {mega.totalSpent?.toLocaleString()} PKR
            </p>
            <p className="text-[11px] text-ink/60 mt-1">Remaining: Rs {(mega.overallBudget - mega.totalSpent)?.toLocaleString()} PKR</p>
          </Card>

          <Card variant="surface" className="p-4">
            <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Overall Preparation</span>
            <p className="font-display font-extrabold text-2xl text-ink mt-1">
              {mega.progressPercent}%
            </p>
            <p className="text-[11px] text-ink/60 mt-1">
              {mega.completedTasks} / {mega.totalTasks} tasks complete
            </p>
          </Card>
        </div>

        {/* Sub-events Read-only Summary Table */}
        <Card variant="surface" className="p-6">
          <div className="flex items-center justify-between pb-3 border-b-2 border-mist mb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">
                Sub-events Breakdown ({mega.subEvents?.length || 0})
              </h3>
              <p className="text-xs text-ink/60">
                Created and managed directly by the Society President.
              </p>
            </div>
            <Badge variant="upcoming">{mega.subEvents?.length || 0} Sub-events</Badge>
          </div>

          {mega.subEvents?.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink/60 bg-paper/50 rounded-[12px] border border-dashed border-ink/20">
              The society president has not created any sub-events for this festival yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                    <th className="py-2.5 px-2">Sub-event</th>
                    <th className="py-2.5 px-2">Date & Venue</th>
                    <th className="py-2.5 px-2">Supervisor (Student)</th>
                    <th className="py-2.5 px-2">Allocated / Spent</th>
                    <th className="py-2.5 px-2 text-right">Tasks Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {mega.subEvents.map((sub: any) => (
                    <tr key={sub.id} className="font-medium text-ink">
                      <td className="py-3 px-2">
                        <p className="font-bold text-base text-ink">{sub.title}</p>
                        <p className="text-xs text-ink/60 line-clamp-1">{sub.description}</p>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <p className="font-bold text-ink">{sub.date}</p>
                        <p className="text-ink/60">{sub.venue}</p>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <p className="font-bold text-ink">👤 {sub.supervisor?.name}</p>
                        <p className="text-ink/60">{sub.supervisor?.email}</p>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <p className="font-bold text-emerald">
                          Allocated: {sub.allocatedBudget !== null ? `Rs ${sub.allocatedBudget.toLocaleString()} PKR` : "Pending"}
                        </p>
                        <p className="text-ink/60">Spent: Rs {sub.spent.toLocaleString()} PKR</p>
                      </td>
                      <td className="py-3 px-2 text-right text-xs">
                        <span className="font-bold">{sub.progressPercent}%</span>
                        <div className="w-24 bg-paper h-2 rounded-full border border-ink overflow-hidden ml-auto mt-1">
                          <div
                            className="bg-emerald h-full"
                            style={{ width: `${sub.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-ink/60 block mt-0.5">
                          {sub.completedTasks}/{sub.totalTasks} Done
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Edit Title & Description Form (Only Title & Description Editable) */}
        <Card variant="surface" className="p-6">
          <div className="pb-3 border-b-2 border-mist mb-5">
            <h3 className="font-display font-bold text-lg text-ink">
              Administrative Information Settings
            </h3>
            <p className="text-xs text-ink/60">
              Only festival title and description can be modified after creation. Society, dates, and overall budget are fixed.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose text-white text-xs font-bold rounded-[8px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald text-white text-xs font-bold rounded-[8px] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Mega Event details updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Mega Event Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />

            <Textarea
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              required
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <Input
                label="Assigned Society (Fixed)"
                value={mega.society?.name}
                disabled
                helper="Cannot be changed"
              />
              <Input
                label="Duration (Fixed)"
                value={`${mega.startDate} to ${mega.endDate}`}
                disabled
                helper="Dates are locked"
              />
              <Input
                label="Overall Budget (Fixed)"
                value={`Rs ${mega.overallBudget?.toLocaleString()} PKR`}
                disabled
                helper="Budget allocation is locked"
              />
            </div>

            <div className="flex justify-end pt-4 border-t-2 border-mist">
              <Button type="submit" variant="primary" size="md" disabled={saving}>
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? "Saving Changes..." : "Save Details"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
