// eslint-disable-next-line
import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot as onSnapshotCollection,
  serverTimestamp,
  where,
  getDocs,
  arrayUnion,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import "./DocumentEditor.css";

const DocumentEditor = ({ documentId }) => {
  const { user } = useAuth();
  const userName = user?.displayName || user?.email;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  const [activeUsers, setActiveUsers] = useState([]);
  const saveTimeoutRef = useRef(null);

  // Load Document realtime
  useEffect(() => {
    if (!documentId) return;

    const docRef = doc(db, "documents", documentId);
    const unsub = onSnapshot(docRef, (snap) => {
      const data = snap.data();
      if (data) {
        setTitle(data.title || "");
        setContent(data.content || "");
      }
    });

    return () => unsub();
  }, [documentId]);

  // Load Files realtime
  useEffect(() => {
    if (!documentId) return;

    const q = query(
      collection(db, "documents", documentId, "files"),
      orderBy("uploadedAt", "desc")
    );

    const unsub = onSnapshotCollection(q, (snapshot) => {
      setFiles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [documentId]);

  // Active users tracker — ignore ESLint dependency rule completely
  useEffect(() => {
    if (!documentId || !user) return;

    const userRef = doc(
      db,
      "documents",
      documentId,
      "activeUsers",
      user.uid
    );

    setDoc(userRef, {
      name: userName,
      enteredAt: serverTimestamp(),
    });

    return () => deleteDoc(userRef);

    // eslint-disable-next-line
  }, [documentId, user]);

  // Listen active users
  useEffect(() => {
    if (!documentId) return;

    const activeRef = collection(db, "documents", documentId, "activeUsers");
    const unsub = onSnapshot(activeRef, (snapshot) => {
      setActiveUsers(snapshot.docs.map((d) => d.data()));
    });

    return () => unsub();
  }, [documentId]);

  // Manual save
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "documents", documentId), {
        title,
        content,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activities"), {
        type: "updated",
        documentId,
        title,
        userId: user.uid,
        userName,
        createdAt: serverTimestamp(),
      });

      setLastSaved(new Date());
    } catch {
      setErrorMsg("Save failed.");
    }
    setSaving(false);
  };

  // Auto-save
  const handleAutoSave = async () => {
    setAutoSaving(true);
    try {
      await updateDoc(doc(db, "documents", documentId), {
        title,
        content,
        updatedAt: serverTimestamp(),
      });
      setLastSaved(new Date());
    } catch {}
    setAutoSaving(false);
  };

  // Upload file
  const uploadToSupabase = async (file, path) => {
    const { error } = await supabase.storage
      .from("documents")
      .upload(path, file);

    if (error) throw error;

    const { data: urlObj } = supabase.storage
      .from("documents")
      .getPublicUrl(path);

    return urlObj.publicUrl;
  };

  // Handle upload
  const handleFileUpload = async (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;

    setUploading(true);

    try {
      for (const file of list) {
        const path = `${documentId}/${Date.now()}_${file.name}`;
        const url = await uploadToSupabase(file, path);

        await addDoc(collection(db, "documents", documentId, "files"), {
          name: file.name,
          size: file.size,
          url,
          uploadedByName: userName,
          uploadedAt: serverTimestamp(),
        });
      }
    } catch {
      setErrorMsg("Upload failed.");
    }

    setUploading(false);
    e.target.value = "";
  };

  // Share
  const handleShare = async () => {
    setShareError("");
    setShareSuccess("");

    if (!shareEmail.trim()) return setShareError("Enter an email.");

    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("email", "==", shareEmail.trim()))
      );

      if (snap.empty) return setShareError("User not found.");

      const targetUid = snap.docs[0].data().uid;

      await updateDoc(doc(db, "documents", documentId), {
        collaborators: arrayUnion(targetUid),
      });

      setShareSuccess("User added!");
      setShareEmail("");
    } catch {
      setShareError("Share failed.");
    }
  };

  return (
    <div className="doc-root">

      {/* HEADER */}
      <div className="doc-header">
        <input
          className="doc-title-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);

            if (saveTimeoutRef.current)
              clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(handleAutoSave, 1500);
          }}
        />

        {autoSaving ? (
          <span className="saving-text">Saving...</span>
        ) : lastSaved ? (
          <span className="saved-text">Saved ✓</span>
        ) : null}

        <button onClick={handleSave}>
          {saving ? "Saving..." : "Save"}
        </button>

        <button className="share-btn" onClick={() => setShowShare(true)}>
          Share
        </button>
      </div>

      {/* ACTIVE USERS */}
      <div className="active-users-bar">
        {activeUsers.map((u, i) => (
          <div key={i} className="active-user">
            {u.name.charAt(0).toUpperCase()}
          </div>
        ))}
        <span className="active-label">
          {activeUsers.length} people here now
        </span>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="doc-body">
        <textarea
          className="doc-editor"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);

            if (saveTimeoutRef.current)
              clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(handleAutoSave, 1500);
          }}
          placeholder="Start typing..."
        />

        {/* SIDEBAR */}
        <div className="doc-sidebar">
          <div className="upload-card">
            <h3>Upload Files</h3>
            <input type="file" multiple onChange={handleFileUpload} />
            {uploading && <p>Uploading...</p>}
          </div>

          <div className="files-card">
            <h3>Files</h3>
            <ul>
              {files.map((f) => (
                <li key={f.id}>
                  <a href={f.url} target="_blank" rel="noreferrer">
                    {f.name}
                  </a>
                  <span> — {f.uploadedByName}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* SHARE POPUP */}
      {showShare && (
        <div className="share-popup">
          <div className="share-card">
            <h3>Share Document</h3>

            <input
              type="email"
              placeholder="user@example.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />

            {shareError && <p className="share-error">{shareError}</p>}
            {shareSuccess && <p className="share-success">{shareSuccess}</p>}

            <div className="share-actions">
              <button onClick={handleShare}>Add</button>
              <button className="close" onClick={() => setShowShare(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentEditor;
