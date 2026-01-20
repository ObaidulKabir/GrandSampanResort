"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function AdminEditUnitPage({
  params,
}: {
  params: { id: string };
}) {
  const unitId = params.id;
  const [form, setForm] = useState({
    id: unitId,
    floor: "",
    type: "Standard",
    size: "",
    view: "Sea",
    totalPrice: "",
  } as any);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/suites/${unitId}`);
      const json = await res.json();
      const s = json?.suite ?? json;
      if (s && s.id) {
        setForm({
          id: s.id,
          floor: s.floor,
          type: s.type,
          size: s.size,
          view: s.view,
          totalPrice: s.totalPrice,
        });
      } else {
        setError("Unit not found");
      }
    } catch {
      setError("Failed to load unit");
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
    const res = await fetch(`${API_URL}/suites/${unitId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer admin",
      },
      body: JSON.stringify({
        floor: Number(form.floor),
        type: form.type,
        size: form.size,
        view: form.view,
        totalPrice: Number(form.totalPrice),
      }),
    });
    const json = await res.json();
    setResult(json);
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean">
          Edit Unit
        </h1>
        <Link
          href="/admin/units"
          className="rounded border border-ocean px-4 py-2 text-ocean"
        >
          View Units
        </Link>
      </div>
      <p className="mt-3 text-ocean/80">Update suite details.</p>

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={save}
        className="mt-8 space-y-4 rounded-lg border border-gold/30 bg-white p-6"
      >
        <div>
          <label className="block text-sm text-ocean">Unit ID</label>
          <input
            value={form.id}
            disabled
            className="mt-1 w-full rounded border border-ocean/20 bg-ocean/5 px-2 py-1"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Floor</label>
            <input
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">Category</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option>Standard</option>
              <option>Delux</option>
              <option>Premium</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ocean">Size (sq ft)</label>
            <input
              type="number"
              value={form.size}
              onChange={(e) =>
                setForm({
                  ...form,
                  size: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-ocean">View</label>
            <select
              value={form.view}
              onChange={(e) => setForm({ ...form, view: e.target.value })}
              className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            >
              <option>Sea</option>
              <option>Hill</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-ocean">Price (BDT)</label>
          <input
            type="number"
            value={form.totalPrice}
            onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
            className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
          />
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
