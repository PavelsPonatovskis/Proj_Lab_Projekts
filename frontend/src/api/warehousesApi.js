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

export async function fetchWarehouses() {
  const token = localStorage.getItem("token");

  const res = await fetch(apiUrl("/api/routes/warehouses"), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `Failed to fetch warehouses (${res.status})`);
  }

  if (!text || !text.trim()) return [];
  try {
    const data = JSON.parse(text);
    return data?.items || data || [];
  } catch {
    return [];
  }
}
