"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Calendar, MapPin, Clock, ArrowRight, Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtPKT } from "@/lib/time";
import { SOCIETY_CATEGORIES } from "@/lib/services/society";

export default function BrowseEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const [res, uRes] = await Promise.all([
          fetch("/api/events/public"),
          fetch("/api/auth/me"),
        ]);

        if (uRes.ok) {
          const uData = await uRes.json();
          setUser(uData.user);
          if (uData.user?.role === "STUDENT") {
            router.replace("/student/events");
            return;
          }
        }

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

  const filtered = events.filter((e) => {
    const matchesCat = category === "ALL" || e.society?.category === category;
    const matchesQuery =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.society?.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Top Header */}
      <header className="border-b-2 border-ink bg-surface sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-extrabold text-2xl tracking-tight text-ink">
              Uni<span className="text-emerald">Sphere</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href={user.role === "PRESIDENT" ? "/president" : user.role === "ADMIN" ? "/admin" : "/student"}>
                <Button variant="primary" size="sm">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="secondary" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-8 flex-1 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
            Campus Event Noticeboard
          </h1>
          <p className="text-sm md:text-base text-ink/75 mt-1">
            Browse upcoming workshops, hackathons, theatrical dramas, and competitions scheduled across campus.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search notices by title, society, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1">
            <button
              onClick={() => setCategory("ALL")}
              className={`px-3 py-1.5 rounded-[8px] border-2 border-ink text-xs font-bold whitespace-nowrap transition-all ${
                category === "ALL"
                  ? "bg-marigold text-ink shadow-hard-sm"
                  : "bg-surface text-ink hover:bg-mist/50"
              }`}
            >
              All Events
            </button>
            {SOCIETY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-[8px] border-2 border-ink text-xs font-bold whitespace-nowrap transition-all ${
                  category === cat
                    ? "bg-marigold text-ink shadow-hard-sm"
                    : "bg-surface text-ink hover:bg-mist/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6 text-ink" />}
            title="No Notices Found"
            description="No upcoming events matched your filter criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((e) => (
              <Card
                key={e.id}
                variant="surface"
                className="p-6 flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-ink/60 mb-3">
                    <span className="px-2.5 py-0.5 bg-paper rounded border border-ink/40">
                      {e.society?.name}
                    </span>
                    <span className="px-2 py-0.5 bg-marigold text-ink rounded-full border border-ink font-extrabold text-[11px]">
                      {e.seatsRemaining} SEATS LEFT
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-ink leading-tight">
                    {e.title}
                  </h3>

                  <p className="text-xs text-ink/75 mt-2 line-clamp-3 leading-relaxed">
                    {e.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-mist/70 space-y-1.5 text-xs text-ink/70 font-semibold">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald" /> {fmtPKT(e.startAt)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose" /> {e.venue}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t-2 border-mist flex justify-end">
                  <Link href={`/events/${e.id}`}>
                    <Button variant="secondary" size="sm">
                      Notice Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

