"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, Calendar, Mail, Phone, Compass } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSocietiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [uRes, sRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/societies"),
        ]);

        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        setUser(uData.user);

        if (sRes.ok) {
          const sData = await sRes.json();
          setSocieties(sData.societies || []);
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
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  return (
    <AppShell role="ADMIN" user={user} title="Campus Societies Directory">
      <div className="space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Registered Student Societies
          </h2>
          <p className="text-sm text-ink/70">
            Official university societies, active leadership contacts, and current membership rosters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {societies.map((s) => (
            <Card key={s.id} variant="surface" className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="upcoming">{s.category}</Badge>
                  <h3 className="font-display font-bold text-xl text-ink mt-2">{s.name}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald text-white border-2 border-ink flex items-center justify-center font-bold">
                  {s.name.charAt(0)}
                </div>
              </div>

              <p className="text-xs text-ink/75 leading-relaxed line-clamp-2">{s.description}</p>

              <div className="pt-3 border-t-2 border-mist text-xs text-ink/70 space-y-1 font-semibold">
                <p className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald" /> President: {s.president?.name} ({s.president?.email})
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky" /> {s.contactEmail}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-bold text-ink">
                <span>{s._count?.memberships || 0} active members</span>
                <span>{s._count?.events || 0} event notices</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

