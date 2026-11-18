"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtPKTShort } from "@/lib/time";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [uRes, sRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/admin/stats"),
        ]);

        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        setUser(uData.user);

        if (sRes.ok) {
          const sData = await sRes.json();
          setStats(sData);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const pendingList = stats?.pendingProposals || [];

  return (
    <AppShell role="ADMIN" user={user} title="Administration Overview">
      <div className="space-y-8">
        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Campus Oversight & Governance
          </h2>
          <p className="text-sm text-ink/70">
            Real-time telemetry across university societies, student attendances, and financial budgets.
          </p>
        </div>

        {/* 3 Real Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between text-ink/70 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Registered Societies</span>
              <Building2 className="w-5 h-5 text-emerald" />
            </div>
            <span className="font-display font-extrabold text-4xl text-ink">
              {stats?.societiesCount || 0}
            </span>
            <p className="text-xs text-ink/60 mt-1">Official student chapters</p>
          </Card>

          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between text-ink/70 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total Campus Events</span>
              <Calendar className="w-5 h-5 text-sky" />
            </div>
            <span className="font-display font-extrabold text-4xl text-ink">
              {stats?.eventsCount || 0}
            </span>
            <p className="text-xs text-ink/60 mt-1">Proposals and notices</p>
          </Card>

          <Card variant="surface" className="p-6">
            <div className="flex items-center justify-between text-ink/70 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Student Registrations</span>
              <Users className="w-5 h-5 text-marigold" />
            </div>
            <span className="font-display font-extrabold text-4xl text-ink">
              {stats?.registrationsCount || 0}
            </span>
            <p className="text-xs text-ink/60 mt-1">Confirmed student seats</p>
          </Card>
        </div>

        {/* Pending Proposals Section */}
        <Card variant="surface" className="p-6 md:p-8">
          <div className="flex items-center justify-between pb-4 border-b-2 border-mist mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-marigold" />
                <h3 className="font-display font-bold text-xl text-ink">Pending Event Proposals</h3>
              </div>
              <p className="text-xs text-ink/70 mt-0.5">
                Proposals submitted by society presidents awaiting formal administrative budget & date review.
              </p>
            </div>
            <Badge variant="pending">{pendingList.length} Awaiting Review</Badge>
          </div>

          {pendingList.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink/60">
              ✨ All caught up! There are currently no pending event proposals waiting for decision.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                    <th className="py-3">Event Proposal</th>
                    <th className="py-3">Society</th>
                    <th className="py-3">Proposed Budget</th>
                    <th className="py-3">Start Date (PKT)</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {pendingList.map((e: any) => (
                    <tr key={e.id} className="font-medium text-ink">
                      <td className="py-4">
                        <p className="font-bold text-base text-ink">{e.title}</p>
                        <p className="text-xs text-ink/60 mt-0.5">{e.venue}</p>
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 bg-paper border border-ink/40 rounded text-xs font-bold">
                          {e.society?.name}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-emerald">
                        Rs {e.proposedBudget.toLocaleString()} PKR
                      </td>
                      <td className="py-4 text-xs font-semibold text-ink/75">
                        {fmtPKTShort(e.startAt)}
                      </td>
                      <td className="py-4 text-right">
                        <Link href={`/admin/review/${e.id}`}>
                          <Button size="sm" variant="marigold">
                            Review Proposal <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

