import "./RolePage.css";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

function ProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Estados del formulario
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaEstimada, setFechaEstimada] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [estado, setEstado] = useState("activo");

  // Cargar proyectos al montar el componente
  useEffect(() => {
    cargarProyectos();
  }, []);

  const cargarProyectos = async () => {
    try {
      setCargando(true);
      const proyectosRef = collection(db, "proyectos");
      const querySnapshot = await getDocs(proyectosRef);
      const proyectosList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProyectos(proyectosList);
      setMensaje("");
    } catch (error) {
      // Si la colección no existe o hay problemas, simplemente mostramos lista vacía
      console.log("Proyectos:", error.message);
      setProyectos([]);
      if (!error.message.includes("collection") && !error.message.includes("permission")) {
        setMensaje("Error al cargar proyectos: " + error.message);
      }
    } finally {
      setCargando(false);
    }
  };

  const crearProyecto = async () => {
    if (!nombreProyecto || !descripcion || !ubicacion || !fechaInicio || !fechaEstimada || !presupuesto) {
      setMensaje("Por favor completa todos los campos.");
      return;
    }

    try {
      const nuevoProyecto = {
        nombre: nombreProyecto,
        descripcion: descripcion,
        ubicacion: ubicacion,
        fechaInicio: fechaInicio,
        fechaEstimada: fechaEstimada,
        presupuesto: parseFloat(presupuesto),
        estado: estado,
        fechaCreacion: new Date().toISOString(),
        progreso: 0,
      };

      const docRef = await addDoc(collection(db, "proyectos"), nuevoProyecto);
      setMensaje("¡Proyecto creado exitosamente!");

      // Limpiar formulario
      setNombreProyecto("");
      setDescripcion("");
      setUbicacion("");
      setFechaInicio("");
      setFechaEstimada("");
      setPresupuesto("");
      setEstado("activo");
      setMostrarFormulario(false);

      // Recargar proyectos
      cargarProyectos();
    } catch (error) {
      setMensaje("Error al crear proyecto: " + error.message);
    }
  };

  // Calcular estadísticas
  const totalProyectos = proyectos.length;
  const enEjecucion = proyectos.filter(p => p.estado === "activo" || p.estado === "en progreso").length;
  const presupuestoTotal = proyectos.reduce((sum, p) => sum + (p.presupuesto || 0), 0);
  const progresoPromedio = proyectos.length > 0 
    ? Math.round(proyectos.reduce((sum, p) => sum + (p.progreso || 0), 0) / proyectos.length)
    : 0;

  // Filtrar proyectos
  const proyectosFiltrados = filtroEstado === "todos" 
    ? proyectos 
    : proyectos.filter(p => p.estado === filtroEstado);

  const getStatusBadge = (estado) => {
    const estados = {
      "activo": { label: "En progreso", class: "badge-progreso" },
      "en progreso": { label: "En progreso", class: "badge-progreso" },
      "finalizado": { label: "Finalizado", class: "badge-finalizado" },
      "pendiente": { label: "Pendiente", class: "badge-pendiente" },
      "en espera": { label: "En espera", class: "badge-espera" }
    };
    return estados[estado?.toLowerCase()] || { label: estado, class: "badge-default" };
  };

  return (
    <div className="pagina-rol">
      <div className="contenedor-rol">
        <div className="header-proyectos">
          <h1>&emsp;📁 Lista de Proyectos</h1>
          <p className="sub-titulo">Gestiona y supervisa el progreso de tus obras activas.</p>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="resumen-cards">
          <div className="card-resumen">
            <div className="card-header">TOTAL PROYECTOS</div>
            <div className="card-numero">{totalProyectos}</div>
           
          </div>
          <div className="card-resumen">
            <div className="card-header">EN EJECUCIÓN</div>
            <div className="card-numero">{enEjecucion}</div>
            
          </div>
          <div className="card-resumen">
            <div className="card-header">PRESUPUESTO EJECUTADO</div>
            <div className="card-numero">{progresoPromedio}%</div>
            <div className="card-progreso">
              <div className="progress-bar" style={{ width: `${progresoPromedio}%` }}></div>
            </div>
          </div>
        </div>

        {mensaje && (
          <div className={`mensaje ${mensaje.includes("Error") ? "error" : "exito"}`}>
            {mensaje}
          </div>
        )}

        <div className="controles-proyectos">
          <button
            className="btn-agregar"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
          >
            {mostrarFormulario ? "Cancelar" : "+ Nuevo Proyecto"}
          </button>
        </div>

        {mostrarFormulario && (
          <div className="formulario-container">
            <h2>Crear Nuevo Proyecto</h2>
            <div className="form-grupo">
              <label>Nombre del Proyecto:</label>
              <input
                type="text"
                value={nombreProyecto}
                onChange={(e) => setNombreProyecto(e.target.value)}
                placeholder="Ej: Construcción Centro Comercial"
              />
            </div>

            <div className="form-grupo">
              <label>Descripción:</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe el proyecto"
                rows="4"
              />
            </div>

            <div className="form-grupo">
              <label>Ubicación:</label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej: Av. Principal 123"
              />
            </div>

            <div className="form-fila">
              <div className="form-grupo">
                <label>Fecha de Inicio:</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="form-grupo">
                <label>Fecha Estimada de Fin:</label>
                <input
                  type="date"
                  value={fechaEstimada}
                  onChange={(e) => setFechaEstimada(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grupo">
              <label>Presupuesto ($):</label>
              <input
                type="number"
                value={presupuesto}
                onChange={(e) => setPresupuesto(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <button className="btn-submeter" onClick={crearProyecto}>
              Crear Proyecto
            </button>
          </div>
        )}

        <div className="lista-contenedor">
          <div className="lista-header">
            <h2>Proyectos</h2>
            <div className="filtros-estado">
              <button 
                className={`filtro-btn ${filtroEstado === "todos" ? "activo" : ""}`}
                onClick={() => setFiltroEstado("todos")}
              >
                Todos
              </button>
              <button 
                className={`filtro-btn ${filtroEstado === "activo" ? "activo" : ""}`}
                onClick={() => setFiltroEstado("activo")}
              >
                En Progreso
              </button>
              <button 
                className={`filtro-btn ${filtroEstado === "finalizado" ? "activo" : ""}`}
                onClick={() => setFiltroEstado("finalizado")}
              >
                Finalizados
              </button>
            </div>
          </div>

          {cargando ? (
            <p className="estado-mensaje">Cargando proyectos...</p>
          ) : proyectosFiltrados.length === 0 ? (
            <p className="estado-mensaje">No hay proyectos en este estado.</p>
          ) : (
            <div className="tabla-container">
              <table className="tabla-proyectos">
                <thead>
                  <tr>
                    <th>NOMBRE DEL PROYECTO</th>
                    <th>DIRECCIÓN</th>
                    <th>ESTADO</th>
                    <th>AVANCE (%)</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosFiltrados.map((proyecto) => {
                    const statusInfo = getStatusBadge(proyecto.estado);
                    return (
                      <tr key={proyecto.id}>
                        <td>
                          <div className="proyecto-nombre">
                            <span className="proyecto-icon">📁</span>
                            {proyecto.nombre}
                          </div>
                        </td>
                        <td>{proyecto.ubicacion}</td>
                        <td>
                          <span className={`badge ${statusInfo.class}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>
                          <div className="celda-progreso">
                            <div className="progreso-visual">
                              <div
                                className="progreso-relleno"
                                style={{ width: `${proyecto.progreso}%` }}
                              />
                            </div>
                            <span className="progreso-texto">{proyecto.progreso}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="acciones-tabla">
                            <button className="btn-ver">Ver detalle</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="tabla-footer">
                <p>Mostrando {proyectosFiltrados.length} de {totalProyectos} proyectos</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProyectosPage;
