import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import "./Login.css";

import { doc, getDoc, setDoc } from "firebase/firestore";

function Login({ onLoginSuccess }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const getFirebaseErrorMessage = (code) => {
    if (code === "auth/invalid-credential") return "Correo o contraseña inválidos.";
    if (code === "auth/user-not-found") return "No existe un usuario con ese correo.";
    if (code === "auth/wrong-password") return "La contraseña es incorrecta.";
    if (code === "auth/invalid-email") return "El correo no tiene un formato válido.";
    if (code === "auth/operation-not-allowed") return "Email/Password no está habilitado en Firebase Auth.";
    if (code === "auth/user-disabled") return "Este usuario está deshabilitado.";
    if (code === "auth/too-many-requests") return "Demasiados intentos. Intenta más tarde.";
    if (code === "auth/network-request-failed") return "Error de red. Revisa tu conexión.";
    if (code === "auth/api-key-not-valid") return "Firebase está mal configurado (API Key inválida).";
    return "No se pudo iniciar sesión.";
  };

  const getFirestoreErrorMessage = (code) => {
    if (code === "permission-denied") return "Login correcto, pero Firestore denegó permisos para leer/escribir usuarios.";
    if (code === "unavailable") return "Firestore no está disponible temporalmente.";
    return "Login correcto, pero no se pudo guardar/consultar el usuario en Firestore.";
  };

  const normalizarRol = (rol) => {
    const valor = (rol || "").toLowerCase().trim();

    if (valor === "provedor") return "proveedor";

    return valor;
  };

  const esRolValido = (rol) => {
    return ["administrador", "proveedor", "gerente", "usuario", "supervisor"].includes(rol);
  };

  const login = async () => {

    if (!email || !password) {
      setMessage("Ingresa correo y contraseña.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = userCredential.user.uid;
      const userRef = doc(db, "usuarios", uid);

      try {
        const userSnap = await getDoc(userRef);
        let rolUsuario = "usuario";

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            correo: userCredential.user.email,
            rol: "usuario"
          });

          console.log("Usuario creado en Firestore");
        } else {
          const data = userSnap.data();
          rolUsuario = normalizarRol(data?.rol);

          if (!esRolValido(rolUsuario)) {
            setMessage("El rol del usuario no es válido en Firestore.");
            return;
          }
        }

        setMessage(`Login correcto. Redirigiendo a ventana ${rolUsuario}.`);
        if (onLoginSuccess) {
          onLoginSuccess(rolUsuario);
        }
        console.log("Login correcto");
      } catch (firestoreError) {
        const firestoreMessage = getFirestoreErrorMessage(firestoreError.code);
        setMessage(`${firestoreMessage} (${firestoreError.code || "sin-código"})`);
        console.log("Error Firestore:", firestoreError.code, firestoreError.message);
      }
    } catch (authError) {
      const baseMessage = getFirebaseErrorMessage(authError.code);
      setMessage(`${baseMessage} (${authError.code || "sin-código"})`);
      console.log("Error Auth:", authError.code, authError.message);
    } finally {

      setLoading(false);

    }

  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h1 className="logo">CRM Constructora</h1>
        <p className="subtitle">Acceso al sistema</p>

        <div className="input-group">
          <span className="icon">📧</span>
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-group">
          <span className="icon">🔒</span>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="login-btn" onClick={login} disabled={loading}>
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>

        {message ? <p className="login-message">{message}</p> : null}
      </div>
    </div>
  );
}

export default Login;