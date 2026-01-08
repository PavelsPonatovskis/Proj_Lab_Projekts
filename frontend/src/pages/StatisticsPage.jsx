import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStatistics } from "../api/statisticsApi";
import "./Dashboard.css";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const theme = {
  bgGradient: "linear-gradient(135deg, #064e3b 0%, #020617 100%)",
  cardBg: "#ffffff",
  softGreen: "#16a34a",
  lightGreenBg: "#dcfce7",
  mutedText: "#475569",
  titleText: "#ecfdf5",
  subText: "#d1fae5",
  shadow: "0 10px 30px rgba(0,0,0,0.25)",
};

function formatKm(meters) {
  if (meters == null || !Number.isFinite(meters)) return "-";
  return (meters / 1000).toFixed(2);
}

function formatMin(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return "-";
  return (seconds / 60).toFixed(1);
}

function formatPct(x) {
  if (x == null || !Number.isFinite(x)) return "-";
  return `${x.toFixed(1)}%`;
}

function safeNumber(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

function sum(items, key) {
  return items.reduce((acc, it) => acc + safeNumber(it?.[key]), 0);
}

export default function StatisticsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [data, setData] = useState(null);


  const [includedMap, setIncludedMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("statsIncludedMap") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("statsIncludedMap", JSON.stringify(includedMap));
  }, [includedMap]);

  const isIncluded = (id) => includedMap[id] !== false; 

  const toggleIncluded = (id) => {
    setIncludedMap((prev) => {
      const next = { ...prev };
      next[id] = !(prev[id] !== false); 
      return next;
    });
  };

  const includeAll = () => setIncludedMap({});
  const excludeAll = () => {
    const all = data?.items || [];
    const next = {};
    all.forEach((r) => {
      next[r.id] = false;
    });
    setIncludedMap(next);
  };

  const userName = localStorage.getItem("userName") || "lietotāj";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    navigate("/");
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const json = await fetchStatistics({ includeDeleted });
        if (!alive) return;
        setData(json);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load statistics.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [includeDeleted]);

  const itemsAll = data?.items || [];
  const itemsIncluded = itemsAll.filter((r) => isIncluded(r.id));

  const derivedTotals = useMemo(() => {
    const routesTotal = itemsIncluded.length;
    const routesActive = itemsIncluded.filter((r) => !r.is_deleted).length;
    const routesArchived = itemsIncluded.filter((r) => r.is_deleted).length;

    const stopsTotal = itemsIncluded.reduce((acc, r) => acc + (r.stops ?? 0), 0);

    const baselineDistanceM = sum(itemsIncluded, "baseline_distance_m");
    const optimizedDistanceM = sum(itemsIncluded, "optimized_distance_m");

    const baselineTimeS = sum(itemsIncluded, "baseline_time_s");
    const optimizedTimeS = sum(itemsIncluded, "optimized_time_s");

    const routesWithBaseline = itemsIncluded.filter(
      (r) => r.baseline_distance_m != null && r.baseline_time_s != null
    ).length;

    const routesWithOptimized = itemsIncluded.filter(
      (r) => r.optimized_distance_m != null && r.optimized_time_s != null
    ).length;

    const routesComparable = itemsIncluded.filter((r) => r.comparable).length;

    const distanceSavedM =
      baselineDistanceM && optimizedDistanceM
        ? baselineDistanceM - optimizedDistanceM
        : null;

    const timeSavedS =
      baselineTimeS && optimizedTimeS ? baselineTimeS - optimizedTimeS : null;

    const distanceSavedPct =
      baselineDistanceM > 0 && distanceSavedM != null
        ? (distanceSavedM / baselineDistanceM) * 100
        : null;

    const timeSavedPct =
      baselineTimeS > 0 && timeSavedS != null
        ? (timeSavedS / baselineTimeS) * 100
        : null;

    return {
      routes_total: routesTotal,
      routes_active: routesActive,
      routes_archived: routesArchived,
      stops_total: stopsTotal,
      baseline_distance_m: baselineDistanceM,
      optimized_distance_m: optimizedDistanceM,
      baseline_time_s: baselineTimeS,
      optimized_time_s: optimizedTimeS,
      routes_with_baseline: routesWithBaseline,
      routes_with_optimized: routesWithOptimized,
      routes_comparable: routesComparable,
      distance_saved_m: distanceSavedM,
      time_saved_s: timeSavedS,
      distance_saved_pct: distanceSavedPct,
      time_saved_pct: timeSavedPct,
    };
  }, [itemsIncluded]);


  const chartData = useMemo(() => {
    const comparable = itemsIncluded.filter((r) => r.comparable);
    const sorted = [...comparable].sort(
      (a, b) =>
        safeNumber(b.baseline_distance_m) - safeNumber(a.baseline_distance_m)
    );

    return sorted.slice(0, 10).map((r) => ({
      name: (r.name || `#${r.id}`).slice(0, 14),

      baselineKm: Number(formatKm(r.baseline_distance_m)),
      optimizedKm: Number(formatKm(r.optimized_distance_m)),

      baselineMin: Number(formatMin(r.baseline_time_s)),
      optimizedMin: Number(formatMin(r.optimized_time_s)),
    }));
  }, [itemsIncluded]);

  const includedCount = itemsIncluded.length;
  const totalCount = itemsAll.length;

  return (
    <div
      className="dashboard-page"
      style={{ background: theme.bgGradient, height: "100vh" }}
    >
      
      <header className="dashboard-nav">
        <div className="nav-left">
          <span className="nav-logo">QuickRoute</span>
        </div>
        <div className="nav-right">
          <span className="nav-username">{userName}</span>
          <button className="nav-logout-button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "28px 20px 40px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1100, paddingBottom: 40 }}>
          
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: theme.titleText,
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 0.2,
              }}
            >
              📊 Statistics
            </h2>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: theme.subText,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
              />
              Include deleted routes (scope=all)
            </label>
          </div>

          
          {loading && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                background: theme.cardBg,
                boxShadow: theme.shadow,
              }}
            >
              Loading statistics…
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                background: "#ffe8e8",
                boxShadow: theme.shadow,
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && (
            <>
              
              <div
                style={{
                  marginTop: 18,
                  background: theme.lightGreenBg,
                  padding: "14px 18px",
                  borderRadius: 18,
                  boxShadow: theme.shadow,
                  color: "#065f46",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Optimized routes saved{" "}
                <span style={{ color: theme.softGreen }}>
                  {formatPct(derivedTotals.distance_saved_pct)}
                </span>{" "}
                distance and{" "}
                <span style={{ color: theme.softGreen }}>
                  {formatPct(derivedTotals.time_saved_pct)}
                </span>{" "}
                time overall 🚀
              </div>

              
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  color: theme.subText,
                  fontWeight: 600,
                }}
              >
                <div>
                  Included routes:{" "}
                  <span style={{ color: "#fff" }}>
                    {includedCount}/{totalCount}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={includeAll}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 12px",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.16)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    Include all
                  </button>
                  <button
                    onClick={excludeAll}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 12px",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.16)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    Exclude all
                  </button>
                </div>
              </div>

              
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <Kpi title="Routes total" value={derivedTotals.routes_total ?? 0} />
                <Kpi title="Active" value={derivedTotals.routes_active ?? 0} />
                <Kpi
                  title="Archived (deleted)"
                  value={derivedTotals.routes_archived ?? 0}
                />
                <Kpi title="Stops total" value={derivedTotals.stops_total ?? 0} />

                <Kpi
                  title="Baseline distance"
                  value={`${formatKm(derivedTotals.baseline_distance_m)} km`}
                />
                <Kpi
                  title="Optimized distance"
                  value={`${formatKm(derivedTotals.optimized_distance_m)} km`}
                />
                <Kpi
                  title="Distance saved"
                  value={`${formatKm(derivedTotals.distance_saved_m)} km (${formatPct(
                    derivedTotals.distance_saved_pct
                  )})`}
                />

                <Kpi
                  title="Baseline time"
                  value={`${formatMin(derivedTotals.baseline_time_s)} min`}
                />
                <Kpi
                  title="Optimized time"
                  value={`${formatMin(derivedTotals.optimized_time_s)} min`}
                />
                <Kpi
                  title="Time saved"
                  value={`${formatMin(derivedTotals.time_saved_s)} min (${formatPct(
                    derivedTotals.time_saved_pct
                  )})`}
                />

                <Kpi
                  title="Routes with baseline"
                  value={derivedTotals.routes_with_baseline ?? 0}
                />
                <Kpi
                  title="Routes with optimized"
                  value={derivedTotals.routes_with_optimized ?? 0}
                />
                <Kpi
                  title="Comparable routes"
                  value={derivedTotals.routes_comparable ?? 0}
                />
              </div>

              
              <div
                style={{
                  marginTop: 18,
                  padding: 20,
                  borderRadius: 20,
                  background: theme.cardBg,
                  boxShadow: theme.shadow,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <h3 style={{ margin: 0, color: "#0f172a" }}>
                    Baseline vs Optimized distance (Top comparable routes)
                  </h3>
                  <span style={{ color: theme.mutedText, fontSize: 13 }}>
                    Showing up to 10 routes • scope:{" "}
                    {data?.scope || (includeDeleted ? "all" : "active")} • included:{" "}
                    {includedCount}/{totalCount}
                  </span>
                </div>

                {chartData.length === 0 ? (
                  <div style={{ marginTop: 12, color: theme.mutedText }}>
                    No comparable routes among the INCLUDED routes yet.
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 340, marginTop: 12 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend wrapperStyle={{ color: "#475569", fontWeight: 600 }} />
                        <Bar
                          dataKey="baselineKm"
                          name="Baseline (km)"
                          fill="#94a3b8"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="optimizedKm"
                          name="Optimized (km)"
                          fill="#16a34a"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              
              <div
                style={{
                  marginTop: 18,
                  padding: 20,
                  borderRadius: 20,
                  background: theme.cardBg,
                  boxShadow: theme.shadow,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <h3 style={{ margin: 0, color: "#0f172a" }}>
                    Baseline vs Optimized time (Top comparable routes)
                  </h3>
                  <span style={{ color: theme.mutedText, fontSize: 13 }}>
                    Showing up to 10 routes • scope:{" "}
                    {data?.scope || (includeDeleted ? "all" : "active")} • included:{" "}
                    {includedCount}/{totalCount}
                  </span>
                </div>

                {chartData.length === 0 ? (
                  <div style={{ marginTop: 12, color: theme.mutedText }}>
                    No comparable routes among the INCLUDED routes yet.
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 340, marginTop: 12 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend wrapperStyle={{ color: "#475569", fontWeight: 600 }} />
                        <Bar
                          dataKey="baselineMin"
                          name="Baseline (min)"
                          fill="#94a3b8"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="optimizedMin"
                          name="Optimized (min)"
                          fill="#16a34a"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              
              <div
                style={{
                  marginTop: 18,
                  padding: 20,
                  borderRadius: 20,
                  background: theme.cardBg,
                  boxShadow: theme.shadow,
                }}
              >
                <h3 style={{ marginTop: 0, color: "#0f172a" }}>Routes breakdown</h3>

                {itemsAll.length === 0 ? (
                  <div style={{ color: theme.mutedText }}>No routes found.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <Th>Include</Th>
                          <Th>Name</Th>
                          <Th>Stops</Th>
                          <Th>Status</Th>
                          <Th>Baseline (km / min)</Th>
                          <Th>Optimized (km / min)</Th>
                          <Th>Saved</Th>
                          <Th>Comparable</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsAll.map((r) => {
                          const included = isIncluded(r.id);

                          const bd = r.baseline_distance_m;
                          const od = r.optimized_distance_m;
                          const bt = r.baseline_time_s;
                          const ot = r.optimized_time_s;

                          const savedKm =
                            bd != null && od != null ? (bd - od) / 1000 : null;
                          const savedMin =
                            bt != null && ot != null ? (bt - ot) / 60 : null;

                          const savedPct =
                            bd != null && od != null && bd > 0
                              ? ((bd - od) / bd) * 100
                              : null;

                          return (
                            <tr
                              key={r.id}
                              style={{
                                borderTop: "1px solid #e5e7eb",
                                opacity: included ? 1 : 0.45,
                              }}
                            >
                              <Td>
                                <input
                                  type="checkbox"
                                  checked={included}
                                  onChange={() => toggleIncluded(r.id)}
                                />
                              </Td>

                              <Td>
                                {r.name || `Route #${r.id}`}{" "}
                                {!included && (
                                  <span
                                    style={{
                                      marginLeft: 8,
                                      padding: "3px 10px",
                                      borderRadius: 999,
                                      background: "#f0f0f0",
                                      fontWeight: 700,
                                      fontSize: 12,
                                    }}
                                  >
                                    Excluded
                                  </span>
                                )}
                              </Td>

                              <Td>{r.stops ?? 0}</Td>

                              <Td>
                                {r.is_deleted ? (
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      background: "#fff2cc",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Archived
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      background: "#e8fff1",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Active
                                  </span>
                                )}
                              </Td>

                              <Td>
                                {formatKm(bd)} km / {formatMin(bt)} min
                              </Td>
                              <Td>
                                {formatKm(od)} km / {formatMin(ot)} min
                              </Td>

                              <Td>
                                {savedKm == null && savedMin == null ? (
                                  "-"
                                ) : (
                                  <>
                                    {savedKm != null ? `${savedKm.toFixed(2)} km` : "-"} /{" "}
                                    {savedMin != null ? `${savedMin.toFixed(1)} min` : "-"}
                                    {savedPct != null ? ` (${savedPct.toFixed(1)}%)` : ""}
                                  </>
                                )}
                              </Td>

                              <Td>
                                {r.comparable ? (
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      background: "#e8fff1",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Yes
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      background: "#f0f0f0",
                                      fontWeight: 600,
                                    }}
                                  >
                                    No
                                  </span>
                                )}
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: theme.cardBg,
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ fontSize: 13, color: theme.mutedText, fontWeight: 600 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          marginTop: 6,
          color: theme.softGreen,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        fontWeight: 800,
        padding: "10px 8px",
        fontSize: 13,
        color: "#064e3b",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }) {
  return (
    <td
      style={{
        padding: "10px 8px",
        fontSize: 14,
        color: "#0f172a",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
