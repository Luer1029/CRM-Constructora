import "./RolePage.css";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import RoleQuickSidebar from "./RoleQuickSidebar";
import { generarResumenProyectoPdf } from "../utils/pdfReportUtils";

const normalizarTexto = (valor) => String(valor || "").toLowerCase().trim();

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

const obtenerClaseEstado = (estado) => {
  const valor = normalizarTexto(estado);
  if (valor === "activo" || valor === "en progreso") return "badge-progreso";
  if (valor === "finalizado") return "badge-finalizado";
  if (valor === "pendiente") return "badge-pendiente";
  if (valor === "en espera") return "badge-espera";
  return "badge-default";
};

const normalizarTareasProyecto = (tareas) => {
  if (!Array.isArray(tareas)) return [];

  return tareas
    .map((tarea, indice) => ({
      id: String(
        tarea?.id || tarea?.tareaId || tarea?.uid || `${indice}-${tarea?.titulo || tarea?.nombre || "tarea"}`
      ),
      titulo: String(tarea?.titulo || tarea?.nombre || tarea?.descripcion || "Tarea sin nombre").trim(),
      descripcion: String(tarea?.descripcion || tarea?.detalle || "").trim(),
      departamento: String(tarea?.departamento || tarea?.departamentoEncargado || tarea?.area || "").trim(),
      revisado: Boolean(tarea?.revisado || tarea?.completada || tarea?.revisada),
    }))
    .filter((tarea) => tarea.titulo.length > 0);
};

const normalizarBitacorasProyecto = (bitacoras) => {
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

function UsuarioPage({ onLogout }) {
  const [seccionActiva, setSeccionActiva] = useState("resumen");
  const [usuario, setUsuario] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [calificacionesPorProyecto, setCalificacionesPorProyecto] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardandoCalificacion, setGuardandoCalificacion] = useState(false);
  const [puntaje, setPuntaje] = useState(5);
  const [comentario, setComentario] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensajePdf, setMensajePdf] = useState("");

  useEffect(() => {
    const cargarVistaUsuario = async (usuarioActual) => {
      try {
        setCargando(true);
        const [usuarioResult, proyectosResult, calificacionesResult] = await Promise.allSettled([
          getDoc(doc(db, "usuarios", usuarioActual.uid)),
          getDocs(collection(db, "proyectos")),
          getDocs(collection(db, "calificacionesProveedores")),
        ]);

        if (proyectosResult.status !== "fulfilled") {
          throw proyectosResult.reason;
        }

        const proyectosSnap = proyectosResult.value;
        const usuarioSnap = usuarioResult.status === "fulfilled" ? usuarioResult.value : null;
        const calificacionesSnap =
          calificacionesResult.status === "fulfilled" ? calificacionesResult.value : null;

        const datosUsuario = usuarioSnap?.exists() ? usuarioSnap.data() : {};
        const correoUsuario = normalizarTexto(datosUsuario.correo || usuarioActual.email);

        setUsuario({
          uid: usuarioActual.uid,
          correo: datosUsuario.correo || usuarioActual.email || "",
          nombre: `${datosUsuario.nombre || ""} ${datosUsuario.apellido || ""}`.trim(),
          rol: datosUsuario.rol || "usuario",
        });

        const proyectosAsignados = proyectosSnap.docs
          .map((documento) => ({ id: documento.id, ...documento.data() }))
          .filter((proyecto) => {
            if (proyecto.oculto) return false;

            const idsCandidatos = [
              proyecto.usuarioId,
              proyecto.clienteId,
              proyecto.clienteUid,
              proyecto.propietarioId,
              proyecto.userId,
              proyecto.usuarioAsignadoId,
            ].map(normalizarTexto);

            const correosCandidatos = [
              proyecto.usuarioCorreo,
              proyecto.correoUsuario,
              proyecto.clienteCorreo,
              proyecto.correoClienteAsignado,
              proyecto.correoCliente,
              proyecto.correo,
            ].map(normalizarTexto);

            return (
              idsCandidatos.includes(normalizarTexto(usuarioActual.uid)) ||
              (correoUsuario && correosCandidatos.includes(correoUsuario))
            );
          })
          .sort((a, b) => {
            const fechaA = new Date(a.fechaCreacion || a.fechaInicio || 0).getTime();
            const fechaB = new Date(b.fechaCreacion || b.fechaInicio || 0).getTime();
            return fechaB - fechaA;
          });

        setProyectos(proyectosAsignados);

        const idsProyectosAsignados = new Set(proyectosAsignados.map((item) => item.id));
        const mapaCalificaciones = {};

        if (calificacionesSnap) {
          calificacionesSnap.docs
            .map((documento) => ({ id: documento.id, ...documento.data() }))
            .filter((calificacion) => {
              if (!idsProyectosAsignados.has(calificacion.proyectoId)) return false;
              return normalizarTexto(calificacion.usuarioId) === normalizarTexto(usuarioActual.uid);
            })
            .forEach((calificacion) => {
              mapaCalificaciones[calificacion.proyectoId] = calificacion;
            });
        }

        setCalificacionesPorProyecto(mapaCalificaciones);
        setMensaje("");
      } catch (error) {
        console.log(error);
        setMensaje("No se pudo cargar tu proyecto.");
      } finally {
        setCargando(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (usuarioActual) => {
      if (!usuarioActual?.uid) {
        setUsuario(null);
        setProyectos([]);
        setCalificacionesPorProyecto({});
        setMensaje("No se encontro una sesion valida para usuario.");
        setCargando(false);
        return;
      }

      cargarVistaUsuario(usuarioActual);
    });

    return () => unsubscribe();
  }, []);

  const proyectoPrincipal = proyectos[0];

  useEffect(() => {
    if (!proyectoPrincipal) return;

    const calificacionExistente = calificacionesPorProyecto[proyectoPrincipal.id];
    if (calificacionExistente) {
      setPuntaje(Number(calificacionExistente.puntaje) || 5);
      setComentario(calificacionExistente.comentario || "");
      return;
    }

    setPuntaje(5);
    setComentario("");
  }, [proyectoPrincipal, calificacionesPorProyecto]);

  const calificarProveedor = async () => {
    if (!usuario?.uid) {
      setMensaje("No hay una sesión activa para registrar tu calificación.");
      return;
    }

    if (!proyectoPrincipal?.id || !proyectoPrincipal?.proveedorId) {
      setMensaje("No hay un proveedor asignado para calificar.");
      return;
    }

    try {
      setGuardandoCalificacion(true);
      const puntajeNumerico = Math.min(5, Math.max(1, Number(puntaje) || 1));
      const docId = `${usuario.uid}_${proyectoPrincipal.id}`;

      const payload = {
        usuarioId: usuario.uid,
        usuarioNombre: usuario.nombre || usuario.correo || "Cliente",
        proyectoId: proyectoPrincipal.id,
        proyectoNombre: proyectoPrincipal.nombre || "Proyecto",
        proveedorId: proyectoPrincipal.proveedorId,
        proveedorNombre: proyectoPrincipal.proveedorNombre || "Proveedor",
        puntaje: puntajeNumerico,
        comentario: comentario.trim(),
        fechaActualizacion: new Date().toISOString(),
      };

      await setDoc(doc(db, "calificacionesProveedores", docId), payload, { merge: true });

      setCalificacionesPorProyecto((prev) => ({
        ...prev,
        [proyectoPrincipal.id]: payload,
      }));

      setMensaje("Calificación registrada correctamente.");
    } catch (error) {
      console.log(error);
      setMensaje("No se pudo guardar la calificación del proveedor.");
    } finally {
      setGuardandoCalificacion(false);
    }
  };

  const resumen = useMemo(() => {
    const total = proyectos.length;
    const enEjecucion = proyectos.filter((proyecto) => {
      const estado = normalizarTexto(proyecto.estado);
      return estado === "activo" || estado === "en progreso";
    }).length;

    const avancePromedio = total
      ? Math.round(
          proyectos.reduce((acumulado, proyecto) => acumulado + (Number(proyecto.progreso) || 0), 0) / total
        )
      : 0;

    return {
      total,
      enEjecucion,
      avancePromedio,
    };
  }, [proyectos]);

  const tareasProveedor = useMemo(() => {
    if (!proyectoPrincipal) return [];
    return normalizarTareasProyecto(proyectoPrincipal.tareasObra || proyectoPrincipal.tareas || []);
  }, [proyectoPrincipal]);

  const tareasCompletadas = useMemo(
    () => tareasProveedor.filter((tarea) => tarea.revisado),
    [tareasProveedor]
  );

  const tareasPendientes = useMemo(
    () => tareasProveedor.filter((tarea) => !tarea.revisado),
    [tareasProveedor]
  );

  const bitacorasProyecto = useMemo(() => {
    if (!proyectoPrincipal) return [];
    return normalizarBitacorasProyecto(proyectoPrincipal.bitacorasObra || proyectoPrincipal.bitacoras || []);
  }, [proyectoPrincipal]);

  const descargarResumenProyecto = () => {
    if (!proyectoPrincipal) {
      setMensajePdf("No hay proyecto para generar reporte.");
      return;
    }

    try {
      const nombreProyecto = (proyectoPrincipal.nombre || "proyecto").toLowerCase().replace(/\s+/g, "-");
      generarResumenProyectoPdf({
        nombreArchivo: `reporte-usuario-${nombreProyecto}.pdf`,
        tituloReporte: "Resumen de Proyecto del Cliente",
        subtitulo: `Cliente: ${usuario?.nombre || usuario?.correo || "Usuario"}`,
        area: "Clientes",
        proyecto: proyectoPrincipal,
        tareasCompletadas,
        tareasPendientes,
        bitacoras: bitacorasProyecto,
      });
      setMensajePdf("PDF descargado correctamente.");
    } catch (error) {
      console.log(error);
      setMensajePdf("No se pudo generar el PDF del proyecto.");
    }
  };

  return (
    <div className="pagina-rol">
      <RoleQuickSidebar title="Panel Usuario" onLogout={onLogout} />
      <div className="contenedor-rol usuario-dashboard">
        <div className="usuario-layout">
          <aside className="usuario-menu">
            <h2>Panel Usuario</h2>
            <p>Consulta tu proyecto y el estado de avance.</p>

            <button
              className={`usuario-menu-btn ${seccionActiva === "resumen" ? "activo" : ""}`}
              onClick={() => setSeccionActiva("resumen")}
            >
              Resumen
            </button>
            <button
              className={`usuario-menu-btn ${seccionActiva === "mi-proyecto" ? "activo" : ""}`}
              onClick={() => setSeccionActiva("mi-proyecto")}
            >
              Mi Proyecto
            </button>
            <button
              className={`usuario-menu-btn ${seccionActiva === "calificar" ? "activo" : ""}`}
              onClick={() => setSeccionActiva("calificar")}
            >
              Calificar Proveedor
            </button>

            <span className="role-badge">Rol: Usuario</span>
          </aside>

          <section className="usuario-main">
            {mensaje && <div className="mensaje error">{mensaje}</div>}

            {seccionActiva === "resumen" && (
              <>
                <div className="header-proyectos">
                  <h1>Bienvenido{usuario?.nombre ? `, ${usuario.nombre}` : ""}</h1>
                  <p className="sub-titulo">Este es el estado general de tus proyectos asignados.</p>
                </div>

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
                    <div className="card-numero">{resumen.avancePromedio}%</div>
                    <div className="card-progreso">
                      <div className="progress-bar" style={{ width: `${resumen.avancePromedio}%` }} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {seccionActiva === "mi-proyecto" && (
              <div className="lista-contenedor usuario-proyecto-panel">
                <div className="lista-header">
                  <h2>Mi Proyecto</h2>
                  {!cargando && proyectoPrincipal ? (
                    <button className="btn-submeter" onClick={descargarResumenProyecto}>
                      Descargar resumen PDF
                    </button>
                  ) : null}
                </div>
                {mensajePdf ? <p className="progreso-nota">{mensajePdf}</p> : null}

                {cargando ? (
                  <p className="estado-mensaje">Cargando tu proyecto...</p>
                ) : !proyectoPrincipal ? (
                  <p className="estado-mensaje">Aun no tienes proyectos asignados.</p>
                ) : (
                  <>
                    <div className="usuario-proyecto-top">
                      <h3>{proyectoPrincipal.nombre || "Proyecto sin nombre"}</h3>
                      <span className={`badge ${obtenerClaseEstado(proyectoPrincipal.estado)}`}>
                        {proyectoPrincipal.estado || "Sin estado"}
                      </span>
                    </div>

                    <p className="gerente-descripcion">
                      {proyectoPrincipal.descripcion || "Sin descripcion disponible para este proyecto."}
                    </p>

                    <div className="gerente-info-grid">
                      <div className="gerente-info-item">
                        <span>Ubicacion</span>
                        <strong>{proyectoPrincipal.ubicacion || "No definida"}</strong>
                      </div>
                      <div className="gerente-info-item">
                        <span>Fecha de inicio</span>
                        <strong>{formatoFecha(proyectoPrincipal.fechaInicio)}</strong>
                      </div>
                      <div className="gerente-info-item">
                        <span>Fecha estimada de fin</span>
                        <strong>{formatoFecha(proyectoPrincipal.fechaEstimada)}</strong>
                      </div>
                      <div className="gerente-info-item">
                        <span>Proveedor</span>
                        <strong>{proyectoPrincipal.proveedorNombre || "Sin proveedor asignado"}</strong>
                      </div>
                      <div className="gerente-info-item">
                        <span>Gerente asignado</span>
                        <strong>
                          {proyectoPrincipal.gerenteNombre ||
                            proyectoPrincipal.gerenteCorreo ||
                            proyectoPrincipal.gerenteEmail ||
                            proyectoPrincipal.correoGerente ||
                            "Sin gerente asignado"}
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
                          {tareasCompletadas.length}/{tareasProveedor.length} completadas
                        </strong>
                      </div>

                      {tareasProveedor.length === 0 ? (
                        <p className="estado-tareas-vacias">Aun no hay tareas registradas para este proyecto.</p>
                      ) : (
                        <>
                          <div className="gerente-info-grid" style={{ marginTop: "10px" }}>
                            <div className="gerente-info-item">
                              <span>Total de tareas</span>
                              <strong>{tareasProveedor.length}</strong>
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
                        <strong>{bitacorasProyecto.length} publicaciones</strong>
                      </div>

                      {bitacorasProyecto.length === 0 ? (
                        <p className="estado-tareas-vacias">Aun no hay bitacoras publicadas para este proyecto.</p>
                      ) : (
                        <div className="timeline-bitacora">
                          {bitacorasProyecto.map((bitacora) => (
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
                  </>
                )}
              </div>
            )}

            {seccionActiva === "calificar" && (
              <div className="lista-contenedor usuario-proyecto-panel">
                <div className="lista-header">
                  <h2>Calificar Proveedor</h2>
                </div>

                {cargando ? (
                  <p className="estado-mensaje">Cargando información...</p>
                ) : !proyectoPrincipal ? (
                  <p className="estado-mensaje">Aun no tienes proyectos asignados.</p>
                ) : !proyectoPrincipal.proveedorId ? (
                  <p className="estado-mensaje">Tu proyecto no tiene proveedor asignado actualmente.</p>
                ) : (
                  <div className="usuario-calificacion-wrap">
                    <p className="usuario-calificacion-proveedor">
                      Proveedor: <strong>{proyectoPrincipal.proveedorNombre || "Proveedor"}</strong>
                    </p>

                    <div className="form-grupo">
                      <label>Puntaje (1 a 5)</label>
                      <select value={puntaje} onChange={(e) => setPuntaje(e.target.value)}>
                        <option value={1}>1 - Muy malo</option>
                        <option value={2}>2 - Malo</option>
                        <option value={3}>3 - Regular</option>
                        <option value={4}>4 - Bueno</option>
                        <option value={5}>5 - Excelente</option>
                      </select>
                    </div>

                    <div className="form-grupo">
                      <label>Comentario (opcional)</label>
                      <textarea
                        rows="4"
                        placeholder="Cuéntanos tu experiencia con este proveedor"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                      />
                    </div>

                    <div className="proveedor-acciones">
                      <button className="btn-submeter" onClick={calificarProveedor} disabled={guardandoCalificacion}>
                        {guardandoCalificacion ? "Guardando..." : "Guardar calificación"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default UsuarioPage;
