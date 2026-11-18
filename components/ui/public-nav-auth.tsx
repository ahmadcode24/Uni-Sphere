"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicNavAuth() {
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/events">
          <Button variant="ghost" size="sm">
            Browse events
          </Button>
        </Link>
      </div>
    );
  }

  if (user) {
    const dashboardHref =
      user.role === "PRESIDENT"
        ? "/president"
        : user.role === "ADMIN"
        ? "/admin"
        : "/student";

    return (
      <div className="flex items-center gap-2">
        <Link href="/events">
          <Button variant="ghost" size="sm">
            Browse events
          </Button>
        </Link>
        <Link href={dashboardHref}>
          <Button variant="primary" size="sm">
            Dashboard
          </Button>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-paper hover:bg-rose hover:text-white text-ink border-2 border-ink rounded-[10px] shadow-hard-sm text-xs font-bold transition-all active:translate-y-0.5"
          title="Log out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    );
  }

  return (
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
  );
}

