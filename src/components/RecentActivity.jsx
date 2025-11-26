// RecentActivity.jsx

import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setActivities(list);
    });

    return () => unsub();
  }, []);

  // 📌 Format Timestamp
  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate();
    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="activity-box">
      <h3>Recent Activity</h3>

      {activities.map((a) => (
        <div key={a.id} className="activity-item">
          <strong>{a.userName}</strong> updated <em>{a.title}</em>
          <div className="activity-time">{formatTime(a.createdAt)}</div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivity;
