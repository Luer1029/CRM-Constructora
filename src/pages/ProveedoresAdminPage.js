import "./RolePage.css";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const normalizarTexto = (valor) => String(valor || "").toLowerCase().trim();

const normalizarEspecialidades = (valor) => {
  if (Array.isArray(valor)) {
    return Array.from(
      new Set(
        valor
          .map((item) => String(item || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }

  if (typeof valor === "string") {
    return Array.from(
      new Set(
        valor
          .split(",")
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }

  return [];
};

const obtenerBadgeClaseClasificacion = (clasificacion) => {
  const valor = normalizarTexto(clasificacion);
  if (valor === "premium") return "badge-finalizado";
  if (valor === "estandar") return "badge-pendiente";
  if (valor === "basica") return "badge-default";
  return "badge-default";
};

const obtenerClaseEstadoProyecto = (estado) => {
  const valor = normalizarTexto(estado);
  if (valor === "activo" || valor === "en progreso") return "badge-progreso";
  if (valor === "finalizado") return "badge-finalizado";
  if (valor === "pendiente") return "badge-pendiente";
  if (valor === "en espera") return "badge-espera";
  return "badge-default";
};

function ProveedoresAdminPage() {
  const [proveedores, setProveedores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtroClasificacion, setFiltroClasificacion] = useState("todos");

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setCargando(true);
      const [usuariosResult, proyectosResult, calificacionesResult] = await Promise.allSettled([
        getDocs(collection(db, "usuarios")),
        getDocs(collection(db, "proyectos")),
        getDocs(collection(db, "calificacionesProveedores")),
      ]);

      if (usuariosResult.status !== "fulfilled" && proyectosResult.status !== "fulfilled") {
        throw new Error("No fue posible cargar usuarios ni proyectos.");
      }

      const usuariosSnapshot = usuariosResult.status === "fulfilled" ? usuariosResult.value : null;
      const proyectosSnapshot = proyectosResult.status === "fulfilled" ? proyectosResult.value : null;
      const calificacionesSnapshot =
        calificacionesResult.status === "fulfilled" ? calificacionesResult.value : null;

      const listaProveedores = (usuariosSnapshot?.docs || [])
        .map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }))
        .filter((usuario) => normalizarTexto(usuario.rol) === "proveedor");

      const listaProyectos = (proyectosSnapshot?.docs || [])
        .map((documento) => ({
          id: documento.id,
          oculto: false,
          ...documento.data(),
        }))
        .filter((proyecto) => !proyecto.oculto);

      const calificacionesNormalizadas = (calificacionesSnapshot?.docs || []).map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      setProveedores(listaProveedores);
      setProyectos(listaProyectos);
      setCalificaciones(calificacionesNormalizadas);
      setAsignaciones(
        listaProyectos.reduce((acc, proyecto) => {
          acc[proyecto.id] = proyecto.proveedorId || "";
          return acc;
        }, {})
      );

      if (usuariosResult.status !== "fulfilled" || proyectosResult.status !== "fulfilled") {
        setMensaje("Datos cargados parcialmente por permisos de lectura.");
      } else {
        setMensaje("");
      }
    } catch (error) {
      console.log(error);
      setMensaje("Error al cargar proveedores o proyectos.");
    } finally {
      setCargando(false);
    }
  };

  const obtenerNombreProveedor = (proveedor) => {
    const nombreCompleto = `${proveedor.nombre || ""} ${proveedor.apellido || ""}`.trim();
    return nombreCompleto || proveedor.correo || "Proveedor";
  };

  const handleCambioAsignacion = (proyectoId, proveedorId) => {
    setAsignaciones((prev) => ({
      ...prev,
      [proyectoId]: proveedorId,
    }));
  };

  const asignarProveedorAProyecto = async (proyecto) => {
    try {
      const proveedorId = asignaciones[proyecto.id] || "";
      const proveedorSeleccionado = proveedores.find((proveedor) => proveedor.id === proveedorId);

      const payload = proveedorSeleccionado
        ? {
            proveedorId: proveedorSeleccionado.id,
            proveedorNombre: obtenerNombreProveedor(proveedorSeleccionado),
            proveedorCorreo: proveedorSeleccionado.correo || "",
            clasificacionProveedor: proveedorSeleccionado.clasificacionProveedor || "",
            departamentosProveedor:
              normalizarEspecialidades(
                proveedorSeleccionado.especialidadesProveedor || proveedorSeleccionado.departamentosProveedor || []
              ),
          }
        : {
            proveedorId: "",
            proveedorNombre: "",
            proveedorCorreo: "",
            clasificacionProveedor: "",
            departamentosProveedor: [],
          };

      await updateDoc(doc(db, "proyectos", proyecto.id), payload);

      setProyectos((prev) =>
        prev.map((item) => (item.id === proyecto.id ? { ...item, ...payload } : item))
      );

      setMensaje(payload.proveedorId ? "Proveedor asignado correctamente al proyecto." : "Proyecto sin proveedor asignado.");
    } catch (error) {
      console.log(error);
      setMensaje("Error al asignar proveedor al proyecto.");
    }
  };

  const rangoPorClasificacion = useMemo(() => {
    const premium = proveedores.filter((p) => normalizarTexto(p.clasificacionProveedor) === "premium").length;
    const estandar = proveedores.filter((p) => normalizarTexto(p.clasificacionProveedor) === "estandar").length;
    const basica = proveedores.filter((p) => normalizarTexto(p.clasificacionProveedor) === "basica").length;
    const sinClasificar = proveedores.filter((p) => !p.clasificacionProveedor).length;

    return {
      premium,
      estandar,
      basica,
      sinClasificar,
    };
  }, [proveedores]);

  const estadisticasCalificacion = useMemo(() => {
    return calificaciones.reduce((acc, item) => {
      const proveedorId = item.proveedorId;
      if (!proveedorId) return acc;

      if (!acc[proveedorId]) {
        acc[proveedorId] = { totalPuntos: 0, cantidad: 0 };
      }

      acc[proveedorId].totalPuntos += Number(item.puntaje) || 0;
      acc[proveedorId].cantidad += 1;

      return acc;
    }, {});
  }, [calificaciones]);

  const estadisticasProyectosProveedor = useMemo(() => {
    return proyectos.reduce((acc, proyecto) => {
      const proveedorId = proyecto.proveedorId;
      if (!proveedorId) return acc;

      acc[proveedorId] = (acc[proveedorId] || 0) + 1;
      return acc;
    }, {});
  }, [proyectos]);

  const promedioGlobalCalificaciones = useMemo(() => {
    if (!calificaciones.length) return 0;
    const suma = calificaciones.reduce((acumulado, item) => acumulado + (Number(item.puntaje) || 0), 0);
    return (suma / calificaciones.length).toFixed(1);
  }, [calificaciones]);

  const proveedoresFiltrados = useMemo(() => {
    let resultado = proveedores.map((proveedor) => {
      const stats = estadisticasCalificacion[proveedor.id] || { totalPuntos: 0, cantidad: 0 };
      const promedioCalificacion = stats.cantidad ? stats.totalPuntos / stats.cantidad : 0;
      const totalProyectosAsignados = estadisticasProyectosProveedor[proveedor.id] || 0;

      return {
        ...proveedor,
        totalCalificaciones: stats.cantidad,
        promedioCalificacion,
        totalProyectosAsignados,
        departamentosProveedor: normalizarEspecialidades(
          proveedor.especialidadesProveedor || proveedor.departamentosProveedor || []
        ),
      };
    });

    if (filtroClasificacion !== "todos") {
      resultado = resultado.filter(
        (p) => normalizarTexto(p.clasificacionProveedor) === normalizarTexto(filtroClasificacion)
      );
    }

    return resultado
      .sort((a, b) => {
        if (b.promedioCalificacion !== a.promedioCalificacion) {
          return b.promedioCalificacion - a.promedioCalificacion;
        }

        if (b.totalCalificaciones !== a.totalCalificaciones) {
          return b.totalCalificaciones - a.totalCalificaciones;
        }

        if (b.totalProyectosAsignados !== a.totalProyectosAsignados) {
          return b.totalProyectosAsignados - a.totalProyectosAsignados;
        }

        const ordenClasificacion = { premium: 0, estandar: 1, basica: 2 };
        const claseA = ordenClasificacion[normalizarTexto(a.clasificacionProveedor)] ?? 999;
        const claseB = ordenClasificacion[normalizarTexto(b.clasificacionProveedor)] ?? 999;
        return claseA - claseB;
      })
      .map((proveedor, indice) => ({
        ...proveedor,
        posicionRanking: indice + 1,
      }));
  }, [proveedores, estadisticasCalificacion, estadisticasProyectosProveedor, filtroClasificacion]);

  const proveedorTop = proveedoresFiltrados[0] || null;

  const proyectosVisibles = useMemo(
    () => proyectos.filter((proyecto) => !proyecto.oculto),
    [proyectos]
  );

  return (
    <div className="pagina-rol">
      <div className="contenedor-rol proveedores-admin-view">
        <div className="header-proyectos">
          <h1>📦 Gestión de Proveedores</h1>
          <p className="sub-titulo">Consulta el ranking de proveedores y sus clasificaciones en el sistema.</p>
        </div>

        {mensaje && (
          <div className={`mensaje ${mensaje.includes("Error") ? "error" : "exito"}`}>
            {mensaje}
          </div>
        )}

        <div className="resumen-cards">
          <div className="card-resumen">
            <div className="card-header">TOTAL PROVEEDORES</div>
            <div className="card-numero">{proveedores.length}</div>
          </div>
          <div className="card-resumen">
            <div className="card-header">PREMIUM</div>
            <div className="card-numero" style={{ color: "#10b981" }}>
              {rangoPorClasificacion.premium}
            </div>
          </div>
          <div className="card-resumen">
            <div className="card-header">ESTANDAR</div>
            <div className="card-numero" style={{ color: "#f59e0b" }}>
              {rangoPorClasificacion.estandar}
            </div>
          </div>
          <div className="card-resumen">
            <div className="card-header">BASICA</div>
            <div className="card-numero" style={{ color: "#6b7280" }}>
              {rangoPorClasificacion.basica}
            </div>
          </div>
          <div className="card-resumen">
            <div className="card-header">SIN CLASIFICAR</div>
            <div className="card-numero" style={{ color: "#9ca3af" }}>
              {rangoPorClasificacion.sinClasificar}
            </div>
          </div>
          <div className="card-resumen">
            <div className="card-header">PROMEDIO CALIFICACIONES</div>
            <div className="card-numero">{promedioGlobalCalificaciones}</div>
          </div>
          <div className="card-resumen">
            <div className="card-header">TOTAL RESEÑAS</div>
            <div className="card-numero">{calificaciones.length}</div>
          </div>
          <div className="card-resumen">
            <div className="card-header">TOP ACTUAL</div>
            <div className="card-numero" style={{ fontSize: "20px" }}>
              {proveedorTop ? obtenerNombreProveedor(proveedorTop) : "Sin datos"}
            </div>
          </div>
        </div>

        <div className="lista-contenedor">
          <div className="lista-header">
            <h2>Ranking de Proveedores</h2>
            <div className="filtros-estado">
              <button
                className={`filtro-btn ${filtroClasificacion === "todos" ? "activo" : ""}`}
                onClick={() => setFiltroClasificacion("todos")}
              >
                Todos
              </button>
              <button
                className={`filtro-btn ${filtroClasificacion === "premium" ? "activo" : ""}`}
                onClick={() => setFiltroClasificacion("premium")}
              >
                Premium
              </button>
              <button
                className={`filtro-btn ${filtroClasificacion === "estandar" ? "activo" : ""}`}
                onClick={() => setFiltroClasificacion("estandar")}
              >
                Estándar
              </button>
              <button
                className={`filtro-btn ${filtroClasificacion === "basica" ? "activo" : ""}`}
                onClick={() => setFiltroClasificacion("basica")}
              >
                Básica
              </button>
            </div>
          </div>

          {cargando ? (
            <p className="estado-mensaje">Cargando proveedores...</p>
          ) : proveedoresFiltrados.length === 0 ? (
            <p className="estado-mensaje">No hay proveedores con esa clasificación.</p>
          ) : (
            <div className="tabla-container">
              <table className="tabla-proyectos">
                <thead>
                  <tr>
                    <th>POSICION</th>
                    <th>PROVEEDOR</th>
                    <th>CORREO</th>
                    <th>ROL</th>
                    <th>CALIFICACION</th>
                    <th>RESEÑAS</th>
                    <th>PROYECTOS</th>
                    <th>CLASIFICACION</th>
                    <th>DEPARTAMENTOS</th>
                    <th>ACTUALIZADO</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedoresFiltrados.map((proveedor) => {
                    const nombreCompleto = `${proveedor.nombre || ""} ${proveedor.apellido || ""}`.trim();
                    const fechaActualizacion = proveedor.fechaActualizacionClasificacion
                      ? new Date(proveedor.fechaActualizacionClasificacion).toLocaleDateString("es-ES")
                      : "-";

                    return (
                      <tr key={proveedor.id}>
                        <td>
                          <div className="ranking-posicion">
                            <span>#{proveedor.posicionRanking}</span>
                            {proveedor.posicionRanking === 1 && <span className="medal">🥇</span>}
                            {proveedor.posicionRanking === 2 && <span className="medal">🥈</span>}
                            {proveedor.posicionRanking === 3 && <span className="medal">🥉</span>}
                          </div>
                        </td>
                        <td>
                          <strong>{nombreCompleto || "Sin nombre"}</strong>
                          <span style={{ color: "#9ca3af", fontSize: "12px" }}>ID: {proveedor.id.slice(0, 8)}</span>
                        </td>
                        <td>{proveedor.correo || "-"}</td>
                        <td>
                          <span className="badge badge-progreso">{proveedor.rol || "proveedor"}</span>
                        </td>
                        <td>{proveedor.promedioCalificacion ? proveedor.promedioCalificacion.toFixed(1) : "-"}</td>
                        <td>{proveedor.totalCalificaciones || 0}</td>
                        <td>{proveedor.totalProyectosAsignados || 0}</td>
                        <td>
                          <span
                            className={`badge ${obtenerBadgeClaseClasificacion(proveedor.clasificacionProveedor)}`}
                          >
                            {proveedor.clasificacionProveedor
                              ? proveedor.clasificacionProveedor.charAt(0).toUpperCase() +
                                proveedor.clasificacionProveedor.slice(1)
                              : "Sin clasificar"}
                          </span>
                        </td>
                        <td>
                          {proveedor.departamentosProveedor?.length ? (
                            <div className="ranking-departamentos">
                              {proveedor.departamentosProveedor.slice(0, 4).map((departamento) => (
                                <span key={departamento} className="ranking-chip">
                                  {departamento}
                                </span>
                              ))}
                              {proveedor.departamentosProveedor.length > 4 ? (
                                <span className="ranking-chip">+{proveedor.departamentosProveedor.length - 4}</span>
                              ) : null}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{fechaActualizacion}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lista-contenedor gerentes-asignacion">
          <div className="lista-header">
            <h2>Asignar proveedor por proyecto</h2>
          </div>

          {cargando ? (
            <p className="estado-mensaje">Cargando proyectos...</p>
          ) : proyectosVisibles.length === 0 ? (
            <p className="estado-mensaje">No hay proyectos disponibles para asignar.</p>
          ) : (
            <div className="tabla-container">
              <table className="tabla-proyectos">
                <thead>
                  <tr>
                    <th>PROYECTO</th>
                    <th>ESTADO</th>
                    <th>PROVEEDOR ACTUAL</th>
                    <th>ASIGNAR PROVEEDOR</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosVisibles.map((proyecto) => (
                    <tr key={proyecto.id}>
                      <td>{proyecto.nombre || "Proyecto"}</td>
                      <td>
                        <span className={`badge ${obtenerClaseEstadoProyecto(proyecto.estado)}`}>
                          {proyecto.estado || "Sin estado"}
                        </span>
                      </td>
                      <td>{proyecto.proveedorNombre || "Sin asignar"}</td>
                      <td>
                        <select
                          className="select-tabla"
                          value={asignaciones[proyecto.id] || ""}
                          onChange={(event) => handleCambioAsignacion(proyecto.id, event.target.value)}
                        >
                          <option value="">Sin proveedor</option>
                          {proveedores.map((proveedor) => (
                            <option key={proveedor.id} value={proveedor.id}>
                              {obtenerNombreProveedor(proveedor)}
                              {normalizarEspecialidades(
                                proveedor.especialidadesProveedor || proveedor.departamentosProveedor || []
                              ).length
                                ? ` - ${normalizarEspecialidades(
                                    proveedor.especialidadesProveedor || proveedor.departamentosProveedor || []
                                  )
                                    .slice(0, 2)
                                    .join(" / ")}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="btn-ver" onClick={() => asignarProveedorAProyecto(proyecto)}>
                          Guardar
                        </button>
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

export default ProveedoresAdminPage;
