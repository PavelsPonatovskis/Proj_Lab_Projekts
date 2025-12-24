// src/pages/AboutUs.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function AboutUs() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "lietotāj";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    navigate("/");
  };

  return (
    <div className="dashboard-page">
      {/* TOP NAV */}
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

      {/* MAIN CARD */}
      <main className="dashboard-main about-main">
        <div className="dashboard-card about-card">
          <div className="dashboard-header">
            <span className="dashboard-emoji">🚚</span>
            <h1 className="dashboard-title">About QuickRoute</h1>
          </div>

          <p className="dashboard-subtitle">
            QuickRoute is a university project focused on efficient delivery route planning.
          </p>

          <div className="about-content">

            <section>
              <h2>Project idea</h2>
              <p>
                QuickRoute helps couriers plan routes more efficiently by preparing optimized
                delivery sequences instead of visiting stops in a random order.
              </p>
            </section>

            <section>
              <h2>Main features</h2>
              <ul>
                <li>Create routes with multiple delivery stops.</li>
                <li>Use a fixed starting point (warehouse).</li>
                <li>View and store created routes.</li>
                <li>Prepare optimized routes using an external API.</li>
              </ul>
            </section>

            <section>
              <h2>Technology</h2>
              <ul>
                <li>React frontend.</li>
                <li>Backend API for authentication and route storage.</li>
                <li>Integration with a mapping service.</li>
              </ul>
            </section>

            <section>
              <h2>Team</h2>
              <p>
                Created as part of a university coursework project.  
                Authors: Pāvels Poņatovskis, Aleksandrs Vasiļevskis, Gatis Tumašs
              </p>
            </section>

          </div>

          <button
            className="dashboard-logout"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}

export default AboutUs;
