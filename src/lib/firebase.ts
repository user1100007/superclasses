import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import config from "../../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: config.apiKey || "AIzaSyBKjf2wW0Y6qKaIlfSAwOjzxjq0Hdg3vms",
  authDomain: config.authDomain || "superclass-143e5.firebaseapp.com",
  projectId: config.projectId || "superclass-143e5",
  storageBucket: config.storageBucket || "superclass-143e5.firebasestorage.app",
  messagingSenderId: config.messagingSenderId || "222009230782",
  appId: config.appId || "1:222009230782:web:78acc91ecf9c669d42e5ef",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = (config as any).firestoreDatabaseId
  ? getFirestore(app, (config as any).firestoreDatabaseId)
  : getFirestore(app);
export const DB_ROOT = "plp2026";

