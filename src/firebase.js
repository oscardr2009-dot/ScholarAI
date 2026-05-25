import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "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",
  authDomain: "apexhighai.firebaseapp.com",
  projectId: "apexhighai",
  storageBucket: "apexhighai.firebasestorage.app",
  messagingSenderId: "366716475228",
  appId: "1:366716475228:web:bae381e73a1d8db8d49399"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
