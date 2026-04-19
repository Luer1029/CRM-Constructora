import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";

import { doc, getDoc, setDoc } from "firebase/firestore";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {

    try {

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      const userRef = doc(db, "usuarios", uid);
      const userSnap = await getDoc(userRef);

      // si no existe en firestore
      if (!userSnap.exists()) {

        await setDoc(userRef, {
          correo: email,
          rol: "usuario"
        });

        console.log("Usuario creado en Firestore");

      }

      console.log("Login correcto");

    } catch (error) {

      console.log("Error:", error.message);

    }

  };

  return (
    <div>

      <h2>Login CRM</h2>

      <input
        type="email"
        placeholder="Correo"
        onChange={(e) => setEmail(e.target.value)}
      />

      <br/>

      <input
        type="password"
        placeholder="Contraseña"
        onChange={(e) => setPassword(e.target.value)}
      />

      <br/>

      <button onClick={login}>
        Iniciar sesión
      </button>

    </div>
  );
}

export default Login;