import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA9PY5uxD9xLbpy00Rc1JYFWPUaM5JS-YY",
  authDomain: "zapotlan-grafico-web.firebaseapp.com",
  projectId: "zapotlan-grafico-web",
  storageBucket: "zapotlan-grafico-web.firebasestorage.app",
  messagingSenderId: "557389080481",
  appId: "1:557389080481:web:0c06df2d2c9cfbd1024de0",
  measurementId: "G-YE3GRZ7T3Z"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
