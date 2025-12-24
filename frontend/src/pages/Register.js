import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";
import heroIllustration from "../assets/quickroute-hero.png"; // same image as login

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!name || !email || !password) {
      setError("Please fill in name, email and password.");
      return;
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || data.message || "Registration failed.");
        return;
      }

      const data = await response.json();
      setInfo("Account created successfully. Redirecting to login...");

      // if you want, you can also store name here, but usually
      // we redirect and let login handle storing name
      setTimeout(() => navigate("/"), 1200); // adjust if your login route is different
    } catch (err) {
      console.error(err);
      setError("⚠️ Server connection error");
    }
  };

  return (
    <div className="register-page">
      {/* TOP CENTERED HEADER */}
      <div className="register-header">
        <h1 className="brand-name">QuickRoute</h1>
        <p className="brand-tagline">Pievienojieties un pārvaldiet piegādes</p>
      </div>

      {/* MAIN CONTENT: FORM LEFT, ILLUSTRATION RIGHT */}
      <div className="register-container">
        {/* LEFT – REGISTER CARD */}
        <div className="register-left">
          <div className="register-card">
            <h2 className="register-title">Register</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="input-label">Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {info && <div className="info-message">{info}</div>}

              <button type="submit" className="register-button">
                Create account
              </button>
            </form>

            <p className="switch-text">
              Already have an account?{" "}
              <Link to="/" className="switch-link">
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT – ILLUSTRATION */}
        <div className="register-right">
          <div className="register-illustration-wrapper">
            <img
              src={heroIllustration}
              alt="Courier on bike with map"
              className="register-illustration"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
