"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Save, PlusCircle, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SOCIETY_CATEGORIES } from "@/lib/services/society";

export default function PresidentSocietyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [society, setSociety] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Technology",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch("/api/auth/me");
        if (!userRes.ok) {
          router.push("/login");
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        const societyRes = await fetch("/api/societies?my=true");
        if (societyRes.ok) {
          const sData = await societyRes.json();
          if (sData.society) {
            setSociety(sData.society);
            setFormData({
              name: sData.society.name,
              description: sData.society.description,
              category: sData.society.category,
              contactEmail: sData.society.contactEmail,
              contactPhone: sData.society.contactPhone || "",
            });
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load society data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const url = society ? `/api/societies/${society.id}` : "/api/societies";
      const method = society ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save society");
      }

      setSociety(data.society);
      setSuccess(society ? "Society profile updated successfully!" : "Society created successfully!");
    } catch (err: any) {
      setError(err.message || "Error saving society");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AppShell role="PRESIDENT" user={user} title={society ? "Society Profile" : "Register Society"}>
      <div className="max-w-3xl mx-auto">
        {/* Header Banner */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-emerald text-white rounded-[10px] border-2 border-ink shadow-hard-sm">
              <Building2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
                {society ? "Manage Society Profile" : "Society Onboarding"}
              </h2>
              <p className="text-sm text-ink/70">
                {society
                  ? "Update your official society details visible to students across campus."
                  : "Every president manages exactly one official campus society. Register yours below."}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald text-white text-sm font-semibold rounded-[12px] border-2 border-ink shadow-hard-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card */}
        <Card variant="surface" className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Official Society Name"
              type="text"
              placeholder="e.g. ACM Student Chapter"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              helper="Must be unique across the university noticeboard."
            />

            <Select
              label="Society Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {SOCIETY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>

            <Textarea
              label="About the Society"
              placeholder="Describe your society's charter, mission, and activities for student members..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Official Contact Email"
                type="email"
                placeholder="society@unisphere.test"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
              />

              <Input
                label="Contact Phone / WhatsApp Link (Optional)"
                type="text"
                placeholder="+92 300 1234567"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t-2 border-mist flex justify-end">
              <Button type="submit" variant="primary" size="lg" disabled={saving}>
                {saving ? (
                  "Saving..."
                ) : society ? (
                  <>
                    <Save className="w-5 h-5 mr-1" /> Save Changes
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5 mr-1" /> Create Society
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

