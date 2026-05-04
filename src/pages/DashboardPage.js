import "./DashboardPage.css";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { db } from "../firebase";
import {
  aplicarMembretePdf,
  aplicarPiePaginasPdf,
  generarResumenEstadosProyectosPdf,
  generarResumenProyectosFinalizadosPdf,
} from "../utils/pdfReportUtils";

const normalizar = (valor) => String(valor || "").toLowerCase().trim();

const esProyectoActivo = (estado) => {
  const valor = normalizar(estado);
  return valor === "activo" || valor === "en progreso";
};

const formatoFechaCorta = (fechaTexto) => {
  if (!fechaTexto) return "Sin fecha";
  const fecha = new Date(fechaTexto);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
};

const formatoMes = (fechaTexto) => {
  if (!fechaTexto) return "Sin fecha";
  const fecha = new Date(fechaTexto);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
};

const obtenerClaveEstado = (estado) => {
  const valor = normalizar(estado);
  if (valor === "activo" || valor === "en progreso") return "En progreso";
  if (valor === "finalizado") return "Finalizado";
  if (valor === "pendiente") return "Pendiente";
  if (valor === "en espera") return "En espera";
  return "Sin estado";
};

function DashboardPage({ onTabChange }) {
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [mensajePdf, setMensajePdf] = useState("");
  const [mostrarMetricas, setMostrarMetricas] = useState(false);
  const [mostrarSelectorPdf, setMostrarSelectorPdf] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const [usuariosSnapshot, proyectosSnapshot] = await Promise.all([
          getDocs(collection(db, "usuarios")),
          getDocs(collection(db, "proyectos")),
        ]);

        setUsuarios(
          usuariosSnapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
        );

        setProyectos(
          proyectosSnapshot.docs.map((documento) => ({
            id: documento.id,
            oculto: false,
            ...documento.data(),
          }))
        );
      } catch (error) {
        console.log("Error al cargar dashboard:", error.message);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const proyectosVisibles = useMemo(
    () => proyectos.filter((proyecto) => !proyecto.oculto),
    [proyectos]
  );

  const proyectosActivos = useMemo(
    () => proyectosVisibles.filter((proyecto) => esProyectoActivo(proyecto.estado)),
    [proyectosVisibles]
  );

  const proveedores = useMemo(
    () => usuarios.filter((usuario) => normalizar(usuario.rol) === "proveedor"),
    [usuarios]
  );

  const empleadosTotales = usuarios.length;

  const avancePromedio = useMemo(() => {
    if (!proyectosActivos.length) return 0;
    const suma = proyectosActivos.reduce((total, proyecto) => total + (Number(proyecto.progreso) || 0), 0);
    return Math.round(suma / proyectosActivos.length);
  }, [proyectosActivos]);

  const proyectosRecientes = useMemo(() => {
    return [...proyectosVisibles]
      .sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion || a.fechaInicio || 0).getTime();
        const fechaB = new Date(b.fechaCreacion || b.fechaInicio || 0).getTime();
        return fechaB - fechaA;
      })
      .filter((proyecto) => {
        const texto = `${proyecto.nombre || ""} ${proyecto.ubicacion || ""}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase());
      })
      .slice(0, 5);
  }, [proyectosVisibles, busqueda]);

  const actividades = useMemo(() => {
    const ultimos = [...proyectosVisibles]
      .sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion || a.fechaInicio || 0).getTime();
        const fechaB = new Date(b.fechaCreacion || b.fechaInicio || 0).getTime();
        return fechaB - fechaA;
      })
      .slice(0, 3);

    if (!ultimos.length) {
      return [
        { id: "sin-actividad", titulo: "Sin actividad reciente", detalle: "Aun no hay movimientos registrados.", hora: "-" },
      ];
    }

    return ultimos.map((proyecto, index) => ({
      id: proyecto.id,
      titulo: `Actualizacion en ${proyecto.nombre || "proyecto"}`,
      detalle: `Estado: ${proyecto.estado || "sin estado"}. Progreso: ${proyecto.progreso || 0}%.`,
      hora: formatoFechaCorta(proyecto.fechaCreacion || proyecto.fechaInicio),
      tipo: index === 0 ? "info" : index === 1 ? "alerta" : "ok",
    }));
  }, [proyectosVisibles]);

  const gerentesActivos = useMemo(() => {
    const idsActivos = new Set(
      proyectosActivos
        .filter((proyecto) => Boolean(proyecto.gerenteId))
        .map((proyecto) => proyecto.gerenteId)
    );

    return usuarios.filter(
      (usuario) => normalizar(usuario.rol) === "gerente" && idsActivos.has(usuario.id)
    ).length;
  }, [usuarios, proyectosActivos]);

  const estadisticasClasificacionProveedor = useMemo(() => {
    return proveedores.reduce(
      (acc, proveedor) => {
        const tipo = normalizar(proveedor.clasificacionProveedor);
        if (tipo === "premium") acc.premium += 1;
        else if (tipo === "estandar") acc.estandar += 1;
        else if (tipo === "basica") acc.basica += 1;
        else acc.sinClasificar += 1;
        return acc;
      },
      { premium: 0, estandar: 0, basica: 0, sinClasificar: 0 }
    );
  }, [proveedores]);

  const proyectosPorEstado = useMemo(() => {
    const resumen = proyectosVisibles.reduce((acc, proyecto) => {
      const estado = obtenerClaveEstado(proyecto.estado);
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    return [
      { nombre: "En progreso", valor: resumen["En progreso"] || 0 },
      { nombre: "Finalizado", valor: resumen["Finalizado"] || 0 },
      { nombre: "Pendiente", valor: resumen["Pendiente"] || 0 },
      { nombre: "En espera", valor: resumen["En espera"] || 0 },
    ];
  }, [proyectosVisibles]);

  const proveedoresPorClasificacion = useMemo(
    () => [
      { nombre: "Premium", valor: estadisticasClasificacionProveedor.premium },
      { nombre: "Estandar", valor: estadisticasClasificacionProveedor.estandar },
      { nombre: "Basica", valor: estadisticasClasificacionProveedor.basica },
      { nombre: "Sin clasificar", valor: estadisticasClasificacionProveedor.sinClasificar },
    ],
    [estadisticasClasificacionProveedor]
  );

  const avancePorRangos = useMemo(() => {
    const rangos = {
      "0-25": 0,
      "26-50": 0,
      "51-75": 0,
      "76-100": 0,
    };

    proyectosVisibles.forEach((proyecto) => {
      const progreso = Number(proyecto.progreso) || 0;
      if (progreso <= 25) rangos["0-25"] += 1;
      else if (progreso <= 50) rangos["26-50"] += 1;
      else if (progreso <= 75) rangos["51-75"] += 1;
      else rangos["76-100"] += 1;
    });

    return Object.entries(rangos).map(([nombre, valor]) => ({ nombre, valor }));
  }, [proyectosVisibles]);

  const evolucionMensual = useMemo(() => {
    const meses = {};
    const hoy = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      meses[clave] = {
        etiqueta: fecha.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        proyectos: 0,
      };
    }

    proyectosVisibles.forEach((proyecto) => {
      const fechaBase = new Date(proyecto.fechaCreacion || proyecto.fechaInicio || 0);
      if (Number.isNaN(fechaBase.getTime())) return;
      const clave = `${fechaBase.getFullYear()}-${String(fechaBase.getMonth() + 1).padStart(2, "0")}`;
      if (meses[clave]) {
        meses[clave].proyectos += 1;
      }
    });

    return Object.values(meses);
  }, [proyectosVisibles]);

  const resumenMetrico = useMemo(() => {
    const total = proyectosVisibles.length || 1;
    const proyectosActivosPct = Math.round((proyectosActivos.length / total) * 100);
    const proveedoresConClasificacion = proveedores.filter((proveedor) => normalizar(proveedor.clasificacionProveedor));
    const proveedoresClasificadosPct = Math.round((proveedoresConClasificacion.length / Math.max(proveedores.length, 1)) * 100);
    const proyectosConGerente = proyectosVisibles.filter((proyecto) => Boolean(proyecto.gerenteId)).length;
    const proyectosConProveedor = proyectosVisibles.filter((proyecto) => Boolean(proyecto.proveedorId)).length;

    return {
      proyectosActivosPct,
      proveedoresClasificadosPct,
      proyectosConGerente,
      proyectosConProveedor,
      totalProyectos: proyectosVisibles.length,
    };
  }, [proyectosVisibles, proyectosActivos, proveedores]);

  const generarReportePdf = () => {
    try {
      setGenerandoPdf(true);
      setMensajePdf("");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const fechaReporte = new Date();
      aplicarMembretePdf(doc, {
        titulo: "Reporte Ejecutivo del Dashboard",
        subtitulo: "Resumen operativo global del sistema",
        area: "Administracion",
      });

      const dibujarKpi = (x, y, titulo, valor, color) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, 120, 74, 8, 8, "FD");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFontSize(19);
        doc.text(String(valor), x + 12, y + 36);
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(titulo, x + 12, y + 56);
      };

      const yKpi = 172;
      dibujarKpi(40, yKpi, "Proyectos activos", proyectosActivos.length, [16, 185, 129]);
      dibujarKpi(172, yKpi, "Proveedores", proveedores.length, [37, 99, 235]);
      dibujarKpi(304, yKpi, "Empleados", empleadosTotales, [124, 58, 237]);
      dibujarKpi(436, yKpi, "Avance promedio", `${avancePromedio}%`, [245, 158, 11]);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Resumen de proveedores por clasificacion", 40, 278);

      autoTable(doc, {
        startY: 288,
        margin: { left: 40, right: 40 },
        head: [["Premium", "Estandar", "Basica", "Sin clasificar"]],
        body: [[
          estadisticasClasificacionProveedor.premium,
          estadisticasClasificacionProveedor.estandar,
          estadisticasClasificacionProveedor.basica,
          estadisticasClasificacionProveedor.sinClasificar,
        ]],
        styles: { fontSize: 10, cellPadding: 8 },
        headStyles: { fillColor: [30, 41, 59] },
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Detalle de proyectos", 40, doc.lastAutoTable.finalY + 28);

      const proyectosOrdenados = [...proyectosVisibles]
        .sort((a, b) => {
          const fechaA = new Date(a.fechaCreacion || a.fechaInicio || 0).getTime();
          const fechaB = new Date(b.fechaCreacion || b.fechaInicio || 0).getTime();
          return fechaB - fechaA;
        })
        .slice(0, 12);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 36,
        margin: { left: 40, right: 40 },
        head: [["Proyecto", "Ubicacion", "Estado", "Progreso", "Gerente", "Fecha"]],
        body: proyectosOrdenados.map((proyecto) => [
          proyecto.nombre || "Proyecto",
          proyecto.ubicacion || "Sin ubicacion",
          proyecto.estado || "Sin estado",
          `${Number(proyecto.progreso) || 0}%`,
          proyecto.gerenteNombre || "Sin asignar",
          formatoFechaCorta(proyecto.fechaCreacion || proyecto.fechaInicio),
        ]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Actividad reciente", 40, doc.lastAutoTable.finalY + 28);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 36,
        margin: { left: 40, right: 40 },
        head: [["Actividad", "Detalle", "Fecha"]],
        body: actividades.map((actividad) => [actividad.titulo, actividad.detalle, actividad.hora]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [15, 118, 110] },
      });

      aplicarPiePaginasPdf(doc);

      const nombreArchivo = `reporte-dashboard-${fechaReporte.toISOString().slice(0, 10)}.pdf`;
      doc.save(nombreArchivo);
      setMensajePdf("Reporte generado y descargado correctamente.");
    } catch (error) {
      console.log("Error generando PDF:", error);
      setMensajePdf("No se pudo generar el PDF del reporte.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const generarPdfPorTipo = (tipoReporte) => {
    setMostrarSelectorPdf(false);
    
    if (tipoReporte === "dashboard") {
      generarReportePdf();
    } else if (tipoReporte === "resumen-total") {
      try {
        setGenerandoPdf(true);
        setMensajePdf("");
        generarResumenEstadosProyectosPdf({
          proyectos: proyectosVisibles,
        });
        setMensajePdf("Resumen total generado y descargado correctamente.");
      } catch (error) {
        console.log("Error generando PDF:", error);
        setMensajePdf("No se pudo generar el PDF del reporte.");
      } finally {
        setGenerandoPdf(false);
      }
    } else if (tipoReporte === "proyectos-finalizados") {
      try {
        setGenerandoPdf(true);
        setMensajePdf("");
        generarResumenProyectosFinalizadosPdf({
          proyectos: proyectosVisibles,
        });
        setMensajePdf("Resumen de proyectos finalizados generado y descargado correctamente.");
      } catch (error) {
        console.log("Error generando PDF:", error);
        setMensajePdf("No se pudo generar el PDF del reporte.");
      } finally {
        setGenerandoPdf(false);
      }
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-title-wrap">
          <h1>Dashboard General</h1>
          <p>Estado actual de tus obras y recursos estrategicos.</p>
        </div>

        <div className="dashboard-tools">
          <input
            className="dashboard-search"
            type="text"
            placeholder="Buscar proyectos..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <button className="topbar-icon" aria-label="Notificaciones">🔔</button>
          <button className="topbar-icon" aria-label="Configuracion">⚙</button>
        </div>
      </header>

      <section className="dashboard-welcome">
        <h2>Bienvenido, Administrador</h2>
        <span>{cargando ? "Actualizando datos..." : "Panel de control operativo"}</span>
      </section>

      <section className="dashboard-kpis">
        <article className="kpi-card">
          <div className="kpi-tag">Proyectos Activos</div>
          <div className="kpi-value">{proyectosActivos.length}</div>
        </article>
        <article className="kpi-card">
          <div className="kpi-tag">Proveedores</div>
          <div className="kpi-value">{proveedores.length}</div>
        </article>
        <article className="kpi-card">
          <div className="kpi-tag">Empleados Totales</div>
          <div className="kpi-value">{empleadosTotales}</div>
        </article>
        <article className="kpi-card progress">
          <div className="kpi-tag">Avance Promedio</div>
          <div className="kpi-value">{avancePromedio}%</div>
          <div className="kpi-progress">
            <div style={{ width: `${avancePromedio}%` }} />
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel panel-table">
          <div className="panel-header">
            <h3>Proyectos Recientes</h3>
            <button className="text-link" onClick={() => onTabChange("proyectos")}>Ver todos los proyectos</button>
          </div>

          {proyectosRecientes.length === 0 ? (
            <p className="empty-state">No hay proyectos para mostrar.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Ubicacion</th>
                    <th>Progreso</th>
                    <th>Estado</th>
                    <th>Gerente</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosRecientes.map((proyecto) => (
                    <tr key={proyecto.id}>
                      <td>
                        <strong>{proyecto.nombre || "Proyecto"}</strong>
                        <span>ID: {proyecto.id.slice(0, 8)}</span>
                      </td>
                      <td>{proyecto.ubicacion || "Sin ubicacion"}</td>
                      <td>
                        <div className="row-progress">
                          <div className="bar"><div style={{ width: `${proyecto.progreso || 0}%` }} /></div>
                          <span>{proyecto.progreso || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${esProyectoActivo(proyecto.estado) ? "ok" : "wait"}`}>
                          {proyecto.estado || "sin estado"}
                        </span>
                      </td>
                      <td>{proyecto.gerenteNombre || "Sin asignar"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel panel-side">
          <h3>Accesos Rapidos</h3>
          <div className="quick-card">
            <p>Reporte Semanal</p>
            <button onClick={() => setMostrarSelectorPdf(true)} disabled={generandoPdf}>
              {generandoPdf ? "Generando PDF..." : "Descargar PDF"}
            </button>
            {mensajePdf ? <small className="pdf-feedback">{mensajePdf}</small> : null}
          </div>
          <div className="mini-metrics">
            <div>
              <span>Gerentes activos</span>
              <strong>{gerentesActivos}</strong>
            </div>
            <div>
              <span>Proyectos sin gerente</span>
              <strong>{Math.max(proyectosActivos.length - gerentesActivos, 0)}</strong>
            </div>
          </div>
        </article>

        <article className="panel panel-activity">
          <h3>Actividad Reciente</h3>
          <ul>
            {actividades.map((actividad) => (
              <li key={actividad.id}>
                <span className={`dot ${actividad.tipo || "info"}`} />
                <div>
                  <strong>{actividad.titulo}</strong>
                  <p>{actividad.detalle}</p>
                </div>
                <small>{actividad.hora}</small>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={`metrics-section ${mostrarMetricas ? "expanded" : "collapsed"}`}>
        <div className="metrics-header">
          <div>
            <h3>Métricas Profundas del CRM</h3>
            <p>Lectura operativa por estado, avance, clasificación y evolución mensual.</p>
          </div>
          <div className="metrics-actions">
            <div className="metrics-badges">
              <span>Total proyectos: {resumenMetrico.totalProyectos}</span>
              <span>Con gerente: {resumenMetrico.proyectosConGerente}</span>
              <span>Con proveedor: {resumenMetrico.proyectosConProveedor}</span>
            </div>
            <button className="metrics-toggle" onClick={() => setMostrarMetricas((prev) => !prev)}>
              {mostrarMetricas ? "Ocultar métricas" : "Mostrar métricas"}
            </button>
          </div>
        </div>

        {mostrarMetricas ? (
          <>
            <div className="metrics-grid">
              <article className="metric-panel chart-panel">
                <div className="panel-header">
                  <h3>Proyectos por estado</h3>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={proyectosPorEstado}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="nombre" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="valor" radius={[10, 10, 0, 0]} fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="metric-panel chart-panel">
                <div className="panel-header">
                  <h3>Clasificación de proveedores</h3>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Tooltip />
                      <Legend />
                      <Pie
                        data={proveedoresPorClasificacion}
                        dataKey="valor"
                        nameKey="nombre"
                        innerRadius={72}
                        outerRadius={104}
                        paddingAngle={4}
                      >
                        {proveedoresPorClasificacion.map((entry, index) => {
                          const palette = ["#0f766e", "#f59e0b", "#64748b", "#94a3b8"];
                          return <Cell key={`cell-${entry.nombre}`} fill={palette[index % palette.length]} />;
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="metric-panel chart-panel">
                <div className="panel-header">
                  <h3>Avance por rangos</h3>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={avancePorRangos}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="nombre" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="valor" radius={[10, 10, 0, 0]} fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="metric-panel chart-panel chart-wide">
                <div className="panel-header">
                  <h3>Evolución mensual de proyectos</h3>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={evolucionMensual}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="proyectos" stroke="#0f766e" fill="#99f6e4" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>

            <div className="metrics-summary-grid">
              <article className="metric-summary-card">
                <span>Proyectos activos</span>
                <strong>{resumenMetrico.proyectosActivosPct}% del total</strong>
                <p>Proporción de obras en marcha respecto al universo visible.</p>
              </article>
              <article className="metric-summary-card">
                <span>Proveedores clasificados</span>
                <strong>{resumenMetrico.proveedoresClasificadosPct}%</strong>
                <p>Indica qué tan madura está la base de proveedores registrada.</p>
              </article>
              <article className="metric-summary-card">
                <span>Gerentes asignados</span>
                <strong>{resumenMetrico.proyectosConGerente}</strong>
                <p>Proyectos con cobertura administrativa completa.</p>
              </article>
              <article className="metric-summary-card">
                <span>Proveedores asignados</span>
                <strong>{resumenMetrico.proyectosConProveedor}</strong>
                <p>Relación entre proyectos y capacidad operativa externa.</p>
              </article>
            </div>
          </>
        ) : (
          <div className="metrics-collapsed-note">
            <p>Las métricas están ocultas para dar prioridad al resumen operativo. Puedes abrirlas cuando quieras.</p>
          </div>
        )}
      </section>

      {mostrarSelectorPdf && (
        <div className="modal-overlay" onClick={() => setMostrarSelectorPdf(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Seleccionar tipo de reporte</h2>
              <button className="modal-close" onClick={() => setMostrarSelectorPdf(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Elige el tipo de reporte que deseas descargar:</p>
              <div className="reporte-opciones">
                <button
                  className="reporte-opcion"
                  onClick={() => generarPdfPorTipo("dashboard")}
                  disabled={generandoPdf}
                >
                  <strong>Reporte Ejecutivo del Dashboard</strong>
                  <small>Resumen operativo global con KPIs, proveedores, proyectos y actividades recientes</small>
                </button>
                <button
                  className="reporte-opcion"
                  onClick={() => generarPdfPorTipo("resumen-total")}
                  disabled={generandoPdf}
                >
                  <strong>Resumen de Estados</strong>
                  <small>Clasificación de proyectos por estado: Finalizados, En proceso, En espera y Pendientes</small>
                </button>
                <button
                  className="reporte-opcion"
                  onClick={() => generarPdfPorTipo("proyectos-finalizados")}
                  disabled={generandoPdf}
                >
                  <strong>Proyectos Finalizados Históricos</strong>
                  <small>Registro completo de todos los proyectos finalizados con análisis financiero</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
