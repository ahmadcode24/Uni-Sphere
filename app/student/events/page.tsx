"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Calendar, MapPin, Clock, ArrowRight, Compass } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtPKT } from "@/lib/time";
import { SOCIETY_CATEGORIES } from "@/lib/services/society";
import { useLive } from "@/lib/use-live";

export default function StudentBrowseEventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  const { data: liveEvents } = useLive<{ events: any[] }>("/api/events/public", 3000);

  useEffect(() => {
    async function init() {
      try {
        const uRes = await fetch("/api/auth/me");
        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        setUser(uData.user);

        const res = await fetch("/api/events/public");
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
    init();
  }, [router]);

  useEffect(() => {
    if (liveEvents?.events) {
      setEvents(liveEvents.events);
    }
  }, [liveEvents]);

  const filtered = events.filter((e) => {
    const matchesCat = category === "ALL" || e.society?.category === category;
    const matchesQuery =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.society?.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AppShell role="STUDENT" user={user} title="Campus Events">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Title */}
        <div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
            Campus Event Noticeboard
          </h1>
          <p className="text-sm md:text-base text-ink/75 mt-1">
            Browse upcoming workshops, hackathons, theatrical dramas, and competitions scheduled across campus.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search notices by title, society, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-base"
            />
            <Search className="w-5 h-5 text-ink/40 absolute left-3 top-3" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setCategory("ALL")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-input border-2 border-ink whitespace-nowrap transition-transform active:translate-y-0.5 ${
                category === "ALL"
                  ? "bg-marigold text-ink shadow-hard-sm"
                  : "bg-surface text-ink hover:bg-paper"
              }`}
            >
              All Events
            </button>
            {SOCIETY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-input border-2 border-ink whitespace-nowrap transition-transform active:translate-y-0.5 ${
                  category === cat
                    ? "bg-marigold text-ink shadow-hard-sm"
                    : "bg-surface text-ink hover:bg-paper"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Event Notice Cards Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6 text-ink" />}
            title="No event notices found"
            description="There are currently no scheduled events matching your criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <Card
                key={item.id}
                variant="surface"
                className="p-6 flex flex-col justify-between hover:shadow-hard-lg transition-shadow border-2 border-ink relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-ink/80 px-2.5 py-0.5 bg-paper rounded border border-ink/30">
                      {item.society?.name}
                    </span>
                    <Badge variant={item.seatsRemaining > 0 ? "seats" : "rejected"}>
                      {item.seatsRemaining > 0
                        ? `${item.seatsRemaining} SEATS LEFT`
                        : "FULL"}
                    </Badge>
                  </div>

                  <h3 className="font-display font-bold text-xl text-ink tracking-tight mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs md:text-sm text-ink/70 line-clamp-3 mb-4 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-mist space-y-3">
                  <div className="space-y-1.5 text-xs font-medium text-ink/80">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald flex-shrink-0" />
                      <span>{fmtPKT(item.startAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose flex-shrink-0" />
                      <span className="truncate">{item.venue}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link href={`/student/events/${item.id}`}>
                      <Button variant="secondary" size="sm" className="group">
                        Notice Details{" "}
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
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

