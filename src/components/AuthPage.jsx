// src/components/AuthPage.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

const AuthPage = () => {
  const { signup, login } = useAuth();
  const [mode, setMode] = useState("login"); // login OR signup
  const [showInfo, setShowInfo] = useState(true); // NEW: toggle left panel

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  // HANDLE LOGIN / SIGNUP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-wrapper">

        {/* LEFT PANEL — PROJECT INFO */}
        <div className={`auth-left ${showInfo ? "show" : "hide"}`}>
          <div className="auth-logo-title">
            <div className="auth-logo-circle">CC</div>
            <div>
              <h1 className="auth-project-title">Cloud-Collab</h1>
              <p className="auth-subtitle">
                Cloud-based Document Collaboration System
              </p>
            </div>
          </div>

          {/* What project does */}
          <div className="auth-section">
            <h2>What this project does</h2>
            <p>
              Cloud-Collab allows multiple users to create, edit, and share
              documents in real time. All changes sync instantly and files are stored securely.
            </p>
            <ul className="auth-bullets">
              <li>✍️ Real-time collaborative editing</li>
              <li>📂 Upload PDF, DOC, PPT, images</li>
              <li>🔔 Live notifications when others edit</li>
              <li>📶 Works offline — syncs when online</li>
            </ul>
          </div>

          {/* Demo steps */}
          <div className="auth-section">
            <h2>How to use (Demo Guide)</h2>
            <ol className="auth-steps">
              <li>Sign up with your name and email.</li>
              <li>Open the dashboard and create a document.</li>
              <li>All users can edit the same document live.</li>
              <li>Upload supporting files (PDF, PPT, images).</li>
              <li>Offline edits sync when internet returns.</li>
            </ol>
          </div>

          {/* Team details */}
          <div className="auth-section auth-team">
            <h2>Mini Project Details</h2>
            <p className="auth-label">Domain: Cloud Computing</p>
            <p className="auth-label">Project: Cloud-based Document Collaboration</p>

            <div className="auth-team-grid">
              <div>
                <h3>Team Members</h3>
                <ul>
                  <li>Navya P</li>
                  <li>Nisarga N</li>
                  <li>Pranavika M</li>
                  <li>Puneeth S V</li>
                </ul>
              </div>

              <div>
                <h3>Guide</h3>
                <p>Prof.Mr Vishvakiran R C</p>
                <p>Dept. of CSE, K.S.I.T</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — LOGIN / SIGNUP CARD */}
        <div className="auth-right">

          {/* Toggle button */}
          <button
            className="auth-toggle-info"
            onClick={() => setShowInfo(!showInfo)}
          >
            {showInfo ? "Hide Project Info ⮝" : "Show Project Info ⮟"}
          </button>

          <div className="auth-card">
            {/* Tabs */}
            <div className="auth-tabs">
              <button
                className={mode === "login" ? "tab active" : "tab"}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                className={mode === "signup" ? "tab active" : "tab"}
                onClick={() => setMode("signup")}
              >
                Sign Up
              </button>
            </div>

            <h2 className="auth-card-title">
              {isSignup ? "Create Your Account" : "Welcome Back"}
            </h2>
            <p className="auth-card-subtitle">
              Use your email to continue collaborating.
            </p>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="auth-form">
              {isSignup && (
                <div className="auth-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Email ID</label>
                <input
                  type="email"
                  placeholder="yourname@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading
                  ? isSignup
                    ? "Creating Account..."
                    : "Logging In..."
                  : isSignup
                  ? "Sign Up"
                  : "Login"}
              </button>
            </form>

            {/* SMALL SWITCH */}
            <p className="auth-toggle-text">
              {isSignup ? "Already have an account?" : "New to Cloud-Collab?"}{" "}
              <button
                type="button"
                className="auth-link-button"
                onClick={() => setMode(isSignup ? "login" : "signup")}
              >
                {isSignup ? "Login here" : "Create an account"}
              </button>
            </p>

            <p className="auth-footer-note">
              For Mini Project / Academic Use Only
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
