import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyByf6R9Y4Dd0xfJHA9QKlOLmqOPRFgLH2c",
  authDomain: "apexhighai.firebaseapp.com",
  projectId: "apexhighai",
  storageBucket: "apexhighai.firebasestorage.app",
  messagingSenderId: "366716475228",
  appId: "1:366716475228:web:bae381e73a1d8db8d49399"
measurementId: "G-45JNJ3GDTP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
