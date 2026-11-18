"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Compass, Users, Calendar, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SOCIETY_CATEGORIES } from "@/lib/services/society";

export default function StudentSocietiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

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

        const res = await fetch("/api/societies");
        if (res.ok) {
          const data = await res.json();
          setSocieties(data.societies || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    );
  }

  const filtered = societies.filter((s) => {
    const matchesCat = selectedCategory === "ALL" || s.category === selectedCategory;
    const matchesQuery =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const avatarColors = ["bg-emerald text-white", "bg-marigold text-ink", "bg-sky text-ink", "bg-rose text-white"];

  return (
    <AppShell role="STUDENT" user={user} title="Campus Societies">
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Explore Student Societies
            </h2>
            <p className="text-sm text-ink/70">
              Join clubs, attend events, volunteer, and connect with campus communities.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search by society name or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-3"
            />
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-2 rounded-[8px] border-2 border-ink text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === "ALL"
                  ? "bg-marigold text-ink shadow-hard-sm"
                  : "bg-surface text-ink hover:bg-mist/50"
              }`}
            >
              All Societies
            </button>
            {SOCIETY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-[8px] border-2 border-ink text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-marigold text-ink shadow-hard-sm"
                    : "bg-surface text-ink hover:bg-mist/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Societies Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Compass className="w-6 h-6 text-ink" />}
            title="No Societies Found"
            description="Try adjusting your search keywords or category filters."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s, index) => {
              const colorClass = avatarColors[index % avatarColors.length];
              return (
                <Card
                  key={s.id}
                  variant="surface"
                  className="p-6 flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg transition-all"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className={`w-12 h-12 rounded-full border-2 border-ink flex items-center justify-center font-display font-extrabold text-xl shadow-hard-sm ${colorClass}`}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <Badge variant="upcoming">{s.category}</Badge>
                    </div>

                    <h3 className="font-display font-bold text-xl text-ink leading-tight">
                      {s.name}
                    </h3>
                    <p className="text-xs text-ink/75 mt-2 line-clamp-3 leading-relaxed">
                      {s.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t-2 border-mist flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-ink/70 font-semibold">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald" />
                        {s._count?.memberships || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sky" />
                        {s._count?.events || 0} events
                      </span>
                    </div>

                    <Link href={`/student/societies/${s.id}`}>
                      <span className="inline-flex items-center text-xs font-bold text-emerald hover:underline">
                        View Noticeboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </span>
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

