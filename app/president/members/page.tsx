"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Check, X, UserMinus, ShieldAlert, Star } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function PresidentMembersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [society, setSociety] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadMembers = async (socId: string) => {
    try {
      const res = await fetch(`/api/societies/${socId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch("/api/auth/me");
        if (!userRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await userRes.json();
        setUser(uData.user);

        const sRes = await fetch("/api/societies?my=true");
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.society) {
            setSociety(sData.society);
            await loadMembers(sData.society.id);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleAction = async (membershipId: string, action: string, label?: string) => {
    setActionLoading(membershipId);
    setMessage("");

    try {
      const res = await fetch(`/api/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, label }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      if (society) {
        await loadMembers(society.id);
      }
      setMessage(`Member status updated successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to process action");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!society) {
    return (
      <AppShell role="PRESIDENT" user={user} title="Society Members">
        <EmptyState
          icon={<ShieldAlert className="w-6 h-6 text-rose" />}
          title="No Society Found"
          description="You haven't registered your society yet. Please set up your society profile first."
          action={
            <Button variant="primary" onClick={() => router.push("/president/society")}>
              Create Society Profile
            </Button>
          }
        />
      </AppShell>
    );
  }

  const pendingMembers = members.filter((m) => m.status === "PENDING");
  const approvedMembers = members.filter((m) => m.status === "APPROVED");

  const tabList = [
    { id: "pending", label: "Pending Requests", badge: pendingMembers.length },
    { id: "approved", label: "Approved Members", badge: approvedMembers.length },
  ];

  return (
    <AppShell role="PRESIDENT" user={user} title={`${society.name} — Members`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Membership Management
            </h2>
            <p className="text-sm text-ink/70">
              Review join requests, appoint Core Members, or manage active members.
            </p>
          </div>
          <span className="self-start px-3 py-1 bg-marigold text-ink font-bold text-xs rounded-full border-2 border-ink shadow-hard-sm">
            Total Approved: {approvedMembers.length}
          </span>
        </div>

        {message && (
          <div className="p-3 bg-emerald text-white text-sm font-semibold rounded-[10px] border-2 border-ink shadow-hard-sm">
            {message}
          </div>
        )}

        {/* Tabs */}
        <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />

        {/* Pending Requests Tab */}
        {activeTab === "pending" && (
          <div>
            {pendingMembers.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6 text-ink" />}
                title="No Pending Join Requests"
                description="There are currently no new student requests waiting for your approval."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingMembers.map((m) => (
                  <Card key={m.id} variant="surface" className="p-5 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-lg text-ink">
                            {m.student.name}
                          </h4>
                          <Badge variant="pending">Pending</Badge>
                        </div>
                        <p className="text-xs text-ink/70 mt-0.5">{m.student.email}</p>
                        <p className="text-[11px] text-ink/50 mt-2">
                          Requested: {new Date(m.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t-2 border-mist flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="rose"
                        disabled={actionLoading === m.id}
                        onClick={() => handleAction(m.id, "reject")}
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={actionLoading === m.id}
                        onClick={() => handleAction(m.id, "approve")}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approved Members Tab */}
        {activeTab === "approved" && (
          <div>
            {approvedMembers.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6 text-ink" />}
                title="No Approved Members Yet"
                description="Once students request to join and you approve them, they will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedMembers.map((m) => {
                  const isCore = m.label === "CORE";
                  return (
                    <Card key={m.id} variant="surface" className="p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-9 h-9 rounded-full bg-mist border-2 border-ink flex items-center justify-center font-bold text-sm text-ink shadow-hard-sm">
                            {m.student.name.charAt(0).toUpperCase()}
                          </div>
                          <Badge variant={isCore ? "ongoing" : "default"}>
                            {isCore ? "⭐ Core Member" : "Member"}
                          </Badge>
                        </div>
                        <h4 className="font-display font-bold text-base text-ink">
                          {m.student.name}
                        </h4>
                        <p className="text-xs text-ink/70">{m.student.email}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t-2 border-mist flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(m.id, "label", isCore ? "MEMBER" : "CORE")}
                          className="text-xs font-bold text-sky hover:underline flex items-center gap-1"
                          title="Toggle Core Member label"
                        >
                          <Star className="w-3.5 h-3.5" />
                          {isCore ? "Unmark Core" : "Make Core"}
                        </button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose text-xs py-1 px-2 border-rose/30 hover:bg-rose/10"
                          disabled={actionLoading === m.id}
                          onClick={() => {
                            if (confirm(`Remove ${m.student.name} from ${society.name}?`)) {
                              handleAction(m.id, "remove");
                            }
                          }}
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

