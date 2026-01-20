"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

type Plan = {
  id: string;
  name: string;
  daysPerMonth: number;
  price: number;
  currency?: "BDT";
  suiteId?: string;
  planStatus?: "Unsold" | "Reserved" | "Booked" | "Resale" | "Transferred";
  planType?: "FULL" | "DPM";
  timeFraction?: number;
};

export default function AdminEditPlanPage({
  params,
}: {
  params: { id: string; planId: string };
}) {
  const suiteId = params.id;
  const planId = params.planId;
  const router = useRouter();
  const [form, setForm] = useState<Partial<Plan>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/timeshares/${planId}`);
      const json = await res.json();
      const p = json?.plan ?? json;
      if (p && p.id) {
        setForm({
          id: p.id,
          name: p.name,
          daysPerMonth: p.daysPerMonth,
          price: p.price,
          currency: p.currency,
          suiteId: p.suiteId ?? suiteId,
          planStatus: p.planStatus,
          planType: p.planType,
          timeFraction: p.timeFraction,
        });
      } else {
        setError("Plan not found");
      }
    } catch {
      setError("Failed to load plan");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const targetId = (form.id ?? planId) as string;
      if ((targetId ?? "").trim().length === 0) {
        setError("Plan ID is required");
        setSaving(false);
        return;
      }
      if (targetId !== planId) {
        const existsRes = await fetch(`${API_URL}/timeshares/${targetId}`);
        const existsJson = await existsRes.json();
        if (existsJson && (existsJson.plan || existsJson.id)) {
          setError("Plan ID already exists");
          setSaving(false);
          return;
        }
        const createRes = await fetch(`${API_URL}/timeshares`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin",
          },
          body: JSON.stringify({
            id: targetId,
            name: form.name,
            daysPerMonth: Number(form.daysPerMonth),
            price: Number(form.price),
            currency: "BDT",
            suiteId: suiteId,
            planType: form.planType ?? "DPM",
            planStatus: form.planStatus ?? "Unsold",
            timeFraction:
              typeof form.timeFraction === "number"
                ? form.timeFraction
                : undefined,
          }),
        });
        const createJson = await createRes.json();
        if (!createJson?.ok) {
          setError(createJson?.error || "Failed to create with new ID");
          setSaving(false);
          return;
        }
        await fetch(`${API_URL}/timeshares/${planId}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer admin" },
        });
        setResult({ ok: true, plan: createJson.plan });
        router.replace(`/admin/units/${suiteId}/plans/${targetId}/edit`);
      } else {
        const res = await fetch(`${API_URL}/timeshares/${planId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer admin",
          },
          body: JSON.stringify({
            name: form.name,
            daysPerMonth: Number(form.daysPerMonth),
            price: Number(form.price),
            planType: form.planType,
            planStatus: form.planStatus,
            timeFraction:
              typeof form.timeFraction === "number"
                ? form.timeFraction
                : undefined,
          }),
        });
        const json = await res.json();
        setResult(json);
      }
    } catch {
      setError("Failed to save plan");
    }
    setSaving(false);
  }

  const derivedShare = (
    (form.timeFraction ?? (form.daysPerMonth ?? 0) / 30) * 100
  ).toFixed(1);

  async function deleteCurrent() {
    setError("");
    const ok =
      typeof window !== "undefined"
        ? window.confirm("Delete this plan?")
        : true;
    if (!ok) return;
    try {
      await fetch(`${API_URL}/timeshares/${planId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer admin" },
      });
      router.replace(`/admin/units/${suiteId}/plans`);
    } catch {
      setError("Failed to delete plan");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">
          Edit Plan
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/admin/units/${suiteId}/plans`}
            className="rounded border border-ocean px-4 py-2 text-ocean"
          >
            Back to Plans
          </Link>
          <button
            onClick={deleteCurrent}
            className="rounded border border-red-600 px-4 py-2 text-red-700"
          >
            Delete Plan
          </button>
        </div>
      </div>
      <p className="mt-3 text-ocean/80">Update plan details.</p>

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={save}
        className="mt-8 space-y-4 rounded-lg border border-gold/30 bg-white p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Plan ID</label>
            <input
              value={form.id ?? planId}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Suite ID</label>
            <input
              value={suiteId}
              disabled
              className="mt-1 w-full rounded border border-ocean/20 bg-ocean/5 px-2 py-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Name</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Days/Month</label>
            <input
              type="number"
              value={form.daysPerMonth ?? 0}
              onChange={(e) =>
                setForm({ ...form, daysPerMonth: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">
              Time Fraction (0–1)
            </label>
            <input
              type="number"
              step="0.001"
              value={form.timeFraction ?? 0}
              onChange={(e) =>
                setForm({ ...form, timeFraction: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Price (BDT)</label>
            <input
              type="number"
              value={form.price ?? 0}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Type</label>
            <select
              value={form.planType ?? "DPM"}
              onChange={(e) =>
                setForm({ ...form, planType: e.target.value as any })
              }
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option value="DPM">DPM</option>
              <option value="FULL">FULL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-ocean">Status</label>
            <select
              value={form.planStatus ?? "Unsold"}
              onChange={(e) =>
                setForm({ ...form, planStatus: e.target.value as any })
              }
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option>Unsold</option>
              <option>Reserved</option>
              <option>Booked</option>
              <option>Resale</option>
              <option>Transferred</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-ocean">Revenue Share (%)</label>
          <div className="mt-1 rounded border border-ocean/20 bg-ocean/5 px-2 py-1 text-ocean/70">
            {derivedShare}%
          </div>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-ocean px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 rounded border border-ocean/20 bg-white p-4 text-sm text-ocean">
          <div>Response:</div>
          <pre className="mt-2 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
