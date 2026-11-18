"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, XCircle, ArrowRight, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtPKTShort } from "@/lib/time";

export default function StudentRegistrationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/events/my-registrations"),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (rRes.ok) {
        const rData = await rRes.json();
        setRegistrations(rData.registrations || []);
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

  const handleCancelRegistration = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to cancel your seat for '${eventTitle}'?`)) return;

    setActionLoading(eventId);
    setMessage("");

    try {
      const res = await fetch(`/api/events/${eventId}/unregister`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel registration");

      setMessage(`Registration for '${eventTitle}' has been cancelled.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  const activeRegistrations = registrations.filter((r) => r.status === "REGISTERED");

  return (
    <AppShell role="STUDENT" user={user} title="My Event Registrations">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              My Confirmed Event Seats
            </h2>
            <p className="text-sm text-ink/70">
              Manage your registered event schedule and check venue directions.
            </p>
          </div>
          <Link href="/events">
            <Button variant="primary" size="md">
              <Calendar className="w-4 h-4 mr-1" /> Discover More Events
            </Button>
          </Link>
        </div>

        {message && (
          <div className="p-3.5 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {registrations.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6 text-ink" />}
            title="No Registrations Yet"
            description="You haven't registered for any events yet. Check out the campus noticeboard to claim a seat."
            action={
              <Link href="/events">
                <Button variant="primary">Browse Events</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {registrations.map((r) => {
              const isRegistered = r.status === "REGISTERED";
              const isPastStart = new Date() >= new Date(r.event.startAt);

              return (
                <Card
                  key={r.id}
                  variant="surface"
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-paper border border-ink/40 rounded">
                        {r.event.society?.name}
                      </span>
                      <Badge variant={isRegistered ? "approved" : "cancelled"}>
                        {r.status}
                      </Badge>
                      <Badge variant="upcoming">{r.scheduleStatus}</Badge>
                    </div>

                    <h3 className="font-display font-bold text-xl text-ink">
                      {r.event.title}
                    </h3>

                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-ink/75 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald" /> {fmtPKTShort(r.event.startAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose" /> {r.event.venue}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-mist">
                    <Link href={`/events/${r.event.id}`}>
                      <Button variant="secondary" size="sm">
                        Notice Details
                      </Button>
                    </Link>

                    {isRegistered && !isPastStart && !r.event.isCancelled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose border-rose/30 hover:bg-rose/10"
                        disabled={actionLoading === r.event.id}
                        onClick={() => handleCancelRegistration(r.event.id, r.event.title)}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Cancel Seat
                      </Button>
                    )}
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

