import "./RolePage.css";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

function ProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);

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

  return (
    <div className="pagina-rol">
      <div className="contenedor-rol">
        <h1>📁 Gestión de Proyectos</h1>

        {mensaje && (
          <div className={`mensaje ${mensaje.includes("Error") ? "error" : "exito"}`}>
            {mensaje}
          </div>
        )}

        <button
          className="btn-agregar"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? "Cancelar" : "+ Nuevo Proyecto"}
        </button>

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
          <h2>Proyectos Activos</h2>
          {cargando ? (
            <p>Cargando proyectos...</p>
          ) : proyectos.length === 0 ? (
            <p>No hay proyectos activos.</p>
          ) : (
            <div className="tabla-container">
              <table className="tabla-proyectos">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Ubicación</th>
                    <th>Inicio</th>
                    <th>Fin Estimado</th>
                    <th>Presupuesto</th>
                    <th>Progreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.map((proyecto) => (
                    <tr key={proyecto.id}>
                      <td>{proyecto.nombre}</td>
                      <td>{proyecto.ubicacion}</td>
                      <td>{new Date(proyecto.fechaInicio).toLocaleDateString()}</td>
                      <td>{new Date(proyecto.fechaEstimada).toLocaleDateString()}</td>
                      <td>${proyecto.presupuesto.toLocaleString()}</td>
                      <td>
                        <div className="barra-progreso">
                          <div
                            className="progreso-relleno"
                            style={{ width: `${proyecto.progreso}%` }}
                          />
                          <span>{proyecto.progreso}%</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn-ver">Ver</button>
                        <button className="btn-editar">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProyectosPage;
