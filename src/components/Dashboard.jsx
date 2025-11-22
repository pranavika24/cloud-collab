// src/components/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import DocumentEditor from "./DocumentEditor";
import "./Dashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [title, setTitle] = useState("");
  const [activities, setActivities] = useState([]);

  // toast notification state
  const [toastActivity, setToastActivity] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const lastActivityIdRef = useRef(null);

  // Load ALL documents (shared workspace)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "documents"), orderBy("updatedAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDocs(items);
      if (!selectedDocId && items.length > 0) {
        setSelectedDocId(items[0].id);
      }
    });

    return () => unsub();
  }, [user, selectedDocId]);

  // Load activity + trigger toast for NEW events from other users
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setActivities(list.slice(0, 10));

      const latest = list[0];
      if (!latest) return;

      // ignore own actions
      if (latest.userId === user.uid) return;

      // show toast only for NEW activity (id changed)
      if (lastActivityIdRef.current !== latest.id) {
        lastActivityIdRef.current = latest.id;
        setToastActivity(latest);
        setShowToast(true);
      }
    });

    return () => unsub();
  }, [user]);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(timer);
  }, [showToast]);

  const handleCreateDoc = async () => {
    if (!title.trim()) return;
    if (!user) {
      alert("Please sign in to create a document.");
      return;
    }

    const docRef = await addDoc(collection(db, "documents"), {
      title: title.trim(),
      content: "",
      ownerId: user.uid,
      ownerName: user.displayName || user.email,
      collaborators: [user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "activities"), {
      type: "created",
      documentId: docRef.id,
      title: title.trim(),
      userId: user.uid,
      userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    });

    setTitle("");
    setSelectedDocId(docRef.id);
  };

  const handleDeleteDoc = async (id, docTitle) => {
    if (!window.confirm("Delete this document?")) return;

    await deleteDoc(doc(db, "documents", id));

    await addDoc(collection(db, "activities"), {
      type: "deleted",
      documentId: id,
      title: docTitle,
      userId: user.uid,
      userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    });

    if (selectedDocId === id) setSelectedDocId(null);
  };

  const renderActivityLabel = (a) => {
    if (a.type === "created") return "created";
    if (a.type === "updated") return "updated";
    if (a.type === "deleted") return "deleted";
    if (a.type === "file-upload") return "uploaded files to";
    return "changed";
  };

  return (
    <div className="dash-root">
      {/* Toast notification */}
      {toastActivity && showToast && (
        <div className="dash-toast">
          <div className="dash-toast-title">Live update</div>
          <div className="dash-toast-body">
            <strong>{toastActivity.userName || "Someone"}</strong>{" "}
            {renderActivityLabel(toastActivity)}{" "}
            <em>{toastActivity.title || "a document"}</em>
          </div>
          <button
            className="dash-toast-close"
            onClick={() => setShowToast(false)}
          >
            ×
          </button>
        </div>
      )}

      <div className="dash-sidebar">
        <div className="dash-newdoc-card">
          <h2>New Document</h2>
          <input
            type="text"
            placeholder="Enter document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button onClick={handleCreateDoc}>Create</button>
        </div>

        <div className="dash-doclist">
          <h3>Your Documents</h3>
          {docs.length === 0 && <p className="muted">No documents yet.</p>}
          <ul>
            {docs.map((d) => (
              <li
                key={d.id}
                className={
                  selectedDocId === d.id ? "doc-item selected" : "doc-item"
                }
              >
                <button onClick={() => setSelectedDocId(d.id)}>
                  <span className="doc-title">{d.title || "Untitled"}</span>
                  {d.ownerName && (
                    <span className="doc-owner">by {d.ownerName}</span>
                  )}
                </button>
                <div className="doc-actions">
                  <button
                    className="danger"
                    onClick={() => handleDeleteDoc(d.id, d.title)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-activity">
          <h3>Recent Activity</h3>
          {activities.length === 0 && (
            <p className="muted">No recent changes.</p>
          )}
          <ul>
            {activities.map((a) => (
              <li key={a.id}>
                <span className="activity-text">
                  <strong>{a.userName}</strong>{" "}
                  {renderActivityLabel(a)} <em>{a.title}</em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dash-main">
        {selectedDocId ? (
          <DocumentEditor documentId={selectedDocId} />
        ) : (
          <div className="dash-empty">
            <h2>Select or create a document to start collaborating.</h2>
            <p>
              Multiple users can edit the same document in real time. Upload
              files like PDF/DOC/XLS as supporting material.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
