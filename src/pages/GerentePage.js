import "./RolePage.css";
<<<<<<< HEAD

function GerentePage() {
  return (
    <div className="role-bg">
      <div className="role-card">
        <h2 className="role-header">Panel Gerente</h2>
        <div className="role-content">
          <p className="role-message">Bienvenido al sistema CRM Constructora.</p>
          <span className="role-badge">Rol: Gerente</span>
        </div>
=======
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import RoleQuickSidebar from "./RoleQuickSidebar";
import { generarResumenProyectoPdf } from "../utils/pdfReportUtils";

const normalizarTexto = (valor) => String(valor || "").toLowerCase().trim();

const formatoMoneda = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero) || numero <= 0) return "No definido";
  return numero.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
};

const formatoFecha = (valor) => {
  if (!valor) return "No definida";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "No definida";
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const obtenerClaseEstado = (estado) => {
  const valor = normalizarTexto(estado);
  if (valor === "activo" || valor === "en progreso") return "badge-progreso";
  if (valor === "finalizado") return "badge-finalizado";
  if (valor === "pendiente") return "badge-pendiente";
  if (valor === "en espera") return "badge-espera";
  return "badge-default";
};

const formatoFechaHora = (valor) => {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizarTareas = (tareas) => {
  if (!Array.isArray(tareas)) return [];

  return tareas
    .map((tarea, indice) => ({
      id: String(tarea?.id || tarea?.tareaId || tarea?.uid || `${indice}-${tarea?.titulo || tarea?.nombre || "tarea"}`),
      titulo: String(tarea?.titulo || tarea?.nombre || tarea?.descripcion || "Tarea sin nombre").trim(),
      descripcion: String(tarea?.descripcion || tarea?.detalle || "").trim(),
      departamento: String(tarea?.departamento || tarea?.departamentoEncargado || tarea?.area || "").trim(),
      revisado: Boolean(tarea?.revisado || tarea?.completada || tarea?.revisada),
    }))
    .filter((tarea) => tarea.titulo.length > 0);
};

const normalizarBitacoras = (bitacoras) => {
  if (!Array.isArray(bitacoras)) return [];

  return bitacoras
    .map((bitacora, indice) => ({
      id: String(bitacora?.id || bitacora?.bitacoraId || `${indice}-${bitacora?.titulo || "bitacora"}`),
      titulo: String(bitacora?.titulo || "Bitacora sin titulo").trim(),
      desarrollo: String(bitacora?.desarrollo || bitacora?.detalle || bitacora?.descripcion || "").trim(),
      fechaPublicacion: bitacora?.fechaPublicacion || bitacora?.fecha || bitacora?.creadaEn || "",
      proveedorNombre: String(bitacora?.proveedorNombre || "").trim(),
    }))
    .filter((bitacora) => bitacora.titulo.length > 0 || bitacora.desarrollo.length > 0)
    .sort((a, b) => new Date(b.fechaPublicacion || 0).getTime() - new Date(a.fechaPublicacion || 0).getTime());
};

function GerentePage({ onLogout }) {
  const [proyectosAsignados, setProyectosAsignados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [mensajePdf, setMensajePdf] = useState("");

  useEffect(() => {
    const cargarProyectosDeGerente = async () => {
      const usuarioActual = auth.currentUser;
      const gerenteId = usuarioActual?.uid;

      if (!gerenteId) {
        setMensaje("No se encontro una sesion valida para gerente.");
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        const snapshot = await getDocs(collection(db, "proyectos"));

        const proyectos = snapshot.docs
          .map((documento) => ({ id: documento.id, ...documento.data() }))
          .filter((proyecto) => {
            if (proyecto.oculto) return false;

            return normalizarTexto(proyecto.gerenteId) === normalizarTexto(gerenteId);
          })
          .sort((a, b) => {
            const fechaA = new Date(a.fechaCreacion || a.fechaInicio || 0).getTime();
            const fechaB = new Date(b.fechaCreacion || b.fechaInicio || 0).getTime();
            return fechaB - fechaA;
          });

        setProyectosAsignados(proyectos);
        setMensaje("");
      } catch (error) {
        console.log(error);
        setMensaje("No se pudo cargar la informacion del proyecto asignado.");
      } finally {
        setCargando(false);
      }
    };

    cargarProyectosDeGerente();
  }, []);

  const resumen = useMemo(() => {
    const total = proyectosAsignados.length;
    const enEjecucion = proyectosAsignados.filter((proyecto) => {
      const estado = normalizarTexto(proyecto.estado);
      return estado === "activo" || estado === "en progreso";
    }).length;

    const promedioAvance = total
      ? Math.round(
          proyectosAsignados.reduce((acumulado, proyecto) => acumulado + (Number(proyecto.progreso) || 0), 0) /
            total
        )
      : 0;

    return {
      total,
      enEjecucion,
      promedioAvance,
    };
  }, [proyectosAsignados]);

  const proyectoPrincipal = proyectosAsignados[0];

  const tareasProyectoPrincipal = useMemo(() => {
    if (!proyectoPrincipal) return [];
    return normalizarTareas(proyectoPrincipal.tareasObra || proyectoPrincipal.tareas || []);
  }, [proyectoPrincipal]);

  const tareasCompletadas = useMemo(
    () => tareasProyectoPrincipal.filter((tarea) => tarea.revisado),
    [tareasProyectoPrincipal]
  );

  const tareasPendientes = useMemo(
    () => tareasProyectoPrincipal.filter((tarea) => !tarea.revisado),
    [tareasProyectoPrincipal]
  );

  const bitacorasProyectoPrincipal = useMemo(() => {
    if (!proyectoPrincipal) return [];
    return normalizarBitacoras(proyectoPrincipal.bitacorasObra || proyectoPrincipal.bitacoras || []);
  }, [proyectoPrincipal]);

  const descargarResumenProyecto = (proyecto) => {
    if (!proyecto) {
      setMensajePdf("No hay proyecto para generar reporte.");
      return;
    }

    try {
      const tareas = normalizarTareas(proyecto.tareasObra || proyecto.tareas || []);
      const bitacoras = normalizarBitacoras(proyecto.bitacorasObra || proyecto.bitacoras || []);
      const nombreProyecto = (proyecto.nombre || "proyecto").toLowerCase().replace(/\s+/g, "-");

      generarResumenProyectoPdf({
        nombreArchivo: `reporte-gerente-${nombreProyecto}.pdf`,
        tituloReporte: "Resumen de Proyecto del Gerente",
        subtitulo: `Gerente responsable: ${auth.currentUser?.email || "Gerente"}`,
        area: "Gerencia",
        proyecto,
        tareasCompletadas: tareas.filter((tarea) => tarea.revisado),
        tareasPendientes: tareas.filter((tarea) => !tarea.revisado),
        bitacoras,
      });
      setMensajePdf("PDF descargado correctamente.");
    } catch (error) {
      console.log(error);
      setMensajePdf("No se pudo generar el PDF del proyecto.");
    }
  };

  return (
    <div className="pagina-rol">
      <RoleQuickSidebar title="Panel Gerente" onLogout={onLogout} />
      <div className="contenedor-rol gerente-view">
        <div className="header-proyectos">
          <h1>Panel de Gerente</h1>
          <p className="sub-titulo">Consulta tus proyectos asignados y el estado operativo de cada obra.</p>
        </div>

        {mensaje && <div className="mensaje error">{mensaje}</div>}

        <div className="resumen-cards">
          <div className="card-resumen">
            <div className="card-header">PROYECTOS ASIGNADOS</div>
            <div className="card-numero">{resumen.total}</div>
          </div>
          <div className="card-resumen">
            <div className="card-header">EN EJECUCION</div>
            <div className="card-numero">{resumen.enEjecucion}</div>
          </div>
          <div className="card-resumen">
            <div className="card-header">AVANCE PROMEDIO</div>
            <div className="card-numero">{resumen.promedioAvance}%</div>
            <div className="card-progreso">
              <div className="progress-bar" style={{ width: `${resumen.promedioAvance}%` }} />
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="lista-contenedor">
            <p className="estado-mensaje">Cargando tus proyectos...</p>
          </div>
        ) : proyectosAsignados.length === 0 ? (
          <div className="lista-contenedor">
            <p className="estado-mensaje">No tienes proyectos asignados por ahora.</p>
          </div>
        ) : (
          <>
            <div className="lista-contenedor gerente-detalle-card">
              <div className="lista-header">
                <h2>{proyectoPrincipal.nombre || "Proyecto sin nombre"}</h2>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className={`badge ${obtenerClaseEstado(proyectoPrincipal.estado)}`}>
                    {proyectoPrincipal.estado || "Sin estado"}
                  </span>
                  <button className="btn-submeter" onClick={() => descargarResumenProyecto(proyectoPrincipal)}>
                    Descargar PDF
                  </button>
                </div>
              </div>
              {mensajePdf ? <p className="progreso-nota">{mensajePdf}</p> : null}

              <p className="gerente-descripcion">
                {proyectoPrincipal.descripcion || "Sin descripcion disponible para este proyecto."}
              </p>

              <div className="gerente-info-grid">
                <div className="gerente-info-item">
                  <span>Ubicacion</span>
                  <strong>{proyectoPrincipal.ubicacion || "No definida"}</strong>
                </div>
                <div className="gerente-info-item">
                  <span>Fecha inicio</span>
                  <strong>{formatoFecha(proyectoPrincipal.fechaInicio)}</strong>
                </div>
                <div className="gerente-info-item">
                  <span>Fecha estimada fin</span>
                  <strong>{formatoFecha(proyectoPrincipal.fechaEstimada)}</strong>
                </div>
                <div className="gerente-info-item">
                  <span>Presupuesto</span>
                  <strong>{formatoMoneda(proyectoPrincipal.presupuesto)}</strong>
                </div>
                <div className="gerente-info-item">
                  <span>Proveedor asignado</span>
                  <strong>
                    {proyectoPrincipal.proveedorNombre || proyectoPrincipal.proveedorCorreo || "Sin proveedor"}
                  </strong>
                </div>
              </div>

              <div className="gerente-avance-block">
                <div className="gerente-avance-head">
                  <span>Avance de obra</span>
                  <strong>{Number(proyectoPrincipal.progreso) || 0}%</strong>
                </div>
                <div className="progreso-visual gerente-avance-bar">
                  <div
                    className="progreso-relleno"
                    style={{ width: `${Number(proyectoPrincipal.progreso) || 0}%` }}
                  />
                </div>
              </div>

              <div className="gerente-tareas-block">
                <div className="gerente-avance-head">
                  <span>Tareas del proveedor</span>
                  <strong>
                    {tareasCompletadas.length}/{tareasProyectoPrincipal.length} completadas
                  </strong>
                </div>

                {tareasProyectoPrincipal.length === 0 ? (
                  <p className="estado-tareas-vacias">Aun no hay tareas registradas para este proyecto.</p>
                ) : (
                  <>
                    <div className="gerente-info-grid" style={{ marginTop: "10px" }}>
                      <div className="gerente-info-item">
                        <span>Total de tareas</span>
                        <strong>{tareasProyectoPrincipal.length}</strong>
                      </div>
                      <div className="gerente-info-item">
                        <span>Completadas</span>
                        <strong>{tareasCompletadas.length}</strong>
                      </div>
                      <div className="gerente-info-item">
                        <span>No completadas</span>
                        <strong>{tareasPendientes.length}</strong>
                      </div>
                    </div>

                    {tareasPendientes.length > 0 ? (
                      <>
                        <p className="progreso-nota">No completadas</p>
                        <div className="lista-tareas">
                          {tareasPendientes.map((tarea) => (
                            <label key={tarea.id} className="tarea-item">
                              <input type="checkbox" checked={false} disabled />
                              <div>
                                <strong>{tarea.titulo}</strong>
                                <span>
                                  {tarea.departamento || "Sin departamento"}
                                  {tarea.descripcion ? ` - ${tarea.descripcion}` : ""}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {tareasCompletadas.length > 0 ? (
                      <>
                        <p className="progreso-nota">Completadas</p>
                        <div className="lista-tareas">
                          {tareasCompletadas.map((tarea) => (
                            <label key={tarea.id} className="tarea-item tarea-item-revisada">
                              <input type="checkbox" checked disabled />
                              <div>
                                <strong>{tarea.titulo}</strong>
                                <span>
                                  {tarea.departamento || "Sin departamento"}
                                  {tarea.descripcion ? ` - ${tarea.descripcion}` : ""}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </div>

              <div className="gerente-tareas-block">
                <div className="gerente-avance-head">
                  <span>Bitacoras del proveedor</span>
                  <strong>{bitacorasProyectoPrincipal.length} publicaciones</strong>
                </div>

                {bitacorasProyectoPrincipal.length === 0 ? (
                  <p className="estado-tareas-vacias">Aun no hay bitacoras publicadas para este proyecto.</p>
                ) : (
                  <div className="timeline-bitacora">
                    {bitacorasProyectoPrincipal.map((bitacora) => (
                      <article key={bitacora.id} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-card">
                          <header className="timeline-head">
                            <h4>{bitacora.titulo}</h4>
                            <span>{formatoFechaHora(bitacora.fechaPublicacion)}</span>
                          </header>
                          {bitacora.proveedorNombre ? <small>Publicado por: {bitacora.proveedorNombre}</small> : null}
                          <p>{bitacora.desarrollo || "Sin desarrollo registrado."}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {proyectosAsignados.length > 1 && (
              <div className="lista-contenedor gerente-tabla-secundaria">
                <div className="lista-header">
                  <h2>Otros proyectos asignados</h2>
                </div>
                <div className="tabla-container">
                  <table className="tabla-proyectos">
                    <thead>
                      <tr>
                        <th>PROYECTO</th>
                        <th>PROVEEDOR</th>
                        <th>UBICACION</th>
                        <th>ESTADO</th>
                        <th>AVANCE</th>
                        <th>REPORTE</th>
                        <th>FECHA FIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectosAsignados.slice(1).map((proyecto) => (
                        <tr key={proyecto.id}>
                          <td>{proyecto.nombre || "Proyecto"}</td>
                          <td>{proyecto.proveedorNombre || proyecto.proveedorCorreo || "Sin proveedor"}</td>
                          <td>{proyecto.ubicacion || "No definida"}</td>
                          <td>
                            <span className={`badge ${obtenerClaseEstado(proyecto.estado)}`}>
                              {proyecto.estado || "Sin estado"}
                            </span>
                          </td>
                          <td>
                            <div className="celda-progreso">
                              <div className="progreso-visual">
                                <div
                                  className="progreso-relleno"
                                  style={{ width: `${Number(proyecto.progreso) || 0}%` }}
                                />
                              </div>
                              <span className="progreso-texto">{Number(proyecto.progreso) || 0}%</span>
                            </div>
                          </td>
                          <td>
                            <button className="btn-ver" onClick={() => descargarResumenProyecto(proyecto)}>
                              Descargar
                            </button>
                          </td>
                          <td>{formatoFecha(proyecto.fechaEstimada)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
>>>>>>> 64fc3cd65206f614c841b9b192cebb2d4925c1e1
      </div>
    </div>
  );
}

export default GerentePage;
