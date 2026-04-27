import { useState } from "react";
import "./RolePage.css";

function RoleQuickSidebar({ title, onLogout }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="role-sidebar-container">
      <button
        className="role-sidebar-toggle"
        onMouseEnter={() => setAbierto(true)}
        onClick={() => setAbierto((prev) => !prev)}
        aria-label="Abrir menu"
      >
        <span className="role-toggle-icon">☰</span>
      </button>

      <aside
        className={`role-sidebar-panel ${abierto ? "open" : ""}`}
        onMouseLeave={() => setAbierto(false)}
      >
        <div className="role-sidebar-header">
          <h3>{title || "Panel"}</h3>
        </div>

        <div className="role-sidebar-content">
          <p>Menu rapido</p>
        </div>

        <div className="role-sidebar-footer">
          <button
            className="role-sidebar-logout"
            onClick={onLogout}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
          >
            ⏻
          </button>
        </div>
      </aside>

      {abierto && <div className="role-sidebar-overlay" onClick={() => setAbierto(false)} />}
    </div>
  );
}

export default RoleQuickSidebar;
