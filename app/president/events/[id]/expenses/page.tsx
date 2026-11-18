"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  PlusCircle,
  ArrowLeft,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPKTDateOnly } from "@/lib/time";

export default function EventExpensesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    amount: "",
    note: "",
    spentOn: new Date().toISOString().slice(0, 16),
  });

  const loadData = async () => {
    try {
      const [uRes, eRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/events/${params.id}/expenses`),
      ]);

      if (!uRes.ok) {
        router.push("/login");
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (!eRes.ok) throw new Error("Failed to load expenses");
      const eData = await eRes.json();
      setExpenseData(eData);
    } catch (err: any) {
      setError(err.message || "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${params.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record expense");

      setForm({
        title: "",
        amount: "",
        note: "",
        spentOn: new Date().toISOString().slice(0, 16),
      });
      setMessage("Expense recorded against approved allocation!");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Expense submission rejected");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete expense");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { event, expenses, approvedBudget, totalSpent, remaining, isOverBudget } = expenseData || {
    expenses: [],
    approvedBudget: 0,
    totalSpent: 0,
    remaining: 0,
    isOverBudget: false,
  };

  const isApprovedEvent = event?.approvalStatus === "APPROVED" && !event?.isCancelled;

  return (
    <AppShell role="PRESIDENT" user={user} title={`Expenses — ${event?.title}`}>
      <div className="space-y-6">
        {/* Back Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={`/president/events/${params.id}`}
            className="inline-flex items-center text-xs font-bold text-ink/70 hover:text-ink hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Event Management
          </Link>

          <a
            href={`/api/events/${params.id}/report.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-auto"
          >
            <Button variant="secondary" size="sm">
              <FileText className="w-4 h-4 mr-1 text-emerald" /> Download PDF Expense Report
            </Button>
          </a>
        </div>

        {message && (
          <div className="p-3.5 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card variant="surface" className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-1">
              Approved Allocation
            </span>
            <span className="font-display font-extrabold text-3xl text-emerald">
              Rs {approvedBudget.toLocaleString()}
            </span>
            <p className="text-xs text-ink/60 mt-1">Admin sanctioned cap</p>
          </Card>

          <Card variant="surface" className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-1">
              Total Spent
            </span>
            <span className="font-display font-extrabold text-3xl text-ink">
              Rs {totalSpent.toLocaleString()}
            </span>
            <p className="text-xs text-ink/60 mt-1">{expenses.length} itemized receipts</p>
          </Card>

          <Card
            variant="surface"
            className={`p-5 border-2 ${isOverBudget ? "bg-rose/10 border-rose" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-1">
                Remaining Balance
              </span>
              {isOverBudget && (
                <Badge variant="rejected" className="text-[10px]">
                  Over budget
                </Badge>
              )}
            </div>
            <span
              className={`font-display font-extrabold text-3xl ${
                isOverBudget ? "text-rose" : "text-sky"
              }`}
            >
              Rs {remaining.toLocaleString()}
            </span>
            <p className="text-xs text-ink/60 mt-1">
              {isOverBudget
                ? "Locked: All new expenses blocked"
                : "Available to record receipts"}
            </p>
          </Card>
        </div>

        {/* Lock Notice if Not Approved */}
        {!isApprovedEvent && (
          <div className="p-4 bg-marigold/20 border-2 border-ink rounded-[14px] flex items-center gap-3">
            <Lock className="w-5 h-5 text-ink flex-shrink-0" />
            <p className="text-xs text-ink font-semibold">
              Notice: Expenses can only be logged once an event has been officially Approved by administration and is not cancelled.
            </p>
          </div>
        )}

        {/* Record Expense Form (if allowed) */}
        {isApprovedEvent && (
          <Card variant="surface" className="p-6">
            <h3 className="font-display font-bold text-lg text-ink mb-4 pb-2 border-b-2 border-mist flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald" /> Log New Expense Receipt
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Expense Title / Item"
                  placeholder="e.g. Stage Sound & Mic Rental"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />

                <Input
                  label="Amount (PKR)"
                  type="number"
                  min={1}
                  placeholder="e.g. 15000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  helper={`Max allowed: Rs ${Math.max(0, remaining).toLocaleString()}`}
                />

                <Input
                  label="Date of Expense (PKT)"
                  type="datetime-local"
                  value={form.spentOn}
                  onChange={(e) => setForm({ ...form, spentOn: e.target.value })}
                  required
                />
              </div>

              <Textarea
                label="Vendor & Invoice Note (Optional)"
                placeholder="Vendor name, receipt voucher number, or justification..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={actionLoading || isOverBudget || remaining <= 0}
                >
                  {actionLoading ? "Submitting..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Receipts Table */}
        <Card variant="surface" className="p-6">
          <h3 className="font-display font-bold text-lg text-ink mb-4 pb-2 border-b-2 border-mist">
            Itemized Receipts
          </h3>

          {expenses.length === 0 ? (
            <p className="text-sm text-center py-8 text-ink/60">No expenses recorded for this event yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs uppercase font-extrabold text-ink/70">
                    <th className="py-2.5">Item Title</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Note</th>
                    <th className="py-2.5 text-right">Amount (PKR)</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist font-medium">
                  {expenses.map((exp: any) => (
                    <tr key={exp.id}>
                      <td className="py-3 font-bold text-ink">{exp.title}</td>
                      <td className="py-3 text-xs text-ink/70">{fmtPKTDateOnly(exp.spentOn)}</td>
                      <td className="py-3 text-xs text-ink/60">{exp.note || "—"}</td>
                      <td className="py-3 text-right font-bold text-ink">
                        Rs {exp.amount.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-ink/40 hover:text-rose p-1 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

