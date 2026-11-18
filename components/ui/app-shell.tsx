"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Menu,
  X,
  Compass,
  Calendar,
  Users,
  CheckSquare,
  DollarSign,
  ShieldAlert,
  Home,
  Check,
} from "lucide-react";
import { useLive } from "@/lib/use-live";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface AppShellProps {
  role: "STUDENT" | "PRESIDENT" | "ADMIN";
  user: {
    name: string;
    email: string;
    role: string;
  };
  title?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ role, user, title, children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);

  // Define nav links by role
  const navItemsByRole: Record<string, NavItem[]> = {
    STUDENT: [
      { label: "Dashboard", href: "/student", icon: <Home className="w-5 h-5" /> },
      { label: "Browse Societies", href: "/student/societies", icon: <Compass className="w-5 h-5" /> },
      { label: "Browse Events", href: "/student/events", icon: <Calendar className="w-5 h-5" /> },
      { label: "My Registrations", href: "/student/registrations", icon: <CheckSquare className="w-5 h-5" /> },
      { label: "Volunteer Invites", href: "/student/invitations", icon: <Users className="w-5 h-5" /> },
      { label: "My Tasks", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
    ],
    PRESIDENT: [
      { label: "Society Dashboard", href: "/president", icon: <Home className="w-5 h-5" /> },
      { label: "Society Profile", href: "/president/society", icon: <Compass className="w-5 h-5" /> },
      { label: "Members", href: "/president/members", icon: <Users className="w-5 h-5" /> },
      { label: "Events & Proposals", href: "/president/events", icon: <Calendar className="w-5 h-5" /> },
    ],
    ADMIN: [
      { label: "Admin Overview", href: "/admin", icon: <ShieldAlert className="w-5 h-5" /> },
      { label: "Event Proposals", href: "/admin/proposals", icon: <Calendar className="w-5 h-5" /> },
      { label: "All Societies", href: "/admin/societies", icon: <Compass className="w-5 h-5" /> },
      { label: "Budget & Metrics", href: "/admin/monitoring", icon: <DollarSign className="w-5 h-5" /> },
    ],
  };

  const navItems = navItemsByRole[role] || [];

  const { data: liveNotifs } = useLive<{ notifications: NotificationItem[] }>("/api/notifications", 3000);

  useEffect(() => {
    if (liveNotifs?.notifications) {
      setNotifications(liveNotifs.notifications);
      const unread = liveNotifs.notifications.filter((n) => !n.readAt).length;
      setUnreadCount(unread);
    }
  }, [liveNotifs]);

  // Close bell on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.readAt) {
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setBellOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink">
      {/* Desktop Left Rail */}
      <aside className="hidden md:flex flex-col w-64 bg-ink text-paper border-r-2 border-ink flex-shrink-0 select-none">
        {/* Brand */}
        <div className="p-6 border-b-2 border-paper/15 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-extrabold text-2xl tracking-tight text-paper">
              Uni<span className="text-marigold">Sphere</span>
            </span>
          </Link>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-marigold/60 text-marigold uppercase tracking-wider">
            {role}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-semibold border-2 transition-all duration-100 ${
                  isActive
                    ? "bg-marigold text-ink border-ink shadow-hard-sm"
                    : "border-transparent text-paper/80 hover:text-paper hover:bg-white/10"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t-2 border-paper/15 bg-black/20 space-y-3">
          <div className="truncate">
            <p className="text-sm font-bold text-paper truncate">{user.name}</p>
            <p className="text-xs text-paper/60 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-paper/10 hover:bg-rose hover:text-white text-paper text-xs font-bold rounded-[8px] border border-paper/20 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-surface border-b-2 border-ink px-4 md:px-8 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 border-2 border-ink rounded-[8px] bg-paper text-ink"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-display font-bold text-xl md:text-2xl text-ink tracking-tight">
              {title || "Noticeboard"}
            </h1>
          </div>

          {/* Right Header items: Bell & User Chip */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(!bellOpen)}
                aria-label={`Notifications (${unreadCount} unread)`}
                className="relative p-2.5 bg-paper hover:bg-mist/60 text-ink border-2 border-ink rounded-[10px] shadow-hard-sm transition-transform active:translate-y-0.5"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-rose text-white text-[11px] font-extrabold flex items-center justify-center rounded-full border-2 border-ink px-1 animate-bounce">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-surface border-2 border-ink rounded-[14px] shadow-hard-xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-mist">
                    <span className="font-display font-bold text-base text-ink">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-emerald hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-center py-6 text-ink/60">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-2.5 rounded-[8px] border border-ink/30 cursor-pointer transition-colors text-left ${
                            !n.readAt ? "bg-mist/40 border-ink font-semibold" : "bg-surface hover:bg-paper"
                          }`}
                        >
                          <p className="text-sm text-ink leading-snug">{n.message}</p>
                          <span className="text-[10px] text-ink/60 block mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Chip */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-paper border-2 border-ink rounded-[10px] shadow-hard-sm">
              <div className="w-7 h-7 rounded-full bg-emerald text-white font-bold text-xs flex items-center justify-center border border-ink">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-ink leading-none">{user.name}</p>
                <p className="text-ink/60 text-[10px] uppercase font-semibold">{role}</p>
              </div>
            </div>

            {/* Header Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-paper hover:bg-rose hover:text-white text-ink border-2 border-ink rounded-[10px] shadow-hard-sm text-xs font-bold transition-all active:translate-y-0.5 group"
              title="Log out of session"
            >
              <LogOut className="w-4 h-4 text-rose group-hover:text-white transition-colors" />
              <span>Log out</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-ink text-paper p-4 border-b-2 border-ink space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-[8px] text-sm font-semibold border-2 ${
                  pathname === item.href
                    ? "bg-marigold text-ink border-ink"
                    : "border-transparent text-paper hover:bg-white/10"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-rose hover:bg-rose/20 border-2 border-rose/30 mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
