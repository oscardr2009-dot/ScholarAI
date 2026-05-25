import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier
} from "firebase/auth";

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const signUpWithEmail = async (email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signInWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const sendPhoneOTP = async (phoneNumber) => {
  const recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible"
  });
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptcha);
  return confirmation;
};
