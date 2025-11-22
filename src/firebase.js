import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA_W10a2QArzMpkVa6bg661r-FifKcnleo",
  authDomain: "cloud-collab-f0a73.firebaseapp.com",
  projectId: "cloud-collab-f0a73",
  storageBucket: "cloud-collab-f0a73.appspot.com", // ✅ FIXED
  messagingSenderId: "809654575822",
  appId: "1:809654575822:web:b15a0b09b8849fbece269f"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
