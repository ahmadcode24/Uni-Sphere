"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, PlusCircle, ArrowLeft, Save, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function NewEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    startAt: "",
    endAt: "",
    registrationDeadline: "",
    capacity: 50,
    proposedBudget: 25000,
  });

  useEffect(() => {
    async function load() {
      try {
        const uRes = await fetch("/api/auth/me");
        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        setUser(uData.user);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      router.push(`/president/events/${data.event.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create event proposal");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading form...</div>;
  }

  return (
    <AppShell role="PRESIDENT" user={user} title="Draft Event Proposal">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/president/events"
          className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to events
        </Link>

        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Draft New Event Proposal
          </h2>
          <p className="text-sm text-ink/70">
            Create an event in Draft state. You can review details before submitting it for university approval.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Card variant="surface" className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Event Title"
              type="text"
              placeholder="e.g. Annual Campus Robotics Expo"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <Textarea
              label="Description & Agenda"
              placeholder="Provide a comprehensive summary of activities, speaker sessions, or competition rubrics..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={4}
            />

            <Input
              label="Campus Venue / Hall"
              type="text"
              placeholder="e.g. Main Auditorium, Computing Lab 3"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date & Time (PKT)"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                required
                helper="Timezone: Asia/Karachi (PKT)"
              />

              <Input
                label="End Date & Time (PKT)"
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                required
                helper="Must be after start time"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Input
                  label="Registration Deadline (PKT)"
                  type="datetime-local"
                  value={form.registrationDeadline}
                  onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                  required
                  helper="Must be <= start time"
                />
              </div>

              <div>
                <Input
                  label="Capacity (Students)"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div>
                <Input
                  label="Proposed Budget (PKR)"
                  type="number"
                  min={0}
                  step={500}
                  value={form.proposedBudget}
                  onChange={(e) =>
                    setForm({ ...form, proposedBudget: parseInt(e.target.value) || 0 })
                  }
                  required
                  helper="Integer PKR"
                />
              </div>
            </div>

            <div className="pt-5 border-t-2 border-mist flex justify-end gap-3">
              <Link href="/president/events">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="lg" disabled={saving}>
                {saving ? "Creating Draft..." : "Save Proposal as Draft"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
