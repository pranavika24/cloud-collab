// FINAL — Independent Editing Mode (No Cursor Jump)

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

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  const [activeUsers, setActiveUsers] = useState([]);

  // Prevent unwanted overwrite while typing
  const isTyping = useRef(false);

  // Autosave timer
  const saveTimer = useRef(null);

  // ---------------------------------------------------
  // LOAD DOCUMENT FROM FIREBASE (but NEVER override while typing)
  // ---------------------------------------------------
  useEffect(() => {
    if (!documentId) return;

    const ref = doc(db, "documents", documentId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      // DO NOT overwrite if user is typing
      if (isTyping.current) return;

      // Only update when content actually changes
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

    const usersRef = collection(db, "documents", documentId, "activeUsers");

    const unsub = onSnapshot(usersRef, (snap) => {
      setActiveUsers(snap.docs.map((d) => d.data()));
    });

    return () => unsub();
  }, [documentId]);

  // ---------------------------------------------------
  // MANUAL SAVE BUTTON
  // ---------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    isTyping.current = true;

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

    isTyping.current = false;
    setLastSaved(new Date());
    setSaving(false);
  };

  // ---------------------------------------------------
  // AUTOSAVE (Independent Editing)
  // ---------------------------------------------------
  const triggerAutosave = () => {
    isTyping.current = true;

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
    }, 1300);
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
    const list = Array.from(e.target.files);
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
      setShareError("Enter a valid email");
      return;
    }

    const snap = await getDocs(
      query(collection(db, "users"), where("email", "==", shareEmail.trim()))
    );

    if (snap.empty) {
      setShareError("User not found");
      return;
    }

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

        {autoSaving ? <span className="saving-text">Saving…</span> : lastSaved ? (
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
            {u.name?.charAt(0)?.toUpperCase()}
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
              placeholder="user@example.com"
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
