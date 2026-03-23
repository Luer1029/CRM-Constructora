import { useMemo, useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ProveedorPage from "./pages/ProveedorPage";
import GerentePage from "./pages/GerentePage";
import UsuarioPage from "./pages/UsuarioPage";
import SupervisorPage from "./pages/SupervisorPage";

function App() {
  const [rol, setRol] = useState("");

  const pantallaPorRol = useMemo(
    () => ({
      administrador: <AdminDashboard />,
      proveedor: <ProveedorPage />,
      gerente: <GerentePage />,
      usuario: <UsuarioPage />,
      supervisor: <SupervisorPage />
    }),
    []
  );

  const rolNormalizado = rol.toLowerCase();
  const pantalla = pantallaPorRol[rolNormalizado];

  return (
    <div>
      {pantalla ? <>{pantalla}</> : <Login onLoginSuccess={setRol} />}
    </div>
  );
}

export default App;

