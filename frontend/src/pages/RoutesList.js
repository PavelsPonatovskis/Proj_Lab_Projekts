import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function RoutesList() {
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: "", couriers: 1, distance: "" });
  const [newClient, setNewClient] = useState({ name: "", lat: "", lon: "" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setError("⚠️ You must be logged in!");

    try {
      const response = await fetch("http://127.0.0.1:5000/api/routes/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setRoutes(data.items);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to fetch");
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    if (!window.confirm("Vai tiešām vēlaties dzēst šo maršrutu?")) return;

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/routes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) setRoutes(routes.filter((r) => r.id !== id));
    } catch {
      setError("❌ Servera kļūda");
    }
  };

  const startEdit = (route) => {
    setEditingId(route.id);
    setEditData({
      name: route.name,
      couriers: route.parameters?.couriers || 1,
      distance: route.parameters?.distance || "",
    });
  };

  const handleEditSave = async () => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://127.0.0.1:5000/api/routes/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editData.name,
          parameters: {
            couriers: editData.couriers,
            distance: editData.distance,
          },
        }),
      });
      await fetchRoutes();
      setEditingId(null);
    } catch {
      setError("❌ Neizdevās atjaunot maršrutu");
    }
  };

  // 👥 Add client
  const handleAddClient = async (routeId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/routes/${routeId}/clients`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newClient),
        }
      );
      if (response.ok) {
        await fetchRoutes();
        setNewClient({ name: "", lat: "", lon: "" });
      } else {
        setError("❌ Neizdevās pievienot klientu");
      }
    } catch {
      setError("❌ Servera kļūda");
    }
  };

  // ❌ Delete client
  const handleDeleteClient = async (routeId, clientId) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(
        `http://127.0.0.1:5000/api/routes/${routeId}/clients/${clientId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchRoutes();
    } catch {
      setError("❌ Neizdevās dzēst klientu");
    }
  };
      
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🗺️ Mani maršruti</h2>

        {error && <p style={styles.error}>{error}</p>}

        {routes.map((r) => (
          <div key={r.id} style={styles.routeBox}>
            {editingId === r.id ? (
              <>
                <input
                  style={styles.input}
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
                <input
                  style={styles.input}
                  type="number"
                  value={editData.couriers}
                  onChange={(e) =>
                    setEditData({ ...editData, couriers: Number(e.target.value) })
                  }
                />
                <input
                  style={styles.input}
                  type="number"
                  step="0.1"
                  value={editData.distance}
                  onChange={(e) =>
                    setEditData({ ...editData, distance: e.target.value })
                  }
                />
                <button style={styles.saveBtn} onClick={handleEditSave}>
                  💾 Saglabāt
                </button>
                <button
                  style={styles.cancelBtn}
                  onClick={() => setEditingId(null)}
                >
                  ✖️ Atcelt
                </button>
              </>
            ) : (
              <>
                <h3 style={styles.routeName}>{r.name}</h3>
                <p>Kurjeru skaits: {r.parameters.couriers}</p>
                <p>Attālums: {r.parameters.distance || "nav norādīts"} km</p>

                {/* 👥 Client list */}
                <h4 style={{ marginTop: "10px" }}>Klienti:</h4>
                {r.clients.length === 0 && <p style={styles.noData}>Nav klientu</p>}
                {r.clients.map((c) => (
                  <div key={c.id} style={styles.clientBox}>
                    <p>
                      📍 {c.name} ({c.lat}, {c.lon})
                    </p>
                    <button
                      style={styles.deleteClientBtn}
                      onClick={() => handleDeleteClient(r.id, c.id)}
                    >
                      ❌
                    </button>
                  </div>
                ))}

                {/* 👥 Add new client form */}
                <div style={styles.clientForm}>
                  <input
                    style={styles.input}
                    placeholder="Klienta nosaukums"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                  />
                  <input
                    style={styles.input}
                    placeholder="Platums (lat)"
                    value={newClient.lat}
                    onChange={(e) =>
                      setNewClient({ ...newClient, lat: e.target.value })
                    }
                  />
                  <input
                    style={styles.input}
                    placeholder="Garums (lon)"
                    value={newClient.lon}
                    onChange={(e) =>
                      setNewClient({ ...newClient, lon: e.target.value })
                    }
                  />
                  <button
                    style={styles.addClientBtn}
                    onClick={() => handleAddClient(r.id)}
                  >
                    ➕ Pievienot klientu
                  </button>
                </div>
                      {/* 📏 Distance matrix upload */}
<h4 style={{ marginTop: "15px" }}>Attālumu matrica:</h4>

{/* Preview of existing matrix (read-only) */}
<textarea
  style={styles.textarea}
  placeholder="Nav saglabātas matricas"
  value={
    r.parameters.distance_matrix
      ? JSON.stringify(r.parameters.distance_matrix)
      : ""
  }
  readOnly
></textarea>

{/* Upload new matrix */}
<div style={{ marginTop: "8px" }}>
  <textarea
    style={styles.textarea}
    placeholder="Ievadiet vai ielīmējiet attālumu matricu JSON formātā, piemēram: [[0,5,9],[5,0,4],[9,4,0]]"
    id={`matrix-${r.id}`}
  ></textarea>
  <button
    style={styles.matrixBtn}
    onClick={async () => {
      const token = localStorage.getItem("token");
      const raw = document.getElementById(`matrix-${r.id}`).value;
      try {
        const parsed = JSON.parse(raw);
        const response = await fetch(
          `http://127.0.0.1:5000/api/routes/${r.id}/matrix`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ matrix: parsed }),
          }
        );
        if (response.ok) {
          alert("✅ Matrica augšupielādēta!");
          await fetchRoutes();
        } else {
          alert("❌ Kļūda augšupielādējot matricu!");
        }
      } catch {
        alert("⚠️ Nepareizs JSON formāts!");
      }
    }}
  >
    📁 Saglabāt matricu
  </button>
</div>
                <div style={styles.buttons}>
                  <button style={styles.editBtn} onClick={() => startEdit(r)}>
                    ✏️ Rediģēt
                  </button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(r.id)}>
                    🗑️ Dzēst
                  </button>
                  <button
  style={styles.mapBtn}
  onClick={() => navigate(`/map/${r.id}`)}
>
  🌍 Skatīt kartē
</button>
                </div>
              </>
            )}
          </div>
        ))}

        <button onClick={() => navigate("/dashboard")} style={styles.backButton}>
          ⬅️ Atpakaļ uz paneli
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
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "500px",
    textAlign: "center",
  },
  title: {
    marginBottom: "20px",
    color: "#333",
  },
  routeBox: {
    backgroundColor: "#f0f4ff",
    borderRadius: "8px",
    padding: "15px",
    textAlign: "left",
    marginBottom: "12px",
  },
  routeName: {
    color: "#007bff",
    margin: "0 0 5px 0",
  },
  date: {
    fontSize: "14px",
    color: "#555",
  },
  error: {
    color: "red",
    fontWeight: "bold",
  },
  noData: {
    color: "#555",
    fontStyle: "italic",
  },
  buttons: {
    marginTop: "8px",
    display: "flex",
    gap: "8px",
  },
  editBtn: {
    backgroundColor: "#ffc107",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    color: "black",
    fontWeight: "bold",
  },
  deleteBtn: {
    backgroundColor: "#dc3545",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    color: "white",
    fontWeight: "bold",
  },
  saveBtn: {
    backgroundColor: "#28a745",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    color: "white",
    fontWeight: "bold",
    marginTop: "8px",
  },
  cancelBtn: {
    backgroundColor: "#6c757d",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    color: "white",
    fontWeight: "bold",
    marginTop: "6px",
  },
  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "6px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  backButton: {
    marginTop: "20px",
    width: "100%",
    padding: "10px",
    backgroundColor: "#e3e6ed",
    color: "#333",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  clientForm: { marginTop: "10px" },
  clientBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eaf0ff",
    borderRadius: "6px",
    padding: "6px 10px",
    marginBottom: "5px",
  },
  deleteClientBtn: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    padding: "3px 6px",
  },
  addClientBtn: {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    cursor: "pointer",
    width: "100%",
    marginTop: "4px",
  },
  textarea: {
  width: "100%",
  minHeight: "60px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  padding: "8px",
  fontFamily: "monospace",
  fontSize: "13px",
},
matrixBtn: {
  marginTop: "6px",
  width: "100%",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "8px",
  cursor: "pointer",
},
mapBtn: {
  backgroundColor: "#17a2b8",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
  color: "white",
  fontWeight: "bold",
},
};

export default RoutesList;
