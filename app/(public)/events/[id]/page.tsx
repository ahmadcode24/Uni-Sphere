"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKT } from "@/lib/time";
import { useLive } from "@/lib/use-live";

export default function PublicEventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [eventData, setEventData] = useState<any>(null);
  const [caps, setCaps] = useState<any>(null);
  const [myRegistration, setMyRegistration] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [seatsRemaining, setSeatsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const registerBtnRef = useRef<HTMLButtonElement>(null);

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/events/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setEventData(null);
          return;
        }
        throw new Error("Failed to load event");
      }

      const data = await res.json();
      setEventData(data.event);
      setCaps(data.caps);
      setMyRegistration(data.myRegistration);
      setSeatsRemaining(data.event.seatsRemaining);
    } catch (err: any) {
      setError(err.message || "Failed to load event");
    }
  };

  const { data: liveData } = useLive<{
    event: any;
    caps: any;
    myRegistration: any;
    isOwner: boolean;
  }>(params.id ? `/api/events/${params.id}` : null, 3000);

  useEffect(() => {
    if (liveData?.event) {
      setEventData(liveData.event);
      setCaps(liveData.caps);
      setMyRegistration(liveData.myRegistration);
      setSeatsRemaining(liveData.event.seatsRemaining);
      setLoading(false);
    }
  }, [liveData]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const uRes = await fetch("/api/auth/me");
        if (uRes.ok) {
          const uData = await uRes.json();
          setUser(uData.user);
        }
      } catch {
        // logged out is allowed
      }

      await loadEvent();
      setLoading(false);

      if (registerBtnRef.current) {
        registerBtnRef.current.focus();
      }
    }
    checkAuth();
  }, [params.id]);

  const handleRegister = async () => {
    if (!user) {
      // Preserve next URL and redirect to login
      router.push(`/login?next=/events/${params.id}`);
      return;
    }

    if (user.role !== "STUDENT") {
      alert("Only students can register as attendees for events.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${params.id}/register`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete registration");
      }

      setMyRegistration(data.registration);
      setSeatsRemaining(data.seatsRemaining);
      setMessage("Seat confirmed! You are registered for this event.");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!confirm("Are you sure you want to cancel your registration? Your seat will be freed.")) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${params.id}/unregister`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel registration");
      }

      setMyRegistration({ ...myRegistration, status: "CANCELLED" });
      setSeatsRemaining(data.seatsRemaining);
      setMessage("Registration cancelled. Your seat has been released.");
    } catch (err: any) {
      setError(err.message || "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-mist border-2 border-ink flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose" />
        </div>
        <h1 className="font-display font-extrabold text-2xl text-ink">
          Notice Unavailable or Not Found
        </h1>
        <p className="text-sm text-ink/70 max-w-md mt-2">
          This event may be in Draft, pending university approval, or has been cancelled by the organizers.
        </p>
        <Link href="/events" className="mt-6">
          <Button variant="secondary">Browse Available Notices</Button>
        </Link>
      </div>
    );
  }

  const isRegistered = myRegistration && myRegistration.status === "REGISTERED";
  const isFull = seatsRemaining <= 0;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Top Header */}
      <header className="border-b-2 border-ink bg-surface sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-extrabold text-2xl tracking-tight text-ink">
              Uni<span className="text-emerald">Sphere</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/events">
              <Button variant="ghost" size="sm">
                ← Noticeboard
              </Button>
            </Link>
            {!user ? (
              <Link href={`/login?next=/events/${params.id}`}>
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
            ) : (
              <Link href={user.role === "PRESIDENT" ? "/president" : user.role === "ADMIN" ? "/admin" : "/student"}>
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto p-4 md:p-8 flex-1">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/events"
            className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Noticeboard
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Event Paper Notice Container */}
        <Card variant="surface" className="p-6 md:p-10 space-y-8">
          {/* Top Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-mist">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-ink text-paper font-bold text-xs rounded-full border border-ink">
                {eventData.society.name}
              </span>
              <Badge variant="upcoming">{eventData.society.category}</Badge>
              <Badge variant={caps.scheduleStatus === "ONGOING" ? "ongoing" : "upcoming"}>
                {caps.scheduleStatus}
              </Badge>
            </div>

            {/* Live Seats Left Sticker */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
                Live Capacity:
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold border-2 border-ink shadow-hard-sm transition-all ${
                  isFull ? "bg-rose text-white" : "bg-marigold text-ink animate-pulse"
                }`}
              >
                {isFull ? "FULL (0 SEATS)" : `${seatsRemaining} SEATS LEFT`}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl text-ink tracking-tight leading-tight">
              {eventData.title}
            </h1>
            <p className="text-ink/80 text-base md:text-lg mt-4 leading-relaxed whitespace-pre-line">
              {eventData.description}
            </p>
          </div>

          {/* Key Event Logistics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-paper border-2 border-ink rounded-[14px] shadow-hard-sm">
            <div>
              <span className="text-xs font-bold text-ink/60 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald" /> Date & Time
              </span>
              <p className="font-bold text-sm text-ink mt-1">
                {fmtPKT(eventData.startAt)}
              </p>
              <p className="text-xs text-ink/70">to {fmtPKT(eventData.endAt)}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-ink/60 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose" /> Location / Venue
              </span>
              <p className="font-bold text-sm text-ink mt-1">{eventData.venue}</p>
              <p className="text-xs text-ink/70">Main Campus</p>
            </div>

            <div>
              <span className="text-xs font-bold text-ink/60 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky" /> Registration Deadline
              </span>
              <p className="font-bold text-sm text-ink mt-1">
                {fmtPKT(eventData.registrationDeadline)}
              </p>
              <p className="text-xs text-ink/70">Capacity: {eventData.capacity} students</p>
            </div>
          </div>

          {/* Registration Action Section */}
          <div className="pt-6 border-t-2 border-mist flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {isRegistered ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald" />
                  <span className="font-display font-bold text-base text-emerald">
                    You have a confirmed reservation for this event.
                  </span>
                </div>
              ) : isFull ? (
                <p className="text-sm font-semibold text-rose">
                  Registration closed: All {eventData.capacity} seats are currently reserved.
                </p>
              ) : !caps.canRegister ? (
                <p className="text-sm font-semibold text-ink/70">
                  Registration is currently closed for this notice.
                </p>
              ) : (
                <p className="text-sm font-medium text-ink/75">
                  Free registration for university students. Instant confirmation.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isRegistered ? (
                <Button
                  variant="rose"
                  size="md"
                  disabled={actionLoading}
                  onClick={handleCancelRegistration}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Cancel Reservation
                </Button>
              ) : (
                <Button
                  ref={registerBtnRef}
                  variant="primary"
                  size="lg"
                  disabled={actionLoading || isFull || !caps.canRegister}
                  onClick={handleRegister}
                  className="min-w-[180px]"
                >
                  {actionLoading
                    ? "Reserving..."
                    : isFull
                    ? "Event Full"
                    : !user
                    ? "Sign in to Register"
                    : "Register Seat"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

