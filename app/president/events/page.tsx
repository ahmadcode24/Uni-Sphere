"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, PlusCircle, ArrowRight, Clock, MapPin, Users, DollarSign } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtPKTShort } from "@/lib/time";

export default function PresidentEventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  const getBadgeVariant = (status: string, isCancelled: boolean): BadgeVariant => {
    if (isCancelled) return "cancelled";
    switch (status) {
      case "APPROVED":
        return "approved";
      case "PENDING":
        return "pending";
      case "REJECTED":
        return "rejected";
      case "DRAFT":
      default:
        return "draft";
    }
  };

  return (
    <AppShell role="PRESIDENT" user={user} title="Society Events">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Event Notices & Proposals
            </h2>
            <p className="text-sm text-ink/70">
              Draft new event proposals, submit for university budget approval, and manage logistics.
            </p>
          </div>
          <Link href="/president/events/new">
            <Button variant="primary" size="md">
              <PlusCircle className="w-4 h-4 mr-1" /> New Event Proposal
            </Button>
          </Link>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6 text-ink" />}
            title="No events yet"
            description="Create your first event proposal and send it to administration for approval."
            action={
              <Link href="/president/events/new">
                <Button variant="primary">Create First Event</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((e) => {
              const statusBadge = getBadgeVariant(e.approvalStatus, e.isCancelled);
              return (
                <Card
                  key={e.id}
                  variant="surface"
                  className="p-6 flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge variant={statusBadge}>
                        {e.isCancelled ? "Cancelled" : e.approvalStatus}
                      </Badge>
                      <span className="text-xs font-bold text-ink/60">
                        Capacity: {e.capacity}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-xl text-ink leading-tight">
                      {e.title}
                    </h3>
                    <p className="text-xs text-ink/75 mt-2 line-clamp-2 leading-relaxed">
                      {e.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-mist/70 space-y-1.5 text-xs text-ink/70 font-semibold">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald" /> {fmtPKTShort(e.startAt)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose" /> {e.venue}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-marigold" /> Budget: Rs{" "}
                        {(e.approvedBudget || e.proposedBudget).toLocaleString()}
                        {e.approvedBudget ? " (Approved)" : " (Proposed)"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t-2 border-mist flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald">
                      {e._count?.registrations || 0} registered attendees
                    </span>

                    <Link href={`/president/events/${e.id}`}>
                      <Button variant="secondary" size="sm">
                        Manage Event <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
