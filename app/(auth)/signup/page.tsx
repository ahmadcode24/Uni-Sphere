"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, UserCheck, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "PRESIDENT">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      const verifyUrl = next ? `/verify?next=${encodeURIComponent(next)}` : "/verify";
      router.push(verifyUrl);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border-2 border-ink rounded-[20px] shadow-hard-xl p-8 text-left">
      {/* Header */}
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-sky text-ink font-bold text-xs rounded-full border border-ink shadow-hard-sm mb-3">
          Join the Noticeboard
        </span>
        <h1 className="font-display font-extrabold text-3xl text-ink tracking-tight">
          Create account
        </h1>
        <p className="text-sm text-ink/70 mt-1">
          Sign up as a Student or Society President to discover and organize campus activities.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose text-white text-sm font-semibold rounded-[10px] border-2 border-ink shadow-hard-sm">
          {error}
        </div>
      )}

      {/* Role Switcher */}
      <div className="mb-5">
        <label className="font-semibold text-sm text-ink block mb-1.5">
          Select Your Campus Role
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("STUDENT")}
            className={`p-3 rounded-[10px] border-2 border-ink font-display font-bold text-sm text-center flex flex-col items-center gap-1 transition-all ${
              role === "STUDENT"
                ? "bg-marigold text-ink shadow-hard translate-x-[-1px] translate-y-[-1px]"
                : "bg-paper text-ink/75 hover:bg-mist shadow-hard-sm"
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span>Student / Supervisor</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("PRESIDENT")}
            className={`p-3 rounded-[10px] border-2 border-ink font-display font-bold text-sm text-center flex flex-col items-center gap-1 transition-all ${
              role === "PRESIDENT"
                ? "bg-marigold text-ink shadow-hard translate-x-[-1px] translate-y-[-1px]"
                : "bg-paper text-ink/75 hover:bg-mist shadow-hard-sm"
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>Society President</span>
          </button>
        </div>
        <p className="text-[11px] text-ink/65 mt-2">
          {role === "STUDENT" ? (
            <span>
              ℹ️ <strong>Track Supervisors:</strong> Register here with your email as a student. Society Presidents can designate you as supervisor for festival tracks.
            </span>
          ) : (
            <span>
              ℹ️ <strong>Society Presidents:</strong> Lead your society, submit proposals, host mega events, and appoint student supervisors.
            </span>
          )}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="e.g. Taha Khan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="University Email"
          type="email"
          placeholder="your.id@university.edu.pk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password (min 8 characters)"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full mt-2"
        >
          {loading ? "Creating..." : "Register & Verify"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      {/* Footer link */}
      <div className="mt-6 text-center text-sm text-ink/75 font-medium">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-bold text-emerald underline hover:text-ink transition-colors"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      {/* Brand Logo Header */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="font-display font-extrabold text-3xl tracking-tight text-ink">
          Uni<span className="text-emerald">Sphere</span>
        </span>
      </Link>

      <Suspense fallback={<div className="p-8 font-bold">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}

