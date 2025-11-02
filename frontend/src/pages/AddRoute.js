import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function AddRoute() {
  const [name, setName] = useState("");
  const [couriers, setCouriers] = useState(1);
  const [distance, setDistance] = useState(""); 
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("⚠️ You must be logged in!");
      return;
    }

    const data = {
      name,
      parameters: { couriers, distance }, 
      clients: [],
    };

    try {
      const response = await fetch("http://127.0.0.1:5000/api/routes/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage("✅ Route added successfully!");
        setTimeout(() => navigate("/routes"), 1000);
      } else {
        const err = await response.json();
        setMessage(`❌ Error: ${err.error || JSON.stringify(err)}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Server connection error");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📦 Pievienot maršrutu</h2>
        <p>Ievadiet informāciju, lai pievienotu jaunu maršrutu.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Nosaukums:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Piemēram: Rīgas piegādes"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Kurjeru skaits:</label>
            <input
              type="number"
              value={couriers}
              min="1"
              onChange={(e) => setCouriers(Number(e.target.value))}
              style={styles.input}
            />
          </div>

          {/* 👇 New distance field */}
          <div style={styles.field}>
            <label style={styles.label}>Attālums (km):</label>
            <input
              type="number"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="Piemēram: 12.5"
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button}>
            ➕ Pievienot
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}

        <button onClick={() => navigate("/dashboard")} style={styles.back}>
          ⬅️ Atpakaļ uz paneli
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#f6f8fa",
    height: "100vh",
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
    width: "450px",
    textAlign: "center",
  },
  title: {
    marginBottom: "20px",
    color: "#333",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginTop: "20px",
    marginBottom: "20px",
  },
  field: {
    textAlign: "left",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
  },
  back: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#e3e6ed",
    color: "#333",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    cursor: "pointer",
    width: "100%",
  },
  message: {
    marginTop: "10px",
    fontWeight: "bold",
    color: "#333",
  },
};

export default AddRoute;
