export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`http://localhost:4000${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
  });
  return res.json();
}

