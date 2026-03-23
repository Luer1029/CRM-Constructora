import "./RolePage.css";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdministradorPage from "./AdministradorPage";
import ProyectosPage from "./ProyectosPage";

function AdminDashboard() {
  const [tab, setTab] = useState("usuarios");

  return (
    <div className="admin-layout">
      <AdminSidebar activeTab={tab} onTabChange={setTab} />
      
      <main className="admin-main-content">
        {tab === "usuarios" && (
          <div className="admin-content-section">
            <AdministradorPage />
          </div>
        )}
        {tab === "proyectos" && (
          <div className="admin-content-section">
            <ProyectosPage />
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
