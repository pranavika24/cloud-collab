// src/App.js
import React from "react";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";
import "./App.css";

const AppInner = () => {
  const { user } = useAuth();

  if (!user) return <AuthPage />;

  return (
    <>
      <Navbar />
      <Dashboard />
    </>
  );
};

const App = () => {
  return <AppInner />;
};

export default App;
