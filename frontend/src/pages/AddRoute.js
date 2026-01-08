
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import "./AddRoute.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { fetchWarehouses } from "../api/warehousesApi";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const warehouseIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});


const RAW_API_BASE = (process.env.REACT_APP_API_BASE_URL || "").trim();
const API_BASE = RAW_API_BASE.replace(/\/$/, ""); 

function apiUrl(path) {
  
  if (!path.startsWith("/")) return API_BASE ? `${API_BASE}/${path}` : `/${path}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}

function MapClickHandler({ activeStopId, setStops }) {
  useMapEvents({
    click(e) {
      if (!activeStopId) return;
      const { lat, lng } = e.latlng;
      setStops((prev) =>
        prev.map((stop) =>
          stop.id === activeStopId
            ? { ...stop, lat: lat.toFixed(6), lng: lng.toFixed(6) }
            : stop
        )
      );
    },
  });

  return null;
}

function AddRoute() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "user";

  const [routeName, setRouteName] = useState("");
  const [stops, setStops] = useState([{ id: 1, label: "", lat: "", lng: "" }]);
  const [activeStopId, setActiveStopId] = useState(1);

  const [warehouses, setWarehouses] = useState([]);
  const [whError, setWhError] = useState("");

  const selectedWarehouse = useMemo(() => {
    if (!warehouses || warehouses.length === 0) return null;
    return warehouses.find((w) => w.id === 1) || warehouses[0];
  }, [warehouses]);

  useEffect(() => {
    let alive = true;

    async function loadWarehouses() {
      setWhError("");
      try {

        const list = await fetchWarehouses();
        if (!alive) return;
        setWarehouses(list || []);
      } catch (e) {
        console.error("Failed to load warehouses:", e);
        if (!alive) return;
        setWhError(e?.message || "Failed to load warehouses.");
      }
    }

    loadWarehouses();
    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    navigate("/");
  };

  const handleAddStop = () => {
    const newId = Date.now();
    setStops((prev) => [...prev, { id: newId, label: "", lat: "", lng: "" }]);
    setActiveStopId(newId);
  };

  const handleRemoveStop = (id) => {
    setStops((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeStopId === id && next.length > 0) setActiveStopId(next[0].id);
      if (next.length === 0) {
        const newId = Date.now();
        setActiveStopId(newId);
        return [{ id: newId, label: "", lat: "", lng: "" }];
      }
      return next;
    });
  };

  const handleStopChange = (id, field, value) => {
    setStops((prev) =>
      prev.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop))
    );
  };

  const cleanedStops = useMemo(() => {
    return stops.filter(
      (s) =>
        s.lat.toString().trim() !== "" &&
        s.lng.toString().trim() !== "" &&
        !isNaN(Number(s.lat)) &&
        !isNaN(Number(s.lng))
    );
  }, [stops]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!routeName.trim()) {
      alert("Please enter a route name.");
      return;
    }

    if (cleanedStops.length < 1) {
      alert("Please add at least one stop with coordinates.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to save a route.");
      return;
    }

    if (!selectedWarehouse) {
      alert("Warehouses are not loaded yet. Please try again.");
      return;
    }

    try {
      
      const createResp = await fetch(apiUrl("/api/routes/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: routeName.trim(),
          parameters: {
            couriers: 1,
            warehouse: {
              id: selectedWarehouse.id,
              name: selectedWarehouse.name,
              lat: selectedWarehouse.lat,
              lon: selectedWarehouse.lng,
            },
          },
        }),
      });

      const debugText = await createResp.text();
      console.log("Create route response:", createResp.status, debugText);

      if (!createResp.ok) {
        alert("Failed to create route on the server.");
        return;
      }

      
      let routeId = null;
      if (debugText && debugText.trim() !== "") {
        try {
          const created = JSON.parse(debugText);
          routeId = created.id || created.item?.id || null;
        } catch (jsonErr) {
          console.warn("Create route response is not valid JSON:", jsonErr);
        }
      }

      
      if (!routeId) {
        const listResp = await fetch(apiUrl("/api/routes/"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (listResp.ok) {
          const listData = await listResp.json();
          const items = listData.items || [];
          const matching = items
            .filter((r) => r.name === routeName.trim())
            .sort((a, b) => (b.id || 0) - (a.id || 0));

          if (matching.length > 0) routeId = matching[0].id;
        }
      }

      if (!routeId) {
        alert("Route was created, but we couldn't determine its ID to add stops.");
        return;
      }

      for (let i = 0; i < cleanedStops.length; i++) {
        const stop = cleanedStops[i];

        const clientPayload = {
          name: stop.label?.trim() || `Stop ${i + 1}`,
          lat: Number(stop.lat),
          lon: Number(stop.lng),
        };

        const clientResp = await fetch(apiUrl(`/api/routes/${routeId}/clients`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(clientPayload),
        });

        if (!clientResp.ok) {
          console.error("Failed to add client", i + 1, clientResp.status);
          alert("Route saved but one of the stops failed to be added.");
        }
      }

      alert("✅ Route saved!");

      const newId = Date.now();
      setRouteName("");
      setStops([{ id: newId, label: "", lat: "", lng: "" }]);
      setActiveStopId(newId);
    } catch (err) {
      console.error("Unexpected error while saving the route:", err);
      alert("❌ Error while saving the route: " + (err.message || "see console"));
    }
  };

  const mapCenter = selectedWarehouse
    ? [selectedWarehouse.lat, selectedWarehouse.lng]
    : [56.9496, 24.1052];

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
        <div className="dashboard-card add-route-card">
          <div className="dashboard-header">
            <span className="dashboard-emoji">🧭</span>
            <h1 className="dashboard-title">Create new route</h1>
          </div>
          <p className="dashboard-subtitle">
            Specify the route name and add stops using coordinates or by selecting them on the map.
          </p>

          <div className="add-route-layout">
            <form className="add-route-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Route name</label>
                <input
                  type="text"
                  placeholder="E.g. Riga deliveries"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div className="stops-header">
                  <label>Stops</label>
                  <button type="button" className="small-button" onClick={handleAddStop}>
                    + Add stop
                  </button>
                </div>

                <p className="stops-help">
                  Warehouses are shown as red markers. Stops are blue. Click a stop and then click
                  on the map to set its coordinates.
                </p>

                <div className="stops-list">
                  {stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className={`stop-row ${activeStopId === stop.id ? "stop-row-active" : ""}`}
                      onClick={() => setActiveStopId(stop.id)}
                    >
                      <div className="stop-row-top">
                        <span className="stop-index">#{index + 1}</span>
                        {stops.length > 1 && (
                          <button
                            type="button"
                            className="link-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStop(stop.id);
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        className="stop-label-input"
                        type="text"
                        placeholder="Label (optional)"
                        value={stop.label}
                        onChange={(e) => handleStopChange(stop.id, "label", e.target.value)}
                      />

                      <div className="coords-row">
                        <input
                          type="text"
                          placeholder="Latitude (lat)"
                          value={stop.lat}
                          onChange={(e) => handleStopChange(stop.id, "lat", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Longitude (lng)"
                          value={stop.lng}
                          onChange={(e) => handleStopChange(stop.id, "lng", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="dashboard-button submit-route">
                💾 Save route
              </button>

              <button
                type="button"
                className="dashboard-logout back-button"
                onClick={() => navigate("/dashboard")}
              >
                Back to dashboard
              </button>
            </form>

            <div className="add-route-map-wrapper">
              <h2 className="map-title">Map</h2>
              <p className="map-help">
                Warehouses are red. Stops are blue. Select a stop on the left, then click the map.
              </p>

              {whError && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    borderRadius: 10,
                    background: "#ffe8e8",
                  }}
                >
                  <strong>Warehouse load error:</strong> {whError}
                </div>
              )}

              <MapContainer
                center={mapCenter}
                zoom={11}
                scrollWheelZoom={true}
                className="add-route-map"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler activeStopId={activeStopId} setStops={setStops} />

                {warehouses.map((w) => (
                  <Marker key={w.id} position={[w.lat, w.lng]} icon={warehouseIcon}>
                    <Tooltip direction="top" offset={[0, -10]} permanent={false}>
                      {w.name}
                    </Tooltip>
                  </Marker>
                ))}

                {stops
                  .filter(
                    (s) =>
                      s.lat &&
                      s.lng &&
                      !isNaN(Number(s.lat)) &&
                      !isNaN(Number(s.lng))
                  )
                  .map((s) => (
                    <Marker key={s.id} position={[parseFloat(s.lat), parseFloat(s.lng)]} />
                  ))}
              </MapContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AddRoute;
