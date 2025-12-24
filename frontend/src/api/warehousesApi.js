const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:5000";

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchWarehouses() {
  const res = await fetch(`${API_BASE}/api/routes/warehouses`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load warehouses (${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
}
