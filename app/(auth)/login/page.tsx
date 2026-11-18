"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, Lock, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Email or password is incorrect.");
      }

      const verifyUrl = next ? `/verify?next=${encodeURIComponent(next)}` : "/verify";
      router.push(verifyUrl);
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="w-full max-w-md bg-surface border-2 border-ink rounded-[20px] shadow-hard-xl p-8 text-left">
      {/* Header */}
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-marigold text-ink font-bold text-xs rounded-full border border-ink shadow-hard-sm mb-3">
          Campus Noticeboard Access
        </span>
        <h1 className="font-display font-extrabold text-3xl text-ink tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-ink/70 mt-1">
          Enter your credentials to receive a 6-digit terminal verification code.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose text-white text-sm font-semibold rounded-[10px] border-2 border-ink shadow-hard-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="University Email"
          type="email"
          placeholder="your.id@unisphere.test"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
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
          {loading ? "Verifying..." : "Continue to Verification"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      {/* Quick Demo Credentials */}
      <div className="mt-8 pt-5 border-t-2 border-mist">
        <p className="text-xs font-bold text-ink/60 uppercase tracking-wider mb-2.5">
          Judge / Demo Quick Fill:
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillDemo("admin@unisphere.test", "Admin@12345")}
            className="px-2 py-1.5 bg-paper hover:bg-mist text-ink text-xs font-bold rounded-[8px] border-2 border-ink shadow-hard-sm transition-all"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => fillDemo("president1@unisphere.test", "Pass@12345")}
            className="px-2 py-1.5 bg-paper hover:bg-mist text-ink text-xs font-bold rounded-[8px] border-2 border-ink shadow-hard-sm transition-all"
          >
            President
          </button>
          <button
            type="button"
            onClick={() => fillDemo("student1@unisphere.test", "Pass@12345")}
            className="px-2 py-1.5 bg-paper hover:bg-mist text-ink text-xs font-bold rounded-[8px] border-2 border-ink shadow-hard-sm transition-all"
          >
            Student
          </button>
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-6 text-center text-sm text-ink/75 font-medium">
        Don&apos;t have an account yet?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-bold text-emerald underline hover:text-ink transition-colors"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      {/* Brand Logo Header */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="font-display font-extrabold text-3xl tracking-tight text-ink">
          Uni<span className="text-emerald">Sphere</span>
        </span>
      </Link>

      <Suspense fallback={<div className="p-8 font-bold">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

