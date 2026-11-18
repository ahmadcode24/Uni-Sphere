import React from "react";
import Link from "next/link";
import { Calendar, ArrowRight, MapPin, Clock, Users, Shield, Compass, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { eventCaps } from "@/lib/services/event";
import { fmtPKT, fmtPKTDateOnly, fmtPKTTimeOnly } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const now = new Date();

  // Load real upcoming approved events from DB (3–6)
  const rawEvents = await prisma.event.findMany({
    where: {
      approvalStatus: "APPROVED",
      isCancelled: false,
      endAt: { gte: now },
    },
    include: {
      society: { select: { id: true, name: true, category: true } },
      _count: {
        select: { registrations: { where: { status: "REGISTERED" } } },
      },
    },
    orderBy: { startAt: "asc" },
    take: 6,
  });

  const events = rawEvents
    .map((e) => {
      const caps = eventCaps(e, now);
      const registeredCount = e._count.registrations;
      const seatsRemaining = Math.max(0, e.capacity - registeredCount);
      return {
        ...e,
        seatsRemaining,
        registeredCount,
        scheduleStatus: caps.scheduleStatus,
      };
    })
    .filter((e) => e.scheduleStatus === "UPCOMING" || e.scheduleStatus === "ONGOING");

  const featuredEvent = events[0] || null;
  const remainingEvents = events.slice(1, 5);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-ink bg-surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-extrabold text-2xl tracking-tight text-ink">
              Uni<span className="text-emerald">Sphere</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/events">
              <Button variant="ghost" size="sm">
                Browse events
              </Button>
            </Link>
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column (Headline + Pitch) */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-marigold text-ink rounded-full border-2 border-ink shadow-hard-sm text-xs font-bold">
              <span>📍 Campus Life Noticeboard</span>
            </div>

            <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl text-ink leading-[1.05] tracking-tight">
              Every society. Every event. One noticeboard.
            </h1>

            <p className="text-lg md:text-xl text-ink/80 max-w-xl font-medium leading-relaxed">
              Students discover and register for campus activities, student presidents run their society logistics, and university administration oversees approved budgets.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Join UniSphere <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="secondary" size="lg">
                  See what&apos;s on
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Tilted Sticker Paper Ticket Stack */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm h-80 flex items-center justify-center">
              {events.length > 0 ? (
                events.slice(0, 3).map((e, idx) => {
                  const rotations = ["-rotate-2", "rotate-1", "-rotate-1"];
                  const zIndices = ["z-30", "z-20", "z-10"];
                  const offsets = ["top-0", "top-6", "top-12"];
                  const rot = rotations[idx % 3];
                  const z = zIndices[idx % 3];
                  const off = offsets[idx % 3];

                  return (
                    <div
                      key={e.id}
                      className={`absolute ${off} w-72 md:w-80 bg-surface border-2 border-ink rounded-[16px] shadow-hard-lg p-4 transform ${rot} ${z} transition-transform hover:scale-105 select-none`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-ink/40 mb-2.5">
                        <span className="font-display font-bold text-xs text-ink/70">
                          {e.society.name}
                        </span>
                        <span className="px-2 py-0.5 bg-marigold text-ink text-[10px] font-extrabold rounded-full border border-ink">
                          {e.seatsRemaining} SEATS LEFT
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-base text-ink line-clamp-1">
                        {e.title}
                      </h4>
                      <p className="text-xs text-ink/75 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky" /> {fmtPKTDateOnly(e.startAt)}
                      </p>
                      <p className="text-xs text-ink/75 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose" /> {e.venue}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="w-72 bg-surface border-2 border-ink rounded-[16px] shadow-hard-lg p-6 text-center -rotate-2">
                  <Calendar className="w-8 h-8 text-emerald mx-auto mb-2" />
                  <p className="font-display font-bold text-base">Campus Calendar Ready</p>
                  <p className="text-xs text-ink/70 mt-1">Check back as societies publish their upcoming schedules.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* "Coming Up" — Real Events from DB */}
      <section className="border-t-2 border-ink bg-surface py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald">
                Live University Noticeboard
              </span>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight mt-1">
                Coming up on campus
              </h2>
            </div>
            <Link href="/events" className="text-sm font-bold text-emerald hover:underline flex items-center gap-1">
              View all campus events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="p-12 text-center bg-paper border-2 border-dashed border-ink/40 rounded-[18px]">
              <p className="font-display font-bold text-lg text-ink">No upcoming events published right now.</p>
              <p className="text-sm text-ink/70 mt-1">Presidents are drafting proposals for university approval.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wide Featured Ticket (Marigold or Emerald Color Block) */}
              {featuredEvent && (
                <Card variant="featured" colorBlock="marigold" className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-ink text-paper text-xs font-bold rounded-full border border-ink">
                          {featuredEvent.society.name}
                        </span>
                        <Badge variant="upcoming">{featuredEvent.scheduleStatus}</Badge>
                      </div>

                      <h3 className="font-display font-extrabold text-2xl md:text-4xl text-ink tracking-tight">
                        {featuredEvent.title}
                      </h3>

                      <p className="text-sm md:text-base text-ink/85 line-clamp-2">
                        {featuredEvent.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm font-bold text-ink">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-ink" /> {fmtPKT(featuredEvent.startAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-ink" /> {featuredEvent.venue}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t-2 lg:border-t-0 lg:border-l-2 border-ink pt-4 lg:pt-0 lg:pl-8 flex-shrink-0">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider block text-ink/70">
                          Live Availability
                        </span>
                        <span className="font-display font-extrabold text-2xl text-ink">
                          {featuredEvent.seatsRemaining} seats left
                        </span>
                      </div>

                      <Link href={`/events/${featuredEvent.id}`}>
                        <Button variant="primary" size="lg">
                          Register for Event
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}

              {/* Compact Rows for remaining events */}
              {remainingEvents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {remainingEvents.map((e) => (
                    <Card
                      key={e.id}
                      variant="surface"
                      className="p-5 flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-ink/60 mb-2">
                          <span>{e.society.name}</span>
                          <span className="px-2 py-0.5 bg-marigold/30 border border-ink text-ink rounded-full">
                            {e.seatsRemaining} seats left
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-lg text-ink line-clamp-1">
                          {e.title}
                        </h4>
                        <p className="text-xs text-ink/70 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky" /> {fmtPKT(e.startAt)}
                        </p>
                        <p className="text-xs text-ink/70 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose" /> {e.venue}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t-2 border-mist flex justify-end">
                        <Link href={`/events/${e.id}`}>
                          <Button size="sm" variant="secondary">
                            View Notice →
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Asymmetric 5/4/3 Column Split Role Panels (Emerald / Marigold / Ink) */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Panel 1: Students (5 cols - Emerald) */}
          <div className="md:col-span-5 bg-emerald text-white border-2 border-ink rounded-[18px] p-8 shadow-hard-lg flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-white text-emerald flex items-center justify-center font-bold mb-4 border border-ink">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-white tracking-tight">
                Students find it
              </h3>
              <p className="text-white/90 text-sm mt-3 leading-relaxed">
                Browse every verified student society across technology, arts, and sports. Claim seats with concurrency-safe reservations and track volunteer hours on Kanban boards.
              </p>
            </div>
            <div className="mt-6">
              <Link href="/events">
                <Button variant="marigold" size="sm">
                  Explore Noticeboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Panel 2: Organizers (4 cols - Marigold) */}
          <div className="md:col-span-4 bg-marigold text-ink border-2 border-ink rounded-[18px] p-8 shadow-hard-lg flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center font-bold mb-4 border border-ink">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-ink tracking-tight">
                Organizers run it
              </h3>
              <p className="text-ink/80 text-sm mt-3 leading-relaxed">
                Presidents manage members, recruit accepted student volunteers, and track itemized expenses strictly within approved budgets.
              </p>
            </div>
            <div className="mt-6">
              <Link href="/signup">
                <Button variant="secondary" size="sm">
                  Register Society
                </Button>
              </Link>
            </div>
          </div>

          {/* Panel 3: University (3 cols - Ink) */}
          <div className="md:col-span-3 bg-ink text-paper border-2 border-ink rounded-[18px] p-8 shadow-hard-lg flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center font-bold mb-4 border border-paper/30">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-paper tracking-tight">
                The university sees it
              </h3>
              <p className="text-paper/80 text-sm mt-3 leading-relaxed">
                Centralized administration dashboard for single-click event review, financial accountability, and live attendance metrics.
              </p>
            </div>
            <div className="mt-6">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-paper border-paper/30 hover:bg-white/10">
                  Admin Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper py-8 text-center text-xs text-ink/70">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-semibold">
            UniSphere &copy; {new Date().getFullYear()} — Campus Society & Event Noticeboard.
          </p>
          <div className="flex gap-4 font-bold text-ink">
            <Link href="/events" className="hover:underline">Noticeboard</Link>
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/signup" className="hover:underline">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
