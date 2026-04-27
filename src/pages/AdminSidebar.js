import { useState } from "react";
import "./AdminSidebar.css";

function AdminSidebar({ activeTab, onTabChange, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="admin-sidebar-container">
      {/* Botón para abrir/cerrar */}
      <div
        className={`sidebar-toggle ${isOpen ? "open" : ""}`}
        onMouseEnter={() => setIsOpen(true)}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="toggle-icon">☰</span>
      </div>

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${isOpen ? "open" : ""}`}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="sidebar-header">
          <h3>Administración</h3>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${activeTab === "dashboard" ? "activo" : ""}`}
            onClick={() => {
              onTabChange("dashboard");
            }}
          >
            <span className="sidebar-icon">📊</span>
            <span className="sidebar-label">Dashboard</span>
          </button>

          <button
            className={`sidebar-item ${activeTab === "usuarios" ? "activo" : ""}`}
            onClick={() => {
              onTabChange("usuarios");
            }}
          >
            <span className="sidebar-icon">👥</span>
            <span className="sidebar-label">Gestión de Usuarios</span>
          </button>

          <button
            className={`sidebar-item ${activeTab === "proyectos" ? "activo" : ""}`}
            onClick={() => {
              onTabChange("proyectos");
            }}
          >
            <span className="sidebar-icon">📁</span>
            <span className="sidebar-label">Gestión de Proyectos</span>
          </button>

          <button
            className={`sidebar-item ${activeTab === "gerentes" ? "activo" : ""}`}
            onClick={() => {
              onTabChange("gerentes");
            }}
          >
            <span className="sidebar-icon">🧭</span>
            <span className="sidebar-label">Gestión de Gerentes</span>
          </button>

          <button
            className={`sidebar-item ${activeTab === "proveedores" ? "activo" : ""}`}
            onClick={() => {
              onTabChange("proveedores");
            }}
          >
            <span className="sidebar-icon">📦</span>
            <span className="sidebar-label">Gestión de Proveedores</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-logout-logo"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Overlay cuando el sidebar está abierto en mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default AdminSidebar;
