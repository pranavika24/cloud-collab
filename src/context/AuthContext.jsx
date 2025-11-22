// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for authentication state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // SIGNUP
  const signup = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile with display name
    await updateProfile(result.user, { displayName: name });

    // Save user in Firestore for "share document" feature
    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      email,
      name,
    });

    return result.user;
  };

  // LOGIN
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // LOGOUT
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
