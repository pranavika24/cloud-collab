// FINAL STABLE EDITOR — No Cursor Jump, No Letter Delete, No Overwrite

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

  // STATES
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [activeUsers, setActiveUsers] = useState([]);

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  // Cursor protection
  const isTyping = useRef(false);
  const saveTimer = useRef(null);

  // ---------------------------------------------------
  // REALTIME SNAPSHOT (DO NOT overwrite while typing)
  // ---------------------------------------------------
  useEffect(() => {
    if (!documentId) return;

    const ref = doc(db, "documents", documentId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      // Prevent overwrite while typing
      if (isTyping.current) return;

      setTitle((prev) => (prev !== data.title ? data.title : prev));
      setContent((prev) => (prev !== data.content ? data.content : prev));
    });

    return () => unsub();
  }, [documentId]);

  // ---------------------------------------------------
  // LOAD FILES
  // ---------------------------------------------------
  useEffect(() => {
    if (!documentId) return;

    const q = query(
      collection(db, "documents", documentId, "files"),
      orderBy("uploadedAt", "desc")
    );

    const unsub = onSnapshotCollection(q, (snap) => {
      setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [documentId]);

  // ---------------------------------------------------
  // ACTIVE USERS
  // ---------------------------------------------------
  useEffect(() => {
    if (!documentId || !user) return;

    const ref = doc(db, "documents", documentId, "activeUsers", user.uid);

    setDoc(ref, {
      name: userName,
      joinedAt: serverTimestamp(),
    });

    return () => deleteDoc(ref);
  }, [documentId, user, userName]);

  useEffect(() => {
    if (!documentId) return;

    const ref = collection(db, "documents", documentId, "activeUsers");

    return onSnapshot(ref, (snap) => {
      setActiveUsers(snap.docs.map((d) => d.data()));
    });
  }, [documentId]);

  // ---------------------------------------------------
  // AUTOSAVE (with strong debounce + cursor protection)
  // ---------------------------------------------------
  const triggerAutosave = () => {
    isTyping.current = true;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      setAutoSaving(true);

      const ref = doc(db, "documents", documentId);

      await updateDoc(ref, {
        title,
        content,
        updatedAt: serverTimestamp(),
      });

      isTyping.current = false;
      setAutoSaving(false);
      setLastSaved(new Date());
    }, 1500);
  };

  // ---------------------------------------------------
  // MANUAL SAVE BUTTON
  // ---------------------------------------------------
  const handleSave = async () => {
    setSaving(true);

    await updateDoc(doc(db, "documents", documentId), {
      title,
      content,
      updatedAt: serverTimestamp(),
    });

    setSaving(false);
    setLastSaved(new Date());
  };

  // ---------------------------------------------------
  // UPLOAD FILES
  // ---------------------------------------------------
  const uploadFile = async (file, path) => {
    const { error } = await supabase.storage.from("documents").upload(path, file);

    if (error) throw error;

    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileUpload = async (e) => {
    const list = [...e.target.files];
    if (!list.length) return;

    setUploading(true);

    for (const file of list) {
      const path = `${documentId}/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);

      await addDoc(collection(db, "documents", documentId, "files"), {
        name: file.name,
        url,
        uploadedByName: userName,
        uploadedAt: serverTimestamp(),
      });
    }

    setUploading(false);
  };

  // ---------------------------------------------------
  // SHARE DOCUMENT
  // ---------------------------------------------------
  const handleShare = async () => {
    setShareError("");
    setShareSuccess("");

    if (!shareEmail.trim()) {
      return setShareError("Enter valid email");
    }

    const snap = await getDocs(
      query(collection(db, "users"), where("email", "==", shareEmail.trim()))
    );

    if (snap.empty) return setShareError("User not found");

    const uid = snap.docs[0].data().uid;

    await updateDoc(doc(db, "documents", documentId), {
      collaborators: arrayUnion(uid),
    });

    setShareSuccess("User added!");
    setShareEmail("");
  };

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------
  return (
    <div className="doc-root">

      {/* HEADER */}
      <div className="doc-header">
        <input
          className="doc-title-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            triggerAutosave();
          }}
        />

        {autoSaving ? <span className="saving-text">Saving…</span> : null}
        {lastSaved && !autoSaving ? (
          <span className="saved-text">Saved ✓</span>
        ) : null}

        <button onClick={handleSave}>
          {saving ? "Saving…" : "Save"}
        </button>

        <button className="share-btn" onClick={() => setShowShare(true)}>
          Share
        </button>
      </div>

      {/* ACTIVE USERS */}
      <div className="active-users-bar">
        {activeUsers.map((u, i) => (
          <div key={i} className="active-user">
            {u.name?.charAt(0).toUpperCase()}
          </div>
        ))}
        <span className="active-label">{activeUsers.length} active now</span>
      </div>

      {/* BODY */}
      <div className="doc-body">
        <textarea
          className="doc-editor"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            triggerAutosave();
          }}
          placeholder="Start typing..."
        />

        {/* SIDEBAR */}
        <div className="doc-sidebar">
          <div className="upload-card">
            <h3>Upload Files</h3>
            <input type="file" multiple onChange={handleFileUpload} />
            {uploading && <p>Uploading…</p>}
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
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="user@example.com"
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
