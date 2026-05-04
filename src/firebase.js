// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1CxfVgXsaq4OFQxOEzLBvy7hQwRaAjZ8",
  authDomain: "crm-constructora-68a12.firebaseapp.com",
  projectId: "crm-constructora-68a12",
  storageBucket: "crm-constructora-68a12.firebasestorage.app",
  messagingSenderId: "18409206995",
  appId: "1:18409206995:web:64d4d5cb93486407549026",
  measurementId: "G-MPXVVJ09YE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Instancia secundaria para crear usuarios sin reemplazar la sesión actual.
const SECONDARY_APP_NAME = "crm-constructora-secondary";
const secondaryApp = getApps().some((item) => item.name === SECONDARY_APP_NAME)
  ? getApp(SECONDARY_APP_NAME)
  : initializeApp(firebaseConfig, SECONDARY_APP_NAME);

export const secondaryAuth = getAuth(secondaryApp);
export const secondaryDb = getFirestore(secondaryApp);
