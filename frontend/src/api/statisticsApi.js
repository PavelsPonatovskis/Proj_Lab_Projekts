const RAW_API_BASE = (process.env.REACT_APP_API_BASE_URL || "").trim();
const API_BASE = RAW_API_BASE.replace(/\/$/, "");

function apiUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;

  if (API_BASE) return `${API_BASE}${path}`;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return `http://127.0.0.1:5000${path}`;
    }
  }

  return path;
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchStatistics({ includeDeleted = true } = {}) {
  const url = new URL(apiUrl("/api/routes/stats"));
  url.searchParams.set("scope", includeDeleted ? "all" : "active");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders(),
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(text || `Failed to load statistics (${res.status})`);
  }

  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
