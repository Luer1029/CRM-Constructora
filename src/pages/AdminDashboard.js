import "./RolePage.css";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdministradorPage from "./AdministradorPage";
import ProyectosPage from "./ProyectosPage";
import GerentesAdminPage from "./GerentesAdminPage";
import ProveedoresAdminPage from "./ProveedoresAdminPage";
import DashboardPage from "./DashboardPage";

function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="admin-layout">
      <AdminSidebar activeTab={tab} onTabChange={setTab} onLogout={onLogout} />
      
      <main className="admin-main-content">
        {tab === "dashboard" && (
          <div className="admin-content-section">
            <DashboardPage onTabChange={setTab} />
          </div>
        )}
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
        {tab === "gerentes" && (
          <div className="admin-content-section">
            <GerentesAdminPage />
          </div>
        )}
        {tab === "proveedores" && (
          <div className="admin-content-section">
            <ProveedoresAdminPage />
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
