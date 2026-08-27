import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import fs from "fs";
import path from "path";

let config = {
  projectId: "applied-audio-vxctm",
  appId: "1:988852760261:web:42539edc56cb9c45514aac",
  apiKey: "AIzaSyA_751EmMlH_s3kaWexCX7lSIWRMtQrwB0",
  authDomain: "applied-audio-vxctm.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-coinflip-635f8b3c-7f03-4e97-915b-dccd01ec092f",
  storageBucket: "applied-audio-vxctm.firebasestorage.app",
  messagingSenderId: "988852760261",
};

if (typeof window === "undefined") {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const fileData = JSON.parse(fs.readFileSync(configPath, "utf8"));
      config = { ...config, ...fileData };
    }
  } catch (err) {
    console.warn("Could not read firebase-applet-config.json from disk:", err.message);
  }
}

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore =
  config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)"
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);

export { app };
