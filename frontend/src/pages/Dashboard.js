import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import WeatherWidget from "../components/WeatherWidget";


const FACTS = [
  "Optimized routes can reduce delivery distance by up to 20–30%.",
  "Clustering deliveries in the same area often saves more time than using the absolute shortest path.",
  "Even a few minutes saved per route can add up to hours per week for a courier.",
  "Bike couriers are often faster than cars in dense city centers during rush hour.",
  "Route optimization is a classic NP-hard problem similar to the travelling salesman problem."
];


function Dashboard() {
  const navigate = useNavigate();
  const [factIndex, setFactIndex] = useState(0);

  const userName = localStorage.getItem("userName") || "lietotāj";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    navigate("/");
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FACTS.length);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="dashboard-page">
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

<div className="fact-container">
  <div className="fact-box">
    <span className="fact-label">Interesting Fact</span>
    <p className="fact-text">{FACTS[factIndex]}</p>
  </div>
</div>


<div className="weather-row">
  <WeatherWidget />
</div>




      <main className="dashboard-main">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <span className="dashboard-emoji">👋</span>
            <h1 className="dashboard-title">Welcome, {userName}!</h1>
          </div>

          <p className="dashboard-subtitle">
            Manage your deliveries quickly and efficiently.
          </p>

          <div className="dashboard-actions">
            <button className="dashboard-button" onClick={() => navigate("/routes")}>
              📦 View routes
            </button>

            <button className="dashboard-button" onClick={() => navigate("/add-route")}>
              ➕ Create new route
            </button>

            <button className="dashboard-button" onClick={() => navigate("/statistics")}>
              📊 Statistics
            </button>

            <button className="dashboard-button" onClick={() => navigate("/about")}>
              📘 About Us
            </button>
          </div>

          <button className="dashboard-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;