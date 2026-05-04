import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import "./App.css";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ProveedorPage from "./pages/ProveedorPage";
import GerentePage from "./pages/GerentePage";
import UsuarioPage from "./pages/UsuarioPage";
import SupervisorPage from "./pages/SupervisorPage";
import { auth } from "./firebase";

function App() {
  const [rol, setRol] = useState("");

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Error al cerrar sesion:", error.message);
    } finally {
      setRol("");
    }
  };

  const pantallaPorRol = useMemo(
    () => ({
      administrador: <AdminDashboard onLogout={cerrarSesion} />,
      proveedor: <ProveedorPage onLogout={cerrarSesion} />,
      gerente: <GerentePage onLogout={cerrarSesion} />,
      usuario: <UsuarioPage onLogout={cerrarSesion} />,
      supervisor: <SupervisorPage />
    }),
    []
  );

  const rolNormalizado = rol.toLowerCase();
  const pantalla = pantallaPorRol[rolNormalizado];

  return (
    <div>
      {pantalla ? (
        <>{pantalla}</>
      ) : (
        <Login onLoginSuccess={setRol} />
      )}
    </div>
  );
}

export default App;

