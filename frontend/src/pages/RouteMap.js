import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

function RouteMap() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [error, setError] = useState("");
  const [osrmData, setOsrmData] = useState(null);

  useEffect(() => {
    fetchRoute();
  }, []);

  const fetchRoute = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://127.0.0.1:5000/api/routes/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch routes");

      const data = await response.json();
      const selected = data.items.find((r) => r.id === parseInt(id));
      setRoute(selected);

      if (selected && selected.clients.length > 1) {
        fetchOsrmRoute(selected.clients);
      }
    } catch (err) {
      console.error(err);
      setError("❌ Neizdevās ielādēt maršrutu");
    }
  };

  const fetchOsrmRoute = async (clients) => {
    const coords = clients.map((c) => `${c.lon},${c.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const routeInfo = data.routes[0];
        setOsrmData({
          coordinates: routeInfo.geometry.coordinates.map((p) => [p[1], p[0]]),
          distance: (routeInfo.distance / 1000).toFixed(2), // km
          duration: (routeInfo.duration / 60).toFixed(1), // minutes
        });
      }
    } catch (err) {
      console.error("OSRM error:", err);
    }
  };

  if (error) return <p>{error}</p>;
  if (!route) return <p>⏳ Ielādē maršrutu...</p>;

  const clients = route.clients || [];
  const positions = clients.map((c) => [c.lat, c.lon]);
  const center = positions.length > 0 ? positions[0] : [56.95, 24.1];

  const blueIcon = new L.Icon({
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>🗺️ Maršruts: {route.name}</h2>
        <p>Kurjeri: {route.parameters.couriers}</p>
        <p>Klienti: {clients.length}</p>

        {osrmData && (
          <div style={styles.stats}>
            <p><strong>Attālums:</strong> {osrmData.distance} km</p>
            <p><strong>Ilgums:</strong> {osrmData.duration} min</p>
          </div>
        )}

        <div style={styles.mapWrapper}>
          <MapContainer
            center={center}
            zoom={8}
            style={{ height: "500px", width: "100%", borderRadius: "8px", zIndex: 0 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
            />

            {positions.map((pos, i) => (
              <Marker key={i} position={pos} icon={blueIcon}>
                <Popup>
                  <strong>{clients[i].name}</strong>
                  <br />
                  Lat: {clients[i].lat}, Lon: {clients[i].lon}
                </Popup>
              </Marker>
            ))}

            {/* 🚗 Draw real road route */}
            {osrmData && (
              <Polyline positions={osrmData.coordinates} color="blue" />
            )}
          </MapContainer>
        </div>

        <button style={styles.backButton} onClick={() => navigate("/routes")}>
          ⬅️ Atpakaļ uz maršrutiem
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#f6f8fa",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "600px",
    textAlign: "center",
  },
  mapWrapper: {
    marginTop: "20px",
    marginBottom: "20px",
    height: "500px",
    width: "100%",
    position: "relative",
    zIndex: 0,
  },
  backButton: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
  },
  stats: {
    marginTop: "10px",
    backgroundColor: "#eef5ff",
    padding: "10px",
    borderRadius: "6px",
  },
};

export default RouteMap;
