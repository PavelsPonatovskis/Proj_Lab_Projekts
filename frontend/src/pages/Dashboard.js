import React from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📦 Preču piegādes sistēmas panelis</h2>
        <p>Welcome! You are successfully logged in.</p>

        <div style={styles.menu}>
          <button style={styles.button} onClick={() => navigate("/routes")}>
            🗺️ Maršruti
          </button>
          <button style={styles.button} onClick={() => navigate("/add-route")}>
            ➕ Pievienot maršrutu
          </button>
          <button style={styles.button}>📊 Statistika</button>
        </div>

        <button onClick={handleLogout} style={styles.logout}>
          🚪 Log Out
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
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "20px",
    marginBottom: "30px",
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
  logout: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    cursor: "pointer",
    width: "100%",
  },
};

export default Dashboard;
