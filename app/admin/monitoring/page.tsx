"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  CheckSquare,
  ArrowLeft,
  Building2,
  Filter,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKTShort } from "@/lib/time";

export default function AdminMonitoringPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("approved");

  const loadData = async (activeFilter: string) => {
    try {
      const [uRes, eRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/admin/events?filter=${activeFilter}`),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (eRes.ok) {
        const eData = await eRes.json();
        setEvents(eData.events || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filter);
  }, [filter, router]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate totals across filtered events
  const totalApprovedFunds = events.reduce((sum, e) => sum + (e.approvedBudget || 0), 0);
  const totalSpentFunds = events.reduce(
    (sum, e) => sum + (e.expenses || []).reduce((s: number, exp: any) => s + exp.amount, 0),
    0
  );
  const totalRemainingFunds = totalApprovedFunds - totalSpentFunds;

  return (
    <AppShell role="ADMIN" user={user} title="Campus Financial & Logistics Monitoring">
      <div className="space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Society Governance & Budget Telemetry
          </h2>
          <p className="text-sm text-ink/70">
            Real-time audit view of approved allocations, itemized expenditures, attendance counts, and volunteer sprint completions.
          </p>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card variant="surface" className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-1">
              Sanctioned University Capital
            </span>
            <span className="font-display font-extrabold text-3xl text-emerald">
              Rs {totalApprovedFunds.toLocaleString()}
            </span>
            <p className="text-xs text-ink/60 mt-1">Total approved allocations</p>
          </Card>

          <Card variant="surface" className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-1">
              Recorded Expenditures
            </span>
            <span className="font-display font-extrabold text-3xl text-ink">
              Rs {totalSpentFunds.toLocaleString()}
            </span>
            <p className="text-xs text-ink/60 mt-1">Disbursed with receipts</p>
          </Card>

          <Card variant="surface" className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-1">
              Remaining Treasury Balance
            </span>
            <span className="font-display font-extrabold text-3xl text-sky">
              Rs {totalRemainingFunds.toLocaleString()}
            </span>
            <p className="text-xs text-ink/60 mt-1">Available across active events</p>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 pb-1 overflow-x-auto">
          {[
            { id: "approved", label: "All Approved" },
            { id: "upcoming", label: "Upcoming" },
            { id: "ongoing", label: "Ongoing" },
            { id: "completed", label: "Completed" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-[8px] border-2 border-ink text-xs font-bold transition-all ${
                filter === f.id
                  ? "bg-marigold text-ink shadow-hard-sm"
                  : "bg-surface text-ink hover:bg-mist/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Events Audit Table */}
        <Card variant="surface" className="p-6">
          <h3 className="font-display font-bold text-lg text-ink mb-4 pb-2 border-b-2 border-mist">
            Active Event Charters ({events.length})
          </h3>

          {events.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink/60">
              No events found under the selected status filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                    <th className="py-3">Event & Society</th>
                    <th className="py-3">Schedule (PKT)</th>
                    <th className="py-3">Registrations</th>
                    <th className="py-3">Task Progress</th>
                    <th className="py-3 text-right">Sanctioned Budget</th>
                    <th className="py-3 text-right">Spent</th>
                    <th className="py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist font-medium">
                  {events.map((e) => {
                    const spent = (e.expenses || []).reduce((s: number, x: any) => s + x.amount, 0);
                    const rem = (e.approvedBudget || 0) - spent;
                    const totalT = (e.tasks || []).length;
                    const doneT = (e.tasks || []).filter((t: any) => t.status === "COMPLETED").length;
                    const taskPct = totalT === 0 ? 0 : Math.round((doneT / totalT) * 100);

                    return (
                      <tr key={e.id}>
                        <td className="py-3.5">
                          <p className="font-bold text-ink">{e.title}</p>
                          <span className="text-xs text-ink/60">{e.society?.name}</span>
                        </td>
                        <td className="py-3.5 text-xs text-ink/70">
                          {fmtPKTShort(e.startAt)}
                        </td>
                        <td className="py-3.5">
                          <span className="font-bold text-ink">
                            {(e.registrations || []).length}
                          </span>
                          <span className="text-xs text-ink/60"> / {e.capacity}</span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-mist h-2.5 rounded-full border border-ink overflow-hidden">
                              <div
                                className="bg-emerald h-full rounded-full"
                                style={{ width: `${taskPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-ink">{taskPct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-bold text-emerald">
                          Rs {(e.approvedBudget || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right font-bold text-ink">
                          Rs {spent.toLocaleString()}
                        </td>
                        <td
                          className={`py-3.5 text-right font-bold ${
                            rem < 0 ? "text-rose" : "text-sky"
                          }`}
                        >
                          Rs {rem.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

