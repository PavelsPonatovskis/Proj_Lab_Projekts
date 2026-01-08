const RAW_API_BASE = (process.env.REACT_APP_API_BASE_URL || "").trim();
const API_BASE = RAW_API_BASE.replace(/\/$/, "");

function apiUrl(path) {
  if (!path.startsWith("/")) return API_BASE ? `${API_BASE}/${path}` : `/${path}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}

export async function fetchWarehouses() {
  const res = await fetch(apiUrl("/api/routes/warehouses"));
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
