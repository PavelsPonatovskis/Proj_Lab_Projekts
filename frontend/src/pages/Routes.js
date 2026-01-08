
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildRoadRoute } from "../utils/osrm";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import "./Routes.css";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const WAREHOUSES = [
  { id: 1, name: "Warehouse 1", lat: 56.969109, lng: 24.112366 },
  { id: 2, name: "Warehouse 2", lat: 56.939166, lng: 24.055983 },
  { id: 3, name: "Warehouse 3", lat: 56.952044, lng: 24.158705 },
];


const warehouseIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});


function makeNumberedStopIcon(num, variant = "optimized") {
  const extraClass = variant === "baseline" ? "stop-number-badge--baseline" : "";
  return L.divIcon({
    className: "stop-number-icon",
    html: `<div class="stop-number-badge ${extraClass}">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}


function offsetLatLng(lat, lng, dx = 0, dy = 0) {
  return [lat + dy, lng + dx];
}

const ROUTE_COLORS = ["#2563eb", "#16a34a", "#f97316", "#dc2626", "#6366f1", "#059669"];

const formatKm = (meters) => `${(meters / 1000).toFixed(1)} km`;

const formatMin = (seconds) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m} min`;
};

const pct = (base, val) => {
  if (!base || base <= 0) return null;
  return ((base - val) / base) * 100;
};


function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeClientStop(c) {
  const lat = toNum(c?.lat ?? c?.latitude);
  const lng = toNum(c?.lon ?? c?.lng ?? c?.longitude);
  if (lat === null || lng === null) return null;
  return { id: c?.id, lat, lng, label: c?.name ?? "", isWarehouse: false };
}

function getWarehouseById(id) {
  return WAREHOUSES.find((w) => w.id === id) || WAREHOUSES[0];
}


function getTrafficSeconds(section) {
  const t = section?.traffic;
  if (!t || t.error) return null;
  const s = Number(t.traffic_duration);
  return Number.isFinite(s) && s > 0 ? s : null;
}


function bestTimeSeconds(section) {
  return getTrafficSeconds(section) ?? section?.duration ?? null;
}


function buildBaselineStops(route) {
  const wh = WAREHOUSES[0];
  return [
    { id: `wh-${wh.id}`, lat: wh.lat, lng: wh.lng, label: wh.name, isWarehouse: true },
    ...(route.clients || []),
  ];
}


function buildOptimizedStops(route) {
  const opt = route.optimized;
  if (!opt?.order?.length) return null;

  const wh = getWarehouseById(opt.warehouse_id);
  const byId = new Map((route.clients || []).map((c) => [c.id, c]));
  const orderedClients = opt.order.map((id) => byId.get(id)).filter(Boolean);

  return [
    { id: `wh-${wh.id}`, lat: wh.lat, lng: wh.lng, label: wh.name, isWarehouse: true },
    ...orderedClients,
  ];
}


function FitToRoute({ baselineLatLngs, optimizedLatLngs }) {
  const map = useMap();

  useEffect(() => {
    const pts = [...(baselineLatLngs || []), ...(optimizedLatLngs || [])];
    if (!pts || pts.length < 2) return;
    map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
  }, [baselineLatLngs, optimizedLatLngs, map]);

  return null;
}

function Routes() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "user";

  const [routes, setRoutes] = useState([]);
  const [visibleRouteIds, setVisibleRouteIds] = useState([]);
  const [focusedRouteId, setFocusedRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [routeGeometries, setRouteGeometries] = useState({});
  const [routingLoading, setRoutingLoading] = useState({});

  const baselineInFlightRef = useRef(new Set());
  const optimizeInFlightRef = useRef(new Set());

  const inFlightRef = useRef(new Set());
  const watchdogRef = useRef({});

  useEffect(() => {
    fetchRoutes();

  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    navigate("/");
  };

  const authedFetch = (url, options = {}) => {
    const token = localStorage.getItem("token");
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const computeBaseline = async (routeId) => {
    const res = await authedFetch(`http://127.0.0.1:5000/api/routes/${routeId}/baseline`, {
      method: "POST",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`baseline failed (${res.status}) ${txt}`);
    }
    const data = await res.json();
    return data?.route;
  };

  const optimizeRoute = async (routeId) => {
    const res = await authedFetch(`http://127.0.0.1:5000/api/routes/${routeId}/optimize`, {
      method: "POST",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`optimize failed (${res.status}) ${txt}`);
    }
    const data = await res.json();
    return data?.route;
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await authedFetch("http://127.0.0.1:5000/api/routes/");
      if (!res.ok) throw new Error("Failed to fetch routes");
      const data = await res.json();

      const processed = (data.items || []).map((r, index) => {
        const clients = (r.clients || []).map(normalizeClientStop).filter(Boolean);
        return {
          id: r.id,
          name: r.name,
          color: ROUTE_COLORS[index % ROUTE_COLORS.length],
          clients,
          baseline: r.baseline ?? null,
          optimized: r.optimized ?? null,
        };
      });

      inFlightRef.current.clear();
      Object.values(watchdogRef.current).forEach((t) => clearTimeout(t));
      watchdogRef.current = {};

      setRoutes(processed);
      setVisibleRouteIds(processed.map((r) => r.id));
      setFocusedRouteId(processed[0]?.id || null);

      setRouteGeometries({});
      setRoutingLoading({});


      const missingBaseline = processed.filter((r) => !r.baseline);
      for (const r of missingBaseline) {
        if (baselineInFlightRef.current.has(r.id)) continue;
        baselineInFlightRef.current.add(r.id);
        try {
          const updated = await computeBaseline(r.id);
          setRoutes((prev) =>
            prev.map((x) =>
              x.id === r.id ? { ...x, baseline: updated?.baseline ?? x.baseline } : x
            )
          );
        } catch (e) {
          console.warn("Baseline compute failed for route:", r.id, e);
        } finally {
          baselineInFlightRef.current.delete(r.id);
        }
      }
    } catch (e) {
      console.error(e);
      setError("❌ Failed to fetch routes.");
    } finally {
      setLoading(false);
    }
  };

  const deleteRoute = async (routeId, routeName) => {
    const ok = window.confirm(`Delete route "${routeName}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await authedFetch(`http://127.0.0.1:5000/api/routes/${routeId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed (${res.status}) ${txt}`);
      }

      inFlightRef.current.delete(routeId);
      if (watchdogRef.current[routeId]) {
        clearTimeout(watchdogRef.current[routeId]);
        delete watchdogRef.current[routeId];
      }

      setRouteGeometries((prev) => {
        const copy = { ...prev };
        delete copy[routeId];
        return copy;
      });
      setRoutingLoading((prev) => {
        const copy = { ...prev };
        delete copy[routeId];
        return copy;
      });

      setRoutes((prev) => {
        const nextRoutes = prev.filter((r) => r.id !== routeId);
        setVisibleRouteIds((vis) => vis.filter((id) => id !== routeId));
        setFocusedRouteId((cur) => (cur === routeId ? nextRoutes[0]?.id ?? null : cur));
        return nextRoutes;
      });
    } catch (e) {
      console.error(e);
      alert("Failed to delete the route on the server.");
    }
  };

  const toggleRouteVisibility = (id) => {
    setVisibleRouteIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleRouteClick = (id) => {
    setFocusedRouteId(id);
    setVisibleRouteIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const visibleRoutes = useMemo(
    () => routes.filter((r) => visibleRouteIds.includes(r.id)),
    [routes, visibleRouteIds]
  );

  const focusedRoute = useMemo(
    () => routes.find((r) => r.id === focusedRouteId) || null,
    [routes, focusedRouteId]
  );


  useEffect(() => {
    if (loading || error) return;
    if (visibleRoutes.length === 0) return;

    const buildForRoute = async (route) => {
      const routeId = route.id;

      if (routeGeometries[routeId]) return;
      if (inFlightRef.current.has(routeId)) return;
      if (!route.clients || route.clients.length < 1) return;

      inFlightRef.current.add(routeId);
      setRoutingLoading((prev) => ({ ...prev, [routeId]: true }));

      if (watchdogRef.current[routeId]) clearTimeout(watchdogRef.current[routeId]);
      watchdogRef.current[routeId] = setTimeout(() => {
        const baselineStops = buildBaselineStops(route);
        const baselineFallback = baselineStops.map((s) => [s.lat, s.lng]);

        const optimizedStops = buildOptimizedStops(route);
        const optimizedFallback = optimizedStops ? optimizedStops.map((s) => [s.lat, s.lng]) : null;

        setRouteGeometries((prev) => ({
          ...prev,
          [routeId]: {
            baseline: { latlngs: baselineFallback, distance: 0, duration: 0 },
            optimized: optimizedFallback
              ? { latlngs: optimizedFallback, distance: 0, duration: 0 }
              : null,
          },
        }));
        setRoutingLoading((prev) => ({ ...prev, [routeId]: false }));
        inFlightRef.current.delete(routeId);
      }, 20000);

      try {
        const baselineStops = buildBaselineStops(route);
        const baselineGeo = await buildRoadRoute(
          baselineStops.map((s) => ({ lat: s.lat, lng: s.lng })),
          { timeoutMs: 12000 }
        );

        const optimizedStops = buildOptimizedStops(route);
        let optimizedGeo = null;
        if (optimizedStops && optimizedStops.length >= 2) {
          optimizedGeo = await buildRoadRoute(
            optimizedStops.map((s) => ({ lat: s.lat, lng: s.lng })),
            { timeoutMs: 12000 }
          );
        }

        setRouteGeometries((prev) => ({
          ...prev,
          [routeId]: { baseline: baselineGeo, optimized: optimizedGeo },
        }));
      } catch (e) {
        console.error("OSRM geometry build failed:", routeId, e);
        const baselineStops = buildBaselineStops(route);
        const baselineFallback = baselineStops.map((s) => [s.lat, s.lng]);

        const optimizedStops = buildOptimizedStops(route);
        const optimizedFallback = optimizedStops ? optimizedStops.map((s) => [s.lat, s.lng]) : null;

        setRouteGeometries((prev) => ({
          ...prev,
          [routeId]: {
            baseline: { latlngs: baselineFallback, distance: 0, duration: 0 },
            optimized: optimizedFallback
              ? { latlngs: optimizedFallback, distance: 0, duration: 0 }
              : null,
          },
        }));
      } finally {
        if (watchdogRef.current[routeId]) {
          clearTimeout(watchdogRef.current[routeId]);
          delete watchdogRef.current[routeId];
        }
        setRoutingLoading((prev) => ({ ...prev, [routeId]: false }));
        inFlightRef.current.delete(routeId);
      }
    };

    visibleRoutes.forEach((r) => buildForRoute(r));
  }, [visibleRoutes, loading, error, routeGeometries]);

  const fixStuckRoutes = () => {
    const idsToRetry = visibleRoutes
      .filter((r) => !routeGeometries[r.id] || routingLoading[r.id])
      .map((r) => r.id);

    if (idsToRetry.length === 0) return;

    idsToRetry.forEach((id) => {
      inFlightRef.current.delete(id);
      if (watchdogRef.current[id]) {
        clearTimeout(watchdogRef.current[id]);
        delete watchdogRef.current[id];
      }
    });

    setRoutingLoading((prev) => {
      const copy = { ...prev };
      idsToRetry.forEach((id) => (copy[id] = false));
      return copy;
    });

    setRouteGeometries((prev) => {
      const copy = { ...prev };
      idsToRetry.forEach((id) => delete copy[id]);
      return copy;
    });
  };


  const handleOptimize = async (routeId) => {
    if (optimizeInFlightRef.current.has(routeId)) return;
    optimizeInFlightRef.current.add(routeId);

    try {
      const updated = await optimizeRoute(routeId);

      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId ? { ...r, optimized: updated?.optimized ?? r.optimized } : r
        )
      );

      setRouteGeometries((prev) => {
        const copy = { ...prev };
        delete copy[routeId];
        return copy;
      });
    } catch (e) {
      console.error(e);
      alert("Optimization failed. Check backend terminal for details.");
    } finally {
      optimizeInFlightRef.current.delete(routeId);
    }
  };

  const defaultCenter = [56.952, 24.105];

  const focusedGeo = focusedRoute ? routeGeometries[focusedRoute.id] : null;
  const focusedBaselineLatLngs = focusedGeo?.baseline?.latlngs || null;
  const focusedOptimizedLatLngs = focusedGeo?.optimized?.latlngs || null;

  const BASELINE_OFF = { dx: -0.00018, dy: -0.00010 }; 
  const OPTIMIZED_OFF = { dx: +0.00018, dy: +0.00010 }; 

  return (
    <div className="dashboard-page">
      <header className="dashboard-nav">
        <div className="nav-left">
          <span className="nav-logo" onClick={() => navigate("/dashboard")}>
            QuickRoute
          </span>
        </div>
        <div className="nav-right">
          <span className="nav-username">{userName}</span>
          <button className="nav-logout-button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-card routes-card">
          <div
            className="dashboard-header"
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <span className="dashboard-emoji">🗺️</span>
            <h1 className="dashboard-title" style={{ margin: 0 }}>
              My routes
            </h1>
          </div>

          <p className="dashboard-subtitle">
            Baseline (dashed) vs Optimized (solid). Warehouses are shown in red. Route is
            open (no return to warehouse).
          </p>

          {loading && <p>⏳ Loading routes...</p>}
          {error && !loading && <p style={{ color: "#dc2626", fontWeight: 600 }}>{error}</p>}

          {!loading && !error && routes.length === 0 && <p>You don't have any routes yet.</p>}

          {!loading && !error && routes.length > 0 && (
            <div className="routes-layout">
              <div className="routes-list-wrapper">
                <h2 className="routes-list-title">Routes</h2>
                <p className="routes-list-help">
                  Toggle routes on map. Baseline is dashed; optimized is solid.
                </p>

                <div className="routes-list">
                  {routes.map((route) => {
                    const isVisible = visibleRouteIds.includes(route.id);
                    const isFocused = focusedRouteId === route.id;
                    const isBuilding = !!routingLoading[route.id];

                    const clientStopsCount = route.clients?.length || 0;

                    const baseline = route.baseline;
                    const optimized = route.optimized;

                    const distImp =
                      baseline?.distance && optimized?.distance
                        ? pct(baseline.distance, optimized.distance)
                        : null;

                    const baseTime = bestTimeSeconds(baseline);
                    const optTime = bestTimeSeconds(optimized);
                    const timeImp = baseTime && optTime ? pct(baseTime, optTime) : null;

                    return (
                      <div
                        key={route.id}
                        className={`route-item ${isFocused ? "route-item-active" : ""}`}
                        onClick={() => handleRouteClick(route.id)}
                      >
                        <div className="route-item-header">
                          <div className="route-item-left">
                            <span className="route-color-dot" style={{ backgroundColor: route.color }} />
                            <span className="route-name">{route.name}</span>
                          </div>

                          <div
                            className="route-actions"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: "flex", gap: 10, alignItems: "center" }}
                          >
                            <label className="route-toggle">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => toggleRouteVisibility(route.id)}
                              />
                              <span>Show</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleOptimize(route.id)}
                              style={{
                                border: "none",
                                background: "#0f172a",
                                color: "white",
                                fontWeight: 800,
                                cursor: "pointer",
                                padding: "6px 10px",
                                borderRadius: 8,
                              }}
                              title="Compute optimized warehouse + stop order"
                            >
                              Optimize
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteRoute(route.id, route.name)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#dc2626",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              title="Delete route"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="route-meta">
                          {clientStopsCount} stop{clientStopsCount !== 1 ? "s" : ""}

                          {baseline?.distance > 0 &&
                            baseline?.duration > 0 &&
                            (() => {
                              const bt = getTrafficSeconds(baseline);
                              return (
                                <span style={{ marginLeft: 10, opacity: 0.85 }}>
                                  · Baseline: {formatKm(baseline.distance)} ·{" "}
                                  {bt ? (
                                    <>
                                      <b>{formatMin(bt)}</b>{" "}
                                      <span style={{ fontWeight: 400, opacity: 0.8 }}>(traffic)</span>
                                    </>
                                  ) : (
                                    formatMin(baseline.duration)
                                  )}
                                </span>
                              );
                            })()}

                          {optimized?.distance > 0 &&
                            optimized?.duration > 0 &&
                            (() => {
                              const ot = getTrafficSeconds(optimized);
                              return (
                                <span style={{ marginLeft: 10, opacity: 0.9, fontWeight: 700 }}>
                                  · Optimized: {formatKm(optimized.distance)} ·{" "}
                                  {ot ? (
                                    <>
                                      <b>{formatMin(ot)}</b>{" "}
                                      <span style={{ fontWeight: 400, opacity: 0.8 }}>(traffic)</span>
                                    </>
                                  ) : (
                                    formatMin(optimized.duration)
                                  )}
                                </span>
                              );
                            })()}

                          {optimized?.warehouse_name && (
                            <span style={{ marginLeft: 10, opacity: 0.85 }}>· {optimized.warehouse_name}</span>
                          )}

                          {distImp !== null && timeImp !== null && (
                            <span style={{ marginLeft: 10, opacity: 0.9 }}>
                              · Improvement: {distImp.toFixed(1)}% dist, {timeImp.toFixed(1)}% time
                            </span>
                          )}

                          {isVisible && isBuilding && (
                            <span style={{ marginLeft: 8, opacity: 0.8 }}>· calculating…</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="routes-map-wrapper">
                <h2 className="routes-map-title">Map</h2>
                <p className="routes-map-help">
                  Warehouses are red. Baseline polyline is dashed. Optimized is solid.
                  <br />
                  <b>Grey numbers</b> = baseline order • <b>Green numbers</b> = optimized order (offset + always on top)
                </p>

                <MapContainer center={defaultCenter} zoom={12} scrollWheelZoom={true} className="routes-map">
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {WAREHOUSES.map((wh) => (
                    <Marker key={wh.id} position={[wh.lat, wh.lng]} icon={warehouseIcon}>
                      <Tooltip direction="top" offset={[0, -10]}>
                        <b>{wh.name}</b>
                        <br />
                        {wh.lat.toFixed(5)}, {wh.lng.toFixed(5)}
                      </Tooltip>
                    </Marker>
                  ))}

                  {focusedRoute && (
                    <FitToRoute baselineLatLngs={focusedBaselineLatLngs} optimizedLatLngs={focusedOptimizedLatLngs} />
                  )}

                  {visibleRoutes.map((route) => {
                    const geo = routeGeometries[route.id];
                    const base = geo?.baseline?.latlngs;
                    const opt = geo?.optimized?.latlngs;

                    const isFocused = route.id === focusedRouteId;

                    return (
                      <React.Fragment key={route.id}>
                        {base?.length > 1 && (
                          <Polyline
                            positions={base}
                            pathOptions={{
                              color: route.color,
                              weight: isFocused ? 5 : 4,
                              opacity: isFocused ? 0.55 : 0.3,
                              dashArray: "8 10",
                            }}
                          />
                        )}

                        {opt?.length > 1 && (
                          <Polyline
                            positions={opt}
                            pathOptions={{
                              color: route.color,
                              weight: isFocused ? 7 : 5,
                              opacity: isFocused ? 1 : 0.6,
                            }}
                          />
                        )}

                        {isFocused &&
                          (() => {
                            const clients = route.clients || [];

                            
                            const baselineNumbers = clients.map((c, idx) => ({ client: c, n: idx + 1 }));

                           
                            const order = route.optimized?.order || [];
                            const byId = new Map(clients.map((c) => [c.id, c]));
                            const optimizedNumbers = order
                              .map((id, idx) => {
                                const client = byId.get(id);
                                if (!client) return null;
                                return { client, n: idx + 1 };
                              })
                              .filter(Boolean);

                            const hasOptimized = optimizedNumbers.length > 0;

                            return (
                              <>
                                
                                {baselineNumbers.map(({ client, n }) => (
                                  <Marker
                                    key={`${route.id}-baseline-num-${client.id ?? n}`}
                                    position={
                                      hasOptimized
                                        ? offsetLatLng(client.lat, client.lng, BASELINE_OFF.dx, BASELINE_OFF.dy)
                                        : [client.lat, client.lng]
                                    }
                                    icon={makeNumberedStopIcon(n, "baseline")}
                                    zIndexOffset={200}
                                    interactive={false}
                                  />
                                ))}

                                
                                {optimizedNumbers.map(({ client, n }) => (
                                  <Marker
                                    key={`${route.id}-opt-num-${client.id ?? n}`}
                                    position={offsetLatLng(client.lat, client.lng, OPTIMIZED_OFF.dx, OPTIMIZED_OFF.dy)}
                                    icon={makeNumberedStopIcon(n, "optimized")}
                                    zIndexOffset={1000}
                                  >
                                    <Tooltip direction="top" offset={[0, -10]}>
                                      <b>{route.name}</b> – optimized stop #{n}
                                      {client.label ? ` (${client.label})` : ""}
                                    </Tooltip>
                                  </Marker>
                                ))}
                              </>
                            );
                          })()}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                padding: "12px 24px",
                borderRadius: 10,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                minWidth: 220,
              }}
            >
              ⬅ Return to dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Routes;
