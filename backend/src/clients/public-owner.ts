export type PublicOwner = {
  name: string;
  city: string;
  profession: string;
  picUrl: string | null;
};

function lastPlace(raw?: string | null) {
  const parts = String(raw || '')
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] || '';
  return last.length >= 2 && last.length <= 40 ? last : '';
}

/** Safe snapshot for the public catalog. Never includes NID, phone, email, or street address. */
export function toPublicOwner(client: any): PublicOwner | null {
  const name = String(client?.name || '').trim();
  if (!name) return null;
  const city =
    String(client?.city || '').trim() || lastPlace(client?.address) || lastPlace(client?.permanentAddress);
  const profession = String(client?.profession || '').trim();
  const picUrl = String(client?.picUrl || '').trim() || null;
  return { name, city, profession, picUrl };
}
