// src/components/Navbar.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const displayName = user?.displayName || user?.email;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <nav className="nav-root">
      <div className="nav-left">
        <h1 className="nav-title">Cloud-Collab</h1>
      </div>

      <div className="nav-right">
        {/* USER BADGE */}
        <div className="user-badge" onClick={() => setOpen(!open)}>
          <div className="user-circle">{initial}</div>
          <span className="user-name">{displayName}</span>
        </div>

        {/* DROPDOWN */}
        {open && (
          <div className="user-menu">
            <button
              className="logout-btn"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
