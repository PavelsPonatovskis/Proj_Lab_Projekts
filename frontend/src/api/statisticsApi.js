const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:5000";

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchStatistics({ includeDeleted = true } = {}) {
  const url = new URL(`${API_BASE}/api/routes/stats`);
  url.searchParams.set("scope", includeDeleted ? "all" : "active");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load statistics (${res.status})`);
  }

  return res.json();
}
