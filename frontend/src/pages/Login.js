import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import heroIllustration from "../assets/quickroute-hero.png"; 

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Invalid email or password.");
        return;
      }

      const data = await response.json();
      console.log("Login response:", data); 

      const token = data.access_token || data.token;
      if (token) {
        localStorage.setItem("token", token);
      }


      if (data.name) {
        localStorage.setItem("userName", data.name);
      }

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("⚠️ Server connection error");
    }
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <h1 className="brand-name">QuickRoute</h1>
        <p className="brand-tagline">Optimize delivery routes</p>
      </div>

      <div className="login-container">
        <div className="login-left">
          <div className="login-illustration-wrapper">
            <img
              src={heroIllustration}
              alt="Courier on bike with map"
              className="login-illustration"
            />
          </div>
        </div>

        <div className="login-right">
          <div className="login-card">
            <h2 className="login-title">Login</h2>

            <form onSubmit={handleSubmit}>
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
                  placeholder="Enter your password"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="login-button">
                Log In
              </button>
            </form>

            <p className="register-text">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="register-link">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
