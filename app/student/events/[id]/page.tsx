"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKT } from "@/lib/time";
import { useLive } from "@/lib/use-live";

export default function StudentEventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [eventData, setEventData] = useState<any>(null);
  const [caps, setCaps] = useState<any>(null);
  const [myRegistration, setMyRegistration] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [seatsRemaining, setSeatsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        if (!uRes.ok) {
          router.push("/login");
          return;
        }
        const uData = await uRes.json();
        setUser(uData.user);
      } catch {
        router.push("/login");
        return;
      }

      await loadEvent();
      setLoading(false);
    }
    checkAuth();
  }, [params.id, router]);

  const handleRegister = async () => {
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
    if (!confirm("Are you sure you want to cancel your seat registration for this event?")) {
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

      setMyRegistration((prev: any) => ({ ...prev, status: "CANCELLED" }));
      setSeatsRemaining(data.seatsRemaining);
      setMessage("Your registration has been cancelled.");
    } catch (err: any) {
      setError(err.message || "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="font-display font-extrabold text-2xl text-ink">Event notice not found</h2>
        <p className="text-sm text-ink/70 mt-2">
          This event may be pending review, cancelled, or does not exist.
        </p>
        <Link href="/student/events" className="mt-4 inline-block">
          <Button variant="primary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Return to Campus Notices
          </Button>
        </Link>
      </div>
    );
  }

  const isRegistered = myRegistration?.status === "REGISTERED";
  const isFull = seatsRemaining <= 0;
  const canRegister = caps?.canRegister && !isRegistered && !isFull;

  return (
    <AppShell role="STUDENT" user={user} title={eventData.title}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/student/events"
            className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to all events
          </Link>
        </div>

        {/* Success Alert */}
        {message && (
          <div className="p-3.5 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Event Card */}
        <Card variant="surface" className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/student/societies/${eventData.society?.id}`}
                  className="text-xs font-bold text-ink/80 px-2.5 py-0.5 bg-paper rounded border border-ink/30 hover:underline"
                >
                  {eventData.society?.name}
                </Link>
                <Badge variant="upcoming">{eventData.society?.category}</Badge>
                {isRegistered && (
                  <Badge variant="approved">
                    <CheckCircle className="w-3 h-3 mr-1 inline" /> You Are Registered
                  </Badge>
                )}
              </div>

              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-ink tracking-tight">
                {eventData.title}
              </h1>
            </div>

            {/* Live Seats Left Badge */}
            <div className="flex-shrink-0">
              <Badge variant={seatsRemaining > 0 ? "seats" : "rejected"}>
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {seatsRemaining > 0 ? `${seatsRemaining} SEATS LEFT` : "EVENT FULL"}
              </Badge>
            </div>
          </div>

          <p className="text-ink/85 text-base md:text-lg leading-relaxed whitespace-pre-line">
            {eventData.description}
          </p>

          {/* Logistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-paper rounded-[14px] border-2 border-ink">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Date & Time (PKT)
              </span>
              <p className="font-display font-bold text-base text-ink">
                {fmtPKT(eventData.startAt)}
              </p>
              <p className="text-xs text-ink/70">Until {fmtPKT(eventData.endAt)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose" /> Location
              </span>
              <p className="font-display font-bold text-base text-ink">
                {eventData.venue}
              </p>
              <p className="text-xs text-ink/70">
                Registration Deadline: {fmtPKT(eventData.registrationDeadline)}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t-2 border-mist flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-ink/70">
              Total Venue Capacity: <strong>{eventData.capacity} students</strong>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isRegistered ? (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="text-xs font-bold text-emerald flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Seat Reserved
                  </div>
                  <Button
                    variant="rose"
                    size="md"
                    disabled={actionLoading}
                    onClick={handleCancelRegistration}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Cancel Seat
                  </Button>
                </div>
              ) : canRegister ? (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={actionLoading}
                  onClick={handleRegister}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? "Securing Seat..." : "Register to Attend"}
                </Button>
              ) : isFull ? (
                <Button variant="secondary" size="lg" disabled className="w-full sm:w-auto">
                  Event Full
                </Button>
              ) : (
                <Button variant="secondary" size="lg" disabled className="w-full sm:w-auto">
                  Registration Closed
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

