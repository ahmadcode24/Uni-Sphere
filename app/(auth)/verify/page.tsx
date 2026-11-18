"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, RotateCw, Terminal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 60-second countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle single digit change
  const handleChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }

    const char = cleanValue.slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);

    // Auto advance
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setDigits(updated);

    const nextFocusIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const fullCode = digits.join("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode, next }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Extract attempts remaining if present
        const match = data.error?.match(/(\d+)\s+attempts?\s+remaining/i);
        if (match) {
          setAttemptsLeft(parseInt(match[1]));
        } else if (data.error?.includes("Maximum wrong attempts exceeded")) {
          setAttemptsLeft(0);
        }
        throw new Error(data.error || "Verification failed");
      }

      // Success
      router.push(data.redirect || "/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      setCountdown(60);
      setAttemptsLeft(null);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border-2 border-ink rounded-[20px] shadow-hard-xl p-8 text-left">
      {/* Header */}
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-marigold text-ink font-bold text-xs rounded-full border border-ink shadow-hard-sm mb-3">
          Two-Factor Authentication
        </span>
        <h1 className="font-display font-extrabold text-3xl text-ink tracking-tight">
          Enter code
        </h1>
        <p className="text-sm text-ink/70 mt-1">
          A 6-digit one-time code has been generated for your session.
        </p>
      </div>

      {/* Terminal Callout Notice */}
      <div className="mb-5 p-3.5 bg-ink text-paper rounded-[12px] border-2 border-ink shadow-hard-sm flex items-start gap-3">
        <Terminal className="w-5 h-5 text-marigold flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-marigold uppercase tracking-wider">Server Terminal Notice:</p>
          <p className="text-paper/80 mt-0.5">
            Look at the terminal running the dev server to see your code:
          </p>
          <code className="block mt-1 font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded text-white">
            [OTP] user@... -&gt; 123456
          </code>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose text-white text-sm font-semibold rounded-[10px] border-2 border-ink shadow-hard-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            {attemptsLeft !== null && attemptsLeft > 0 && (
              <p className="text-xs font-bold mt-1 text-white/90">
                ⚠️ {attemptsLeft} {attemptsLeft === 1 ? "attempt" : "attempts"} remaining before code is locked.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 6 Digit Input Boxes */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              autoFocus={idx === 0}
              className="w-12 h-14 text-center font-display font-extrabold text-2xl bg-surface text-ink border-2 border-ink rounded-[10px] shadow-hard-sm focus:outline-none focus:border-emerald focus:bg-mist/30 transition-all"
            />
          ))}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading || fullCode.length !== 6}
          className="w-full"
        >
          {loading ? "Verifying..." : "Verify & Sign In"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      {/* Resend Cooldown Section */}
      <div className="mt-6 pt-5 border-t-2 border-mist flex items-center justify-between">
        <span className="text-xs text-ink/70 font-semibold">Didn&apos;t get a code?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className={`text-xs font-bold px-3 py-1.5 rounded-[8px] border-2 border-ink transition-all flex items-center gap-1.5 ${
            countdown > 0 || resending
              ? "bg-mist text-ink/40 cursor-not-allowed shadow-none"
              : "bg-surface hover:bg-mist text-ink shadow-hard-sm"
          }`}
        >
          <RotateCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
          {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
        </button>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-xs font-bold text-ink/60 hover:text-ink hover:underline"
        >
          ← Return to login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      {/* Brand Logo Header */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="font-display font-extrabold text-3xl tracking-tight text-ink">
          Uni<span className="text-emerald">Sphere</span>
        </span>
      </Link>

      <Suspense fallback={<div className="p-8 font-bold">Loading...</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
