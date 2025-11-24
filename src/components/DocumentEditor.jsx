// FINAL PRODUCTION VERSION — Cursor FIXED + Typing Indicator + Error-Free

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

  const [autoSaving, setAutoSaving] = useState(false);
  const [saving, setSaving] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); // NEW

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  // FIX cursor overwrite
  const isTyping = useRef(false);

  // Autosave debounce timer
  const saveTimer = useRef(null);
  const typingTimer = useRef(null);

  // ---------------------------------------------------
  // REALTIME LISTENER (never overwrite while typing)
  // ---------------------------------------------------
  useEffect(() => {
    if (!documentId) return;

    const ref = doc(db, "documents", documentId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;

      if (isTyping.current) return; // prevent overwriting local typing

      const data = snap.data();
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
  // TYPING INDICATOR (NEW FEATURE)
  // ---------------------------------------------------
  useEffect(() => {
    if (!documentId || !user) return;

    const ref = collection(db, "documents", documentId, "typing");

    return onSnapshot(ref, (snap) => {
      const list = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.uid !== user.uid);

      setTypingUsers(list);
    });
  }, [documentId, user]);

  const markTyping = async () => {
    const ref = doc(db, "documents", documentId, "typing", user.uid);

    await setDoc(ref, { name: userName });

    if (typingTimer.current) clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(() => {
      deleteDoc(ref);
    }, 2000);
  };

  // ---------------------------------------------------
  // AUTOSAVE
  // ---------------------------------------------------
  const triggerAutosave = () => {
    isTyping.current = true;
    markTyping();

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      await updateDoc(doc(db, "documents", documentId), {
        title,
        content,
        updatedAt: serverTimestamp(),
      });

      isTyping.current = false;
      setLastSaved(new Date());
      setAutoSaving(false);
    }, 1400);
  };

  // ---------------------------------------------------
  // MANUAL SAVE
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
  // FILE UPLOAD
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
  // SHARE
  // ---------------------------------------------------
  const handleShare = async () => {
    setShareError("");
    setShareSuccess("");

    if (!shareEmail.trim()) return setShareError("Enter a valid email");

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

        {autoSaving ? (
          <span className="saving-text">Saving…</span>
        ) : lastSaved ? (
          <span className="saved-text">Saved ✓</span>
        ) : null}

        <button onClick={handleSave}>{saving ? "Saving…" : "Save"}</button>
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

      {/* TYPING INDICATOR */}
      {typingUsers.length > 0 && (
        <div className="typing-banner">
          {typingUsers[0].name} is typing…
        </div>
      )}

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
