"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  Clock,
  CheckCircle,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLive } from "@/lib/use-live";

export default function PresidentMegaEventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [megaEvents, setMegaEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: liveData } = useLive<{ megaEvents: any[] }>("/api/president/mega-events", 3000);

  useEffect(() => {
    async function load() {
      try {
        const [uRes, mRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/president/mega-events"),
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
    load();
  }, [router]);

  useEffect(() => {
    if (liveData?.megaEvents) {
      setMegaEvents(liveData.megaEvents);
    }
  }, [liveData]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  return (
    <AppShell role="PRESIDENT" user={user} title="Society Mega Events">
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="pb-3 border-b-2 border-mist">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-marigold" />
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Assigned Mega Events
            </h2>
          </div>
          <p className="text-sm text-ink/70 mt-1">
            Official campus festivals assigned to your society by administration. Organize sub-events, assign supervisors, and manage budgets.
          </p>
        </div>

        {megaEvents.length === 0 ? (
          <EmptyState
            title="No Mega Events Assigned"
            description="University administration has not assigned any Mega Events to your society yet. When an event (like NEXUS Tech Fest) is assigned, it will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {megaEvents.map((m) => (
              <Card key={m.id} variant="surface" className="p-6 md:p-8 hover:shadow-hard-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-paper text-ink font-bold text-xs rounded border border-ink/40">
                        {m.society?.name}
                      </span>
                      <span className="text-xs font-semibold text-emerald flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Assigned to Your Society
                      </span>
                    </div>

                    <h3 className="font-display font-extrabold text-2xl md:text-3xl text-ink leading-tight">
                      {m.title}
                    </h3>

                    <p className="text-sm md:text-base text-ink/80">{m.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-ink/75 pt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-sky" />
                        {m.startDate} to {m.endDate}
                      </span>
                      <span>•</span>
                      <span>{m.subEventCount} Sub-events Planned</span>
                      <span>•</span>
                      <span>{m.completedTasks}/{m.totalTasks} Tasks Complete</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t-2 lg:border-t-0 lg:border-l-2 border-mist pt-4 lg:pt-0 lg:pl-8 flex-shrink-0 min-w-[240px]">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-ink/60 block">Approved Overall Cap</span>
                      <p className="font-display font-extrabold text-2xl text-emerald">
                        Rs {m.overallBudget?.toLocaleString()} PKR
                      </p>
                      <p className="text-xs text-ink/60 mt-0.5">
                        Allocated: Rs {m.totalAllocated?.toLocaleString()} PKR
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Preparation</span>
                        <span>{m.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-paper h-2.5 rounded-full border border-ink overflow-hidden">
                        <div
                          className="bg-emerald h-full transition-all"
                          style={{ width: `${m.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <Link href={`/president/mega-events/${m.id}`}>
                      <Button variant="primary" size="md" className="w-full">
                        Manage Festival <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

