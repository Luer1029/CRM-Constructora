import "./RolePage.css";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { generarResenas, generarProyectosTerminados } from "../utils/resenaUtils";

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

const IDEAS_PROYECTO = [
  { palabras: ["pint", "acab", "color"], especialidades: ["PINTURA", "ACABADOS"] },
  { palabras: ["electric", "cable", "energia"], especialidades: ["ELECTRICIDAD"] },
  { palabras: ["plom", "tuber", "sanit"], especialidades: ["PLOMERIA", "REPARACION DE TUBERIAS"] },
  { palabras: ["estructura", "metal", "viga", "obra"], especialidades: ["ESTRUCTURA", "HERRERIA"] },
  { palabras: ["carpint", "madera", "closet"], especialidades: ["CARPINTERIA"] },
  { palabras: ["imperme", "azote", "tech"], especialidades: ["IMPERMEABILIZACION"] },
  { palabras: ["alban", "muro", "bloque"], especialidades: ["ALBANILERIA"] },
  { palabras: ["seguridad", "obra", "riesgo"], especialidades: ["SEGURIDAD INDUSTRIAL"] },
  { palabras: ["maquinaria", "equipo", "grua"], especialidades: ["MAQUINARIA Y EQUIPO"] },
];

function ProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [proyectoDetalle, setProyectoDetalle] = useState(null);
  const [editandoDetalle, setEditandoDetalle] = useState(false);

  // Estados del formulario
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaEstimada, setFechaEstimada] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [estado, setEstado] = useState("activo");
  const [avanceObra, setAvanceObra] = useState(0);
  const [gerenteSeleccionado, setGerenteSeleccionado] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");
  const [gerentes, setGerentes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [usuariosCliente, setUsuariosCliente] = useState([]);
  const [cargandoGerentes, setCargandoGerentes] = useState(false);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  // Cargar proyectos al montar el componente
  useEffect(() => {
    cargarProyectos();
  }, []);

  useEffect(() => {
    if (!mostrarFormulario) {
      return undefined;
    }

    const cargarParticipantesFormulario = async () => {
      try {
        setCargandoGerentes(true);
        setCargandoProveedores(true);
        setCargandoUsuarios(true);
        const snapshot = await getDocs(collection(db, "usuarios"));
        const usuarios = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
        const listaGerentes = usuarios.filter(
          (usuario) => String(usuario.rol || "").toLowerCase().trim() === "gerente"
        );
        const listaProveedores = usuarios.filter(
          (usuario) => String(usuario.rol || "").toLowerCase().trim() === "proveedor"
        );
        const listaUsuariosCliente = usuarios.filter(
          (usuario) => String(usuario.rol || "").toLowerCase().trim() === "usuario"
        );
        setGerentes(listaGerentes);
        setProveedores(listaProveedores);
        setUsuariosCliente(listaUsuariosCliente);
      } catch (error) {
        console.log(error);
      } finally {
        setCargandoGerentes(false);
        setCargandoProveedores(false);
        setCargandoUsuarios(false);
      }
    };

    cargarParticipantesFormulario();

    const cerrarConEscape = (event) => {
      if (event.key === "Escape") {
        setMostrarFormulario(false);
      }
    };

    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [mostrarFormulario]);

  useEffect(() => {
    if (!proyectoDetalle) {
      return undefined;
    }

    const cargarParticipantesDetalle = async () => {
      try {
        setCargandoGerentes(true);
        setCargandoProveedores(true);
        setCargandoUsuarios(true);
        const snapshot = await getDocs(collection(db, "usuarios"));
        const usuarios = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
        const listaGerentes = usuarios.filter(
          (usuario) => String(usuario.rol || "").toLowerCase().trim() === "gerente"
        );
        const listaProveedores = usuarios.filter(
          (usuario) => String(usuario.rol || "").toLowerCase().trim() === "proveedor"
        );
        const listaUsuariosCliente = usuarios.filter(
          (usuario) => String(usuario.rol || "").toLowerCase().trim() === "usuario"
        );
        setGerentes(listaGerentes);
        setProveedores(listaProveedores);
        setUsuariosCliente(listaUsuariosCliente);
      } catch (error) {
        console.log(error);
      } finally {
        setCargandoGerentes(false);
        setCargandoProveedores(false);
        setCargandoUsuarios(false);
      }
    };

    cargarParticipantesDetalle();

    const cerrarDetalleConEscape = (event) => {
      if (event.key === "Escape") {
        cerrarModalDetalle();
      }
    };

    window.addEventListener("keydown", cerrarDetalleConEscape);
    return () => window.removeEventListener("keydown", cerrarDetalleConEscape);
  }, [proyectoDetalle]);

  const cargarProyectos = async () => {
    try {
      setCargando(true);
      const proyectosRef = collection(db, "proyectos");
      const querySnapshot = await getDocs(proyectosRef);
      const proyectosList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        oculto: false,
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
    if (!nombreProyecto || !descripcion || !ubicacion || !fechaInicio || !fechaEstimada) {
      setMensaje("Por favor completa todos los campos.");
      return;
    }

    const usuarioActual = auth.currentUser;
    if (!usuarioActual?.uid) {
      setMensaje("Tu sesión no es válida. Inicia sesión nuevamente para crear proyectos.");
      return;
    }

    try {
      const presupuestoNumerico = Number(presupuesto) || 0;
      const avanceNumerico = Number(avanceObra) || 0;
      const gerenteSeleccionadoObj = gerentes.find((g) => g.id === gerenteSeleccionado);
      const proveedorSeleccionadoObj = proveedores.find((p) => p.id === proveedorSeleccionado);
      const usuarioSeleccionadoObj = usuariosCliente.find((u) => u.id === usuarioSeleccionado);
      const nuevoProyecto = {
        nombre: nombreProyecto,
        descripcion: descripcion,
        ubicacion: ubicacion,
        fechaInicio: fechaInicio,
        fechaEstimada: fechaEstimada,
        presupuesto: presupuestoNumerico,
        estado: estado,
        fechaCreacion: new Date().toISOString(),
        creadoPor: usuarioActual.uid,
        progreso: avanceNumerico,
        oculto: false,
        gerenteId: gerenteSeleccionado || "",
        gerenteNombre: gerenteSeleccionadoObj
          ? `${gerenteSeleccionadoObj.nombre || ""} ${gerenteSeleccionadoObj.apellido || ""}`.trim()
          : "",
        gerenteCorreo: gerenteSeleccionadoObj?.correo || "",
        gerenteEmail: gerenteSeleccionadoObj?.correo || "",
        correoGerente: gerenteSeleccionadoObj?.correo || "",
        proveedorId: proveedorSeleccionado || "",
        proveedorNombre: proveedorSeleccionadoObj
          ? `${proveedorSeleccionadoObj.nombre || ""} ${proveedorSeleccionadoObj.apellido || ""}`.trim()
          : "",
        clasificacionProveedor: proveedorSeleccionadoObj?.clasificacionProveedor || "",
        clienteId: usuarioSeleccionado || "",
        clienteNombre: usuarioSeleccionadoObj
          ? `${usuarioSeleccionadoObj.nombre || ""} ${usuarioSeleccionadoObj.apellido || ""}`.trim()
          : "",
        clienteCorreo: usuarioSeleccionadoObj?.correo || "",
        usuarioId: usuarioSeleccionado || "",
        usuarioCorreo: usuarioSeleccionadoObj?.correo || "",
      };

      await addDoc(collection(db, "proyectos"), nuevoProyecto);
      setMensaje("¡Proyecto creado exitosamente!");

      // Limpiar formulario
      setNombreProyecto("");
      setDescripcion("");
      setUbicacion("");
      setFechaInicio("");
      setFechaEstimada("");
      setPresupuesto("");
      setEstado("pendiente");
      setAvanceObra(0);
      setGerenteSeleccionado("");
      setProveedorSeleccionado("");
      setUsuarioSeleccionado("");
      setMostrarFormulario(false);

      // Recargar proyectos
      cargarProyectos();
    } catch (error) {
      if (error.code === "permission-denied") {
        setMensaje("Error al crear proyecto: permisos insuficientes en Firestore para tu usuario.");
      } else {
        setMensaje("Error al crear proyecto: " + error.message);
      }
    }
  };

  const abrirModalDetalle = (proyecto) => {
    setEditandoDetalle(false);
    setProyectoDetalle({
      ...proyecto,
      progreso: proyecto.progreso ?? 0,
      presupuesto: proyecto.presupuesto ?? 0,
      oculto: Boolean(proyecto.oculto),
      descripcion: proyecto.descripcion || "",
      estado: proyecto.estado || "pendiente",
      gerenteId: proyecto.gerenteId || "",
      gerenteNombre: proyecto.gerenteNombre || "",
      gerenteCorreo:
        proyecto.gerenteCorreo || proyecto.gerenteEmail || proyecto.correoGerente || "",
      proveedorId: proyecto.proveedorId || "",
      proveedorNombre: proyecto.proveedorNombre || "",
      clasificacionProveedor: proyecto.clasificacionProveedor || "",
      clienteId: proyecto.clienteId || proyecto.usuarioId || "",
      clienteNombre: proyecto.clienteNombre || "",
      clienteCorreo: proyecto.clienteCorreo || proyecto.usuarioCorreo || "",
      usuarioId: proyecto.usuarioId || proyecto.clienteId || "",
      usuarioCorreo: proyecto.usuarioCorreo || proyecto.clienteCorreo || "",
    });
  };

  const cerrarModalDetalle = () => {
    setProyectoDetalle(null);
    setEditandoDetalle(false);
  };

  const guardarEdicionProyecto = async () => {
    if (!proyectoDetalle?.nombre || !proyectoDetalle?.descripcion || !proyectoDetalle?.ubicacion) {
      setMensaje("Completa nombre, descripción y dirección para guardar.");
      return;
    }

    try {
      const proyectoRef = doc(db, "proyectos", proyectoDetalle.id);
      const usuarioActual = auth.currentUser;
      const gerenteSeleccionadoObj = gerentes.find((g) => g.id === (proyectoDetalle.gerenteId || ""));
      const payload = {
        nombre: proyectoDetalle.nombre,
        descripcion: proyectoDetalle.descripcion,
        ubicacion: proyectoDetalle.ubicacion,
        estado: proyectoDetalle.estado,
        fechaInicio: proyectoDetalle.fechaInicio || "",
        fechaEstimada: proyectoDetalle.fechaEstimada || "",
        progreso: Number(proyectoDetalle.progreso) || 0,
        presupuesto: Number(proyectoDetalle.presupuesto) || 0,
        oculto: Boolean(proyectoDetalle.oculto),
        gerenteId: proyectoDetalle.gerenteId || "",
        gerenteNombre: gerenteSeleccionadoObj
          ? `${gerenteSeleccionadoObj.nombre || ""} ${gerenteSeleccionadoObj.apellido || ""}`.trim()
          : proyectoDetalle.gerenteNombre || "",
        gerenteCorreo: gerenteSeleccionadoObj?.correo || proyectoDetalle.gerenteCorreo || "",
        gerenteEmail: gerenteSeleccionadoObj?.correo || proyectoDetalle.gerenteCorreo || "",
        correoGerente: gerenteSeleccionadoObj?.correo || proyectoDetalle.gerenteCorreo || "",
        proveedorId: proyectoDetalle.proveedorId || "",
        proveedorNombre: proyectoDetalle.proveedorNombre || "",
        clasificacionProveedor: proyectoDetalle.clasificacionProveedor || "",
        clienteId: proyectoDetalle.clienteId || proyectoDetalle.usuarioId || "",
        clienteNombre: proyectoDetalle.clienteNombre || "",
        clienteCorreo: proyectoDetalle.clienteCorreo || proyectoDetalle.usuarioCorreo || "",
        usuarioId: proyectoDetalle.usuarioId || proyectoDetalle.clienteId || "",
        usuarioCorreo: proyectoDetalle.usuarioCorreo || proyectoDetalle.clienteCorreo || "",
      };

      if (!proyectoDetalle.creadoPor && usuarioActual?.uid) {
        payload.creadoPor = usuarioActual.uid;
      }

      await updateDoc(proyectoRef, payload);

      setProyectos((prev) =>
        prev.map((item) => (item.id === proyectoDetalle.id ? { ...item, ...payload } : item))
      );
      setMensaje("Proyecto actualizado correctamente.");
      setEditandoDetalle(false);
    } catch (error) {
      setMensaje("Error al actualizar proyecto: " + error.message);
    }
  };

  const alternarOcultoProyecto = async (proyecto) => {
    try {
      const siguienteOculto = !Boolean(proyecto.oculto);
      const proyectoRef = doc(db, "proyectos", proyecto.id);
      const usuarioActual = auth.currentUser;
      const payload = { oculto: siguienteOculto };

      if (!proyecto.creadoPor && usuarioActual?.uid) {
        payload.creadoPor = usuarioActual.uid;
      }

      await updateDoc(proyectoRef, payload);

      setProyectos((prev) =>
        prev.map((item) =>
          item.id === proyecto.id ? { ...item, oculto: siguienteOculto } : item
        )
      );

      if (proyectoDetalle?.id === proyecto.id) {
        setProyectoDetalle((prev) => ({ ...prev, oculto: siguienteOculto }));
      }

      setMensaje(
        siguienteOculto
          ? "Proyecto ocultado. Puedes verlo en el filtro de Ocultos."
          : "Proyecto visible nuevamente."
      );
    } catch (error) {
      setMensaje("Error al cambiar visibilidad del proyecto: " + error.message);
    }
  };

  // Calcular estadísticas
  const proyectosVisibles = proyectos.filter((p) => !p.oculto);
  const totalProyectos = proyectosVisibles.length;
  const enEjecucion = proyectosVisibles.filter(p => p.estado === "activo" || p.estado === "en progreso").length;
  const progresoPromedio = proyectosVisibles.length > 0 
    ? Math.round(proyectosVisibles.reduce((sum, p) => sum + (p.progreso || 0), 0) / proyectosVisibles.length)
    : 0;

  // Filtrar proyectos
  const proyectosFiltrados = filtroEstado === "ocultos"
    ? proyectos.filter((p) => p.oculto)
    : proyectos.filter((p) => !p.oculto && (filtroEstado === "todos" || p.estado === filtroEstado));

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

  const generarCoincidenciasProyecto = (proyectoTexto) => {
    const texto = normalizarTexto(proyectoTexto);
    const coincidencias = IDEAS_PROYECTO.filter((idea) =>
      idea.palabras.some((palabra) => texto.includes(palabra))
    ).flatMap((idea) => idea.especialidades);

    return Array.from(new Set(coincidencias));
  };

  const proveedoresConHistorial = useMemo(() => {
    const proyectosConProveedor = proyectos.filter((proyecto) => Boolean(proyecto.proveedorId));

    return proveedores
      .map((proveedor) => {
        const proyectosAsignados = proyectosConProveedor.filter(
          (proyecto) => proyecto.proveedorId === proveedor.id
        );
        const proyectosTerminados = proyectosAsignados.filter(
          (proyecto) => normalizarTexto(proyecto.estado) === "finalizado"
        );
        const proyectosEnProgreso = proyectosAsignados.filter((proyecto) => {
          const estadoProyecto = normalizarTexto(proyecto.estado);
          return estadoProyecto === "activo" || estadoProyecto === "en progreso";
        });
        const proyectosGenerados = generarProyectosTerminados(proveedor.id);
        const resenasGeneradas = generarResenas(proveedor.id, proyectosGenerados);
        const promedioCalificacion =
          resenasGeneradas.length > 0
            ? Number(
                (
                  resenasGeneradas.reduce((suma, resena) => suma + resena.calificacion, 0) /
                  resenasGeneradas.length
                ).toFixed(1)
              )
            : 0;
        const especialidades = normalizarEspecialidades(
          proveedor.especialidadesProveedor || proveedor.departamentosProveedor || []
        );

        return {
          ...proveedor,
          especialidades,
          proyectosAsignados,
          proyectosTerminados,
          proyectosEnProgreso,
          promedioCalificacion,
          totalResenas: resenasGeneradas.length,
          ultimoProyecto: proyectosAsignados[0] || null,
        };
      })
      .sort((a, b) => {
        if (b.promedioCalificacion !== a.promedioCalificacion) {
          return b.promedioCalificacion - a.promedioCalificacion;
        }

        if (b.proyectosTerminados.length !== a.proyectosTerminados.length) {
          return b.proyectosTerminados.length - a.proyectosTerminados.length;
        }

        if (b.proyectosAsignados.length !== a.proyectosAsignados.length) {
          return b.proyectosAsignados.length - a.proyectosAsignados.length;
        }

        const clasificacionOrden = { premium: 0, estandar: 1, basica: 2 };
        const ordenA = clasificacionOrden[normalizarTexto(a.clasificacionProveedor)] ?? 999;
        const ordenB = clasificacionOrden[normalizarTexto(b.clasificacionProveedor)] ?? 999;
        return ordenA - ordenB;
      })
      .map((proveedor, indice) => ({
        ...proveedor,
        posicionRanking: indice + 1,
      }));
  }, [proveedores, proyectos]);

  const proveedorRecomendado = useMemo(() => {
    if (proveedoresConHistorial.length === 0) return null;

    const coincidenciasProyecto = generarCoincidenciasProyecto(`${nombreProyecto} ${descripcion} ${ubicacion}`);

    return [...proveedoresConHistorial]
      .map((proveedor) => {
        const coincidencias = proveedor.especialidades.filter((especialidad) =>
          coincidenciasProyecto.includes(especialidad)
        ).length;
        const puntaje =
          proveedor.promedioCalificacion * 100 +
          proveedor.proyectosTerminados.length * 10 +
          proveedor.proyectosAsignados.length * 2 +
          coincidencias * 35 +
          (coincidencias > 0 ? 20 : 0);

        return { ...proveedor, puntaje, coincidencias };
      })
      .sort((a, b) => b.puntaje - a.puntaje)[0];
  }, [descripcion, nombreProyecto, ubicacion, proveedoresConHistorial]);

  const obtenerProyectosAsignadosUsuario = (usuarioId, proyectoActualId = "") => {
    if (!usuarioId) return [];

    return proyectos
      .filter((proyecto) => {
        const idProyecto = proyecto.id || "";
        const idAsignado = proyecto.usuarioId || proyecto.clienteId || "";
        return idAsignado === usuarioId && idProyecto !== proyectoActualId;
      })
      .map((proyecto) => proyecto.nombre || "Proyecto sin nombre");
  };

  const construirEtiquetaUsuario = (usuario, proyectoActualId = "") => {
    const nombreCompleto = `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim() || usuario.correo;
    const proyectosAsignados = obtenerProyectosAsignadosUsuario(usuario.id, proyectoActualId);

    if (proyectosAsignados.length === 0) {
      return nombreCompleto;
    }

    const resumenProyectos =
      proyectosAsignados.length <= 2
        ? proyectosAsignados.join(", ")
        : `${proyectosAsignados.slice(0, 2).join(", ")} +${proyectosAsignados.length - 2} más`;

    return `${nombreCompleto} (ocupado en: ${resumenProyectos})`;
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
            onClick={() => setMostrarFormulario(true)}
          >
            + Nuevo Proyecto
          </button>
        </div>

        {mostrarFormulario && (
          <div
            className="modal-overlay"
            onClick={() => setMostrarFormulario(false)}
            role="presentation"
          >
            <div
              className="modal-proyecto"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-titulo-proyecto"
            >
              <div className="modal-header">
                <h2 id="modal-titulo-proyecto">Gestionar Proyecto</h2>
                <p>Completa la información técnica y administrativa del proyecto de construcción.</p>
              </div>

              <div className="formulario-container formulario-modal proyecto-form-grid">
                <div className="proyecto-formulario-columna">
                <div className="form-grupo">
                  <label>Nombre del proyecto</label>
                  <input
                    type="text"
                    value={nombreProyecto}
                    onChange={(e) => setNombreProyecto(e.target.value)}
                    placeholder="Ej: Complejo Residencial San Isidro"
                  />
                </div>

                <div className="form-grupo">
                  <label>Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe el alcance, materiales principales y objetivos del proyecto..."
                    rows="4"
                  />
                </div>

                <div className="form-grupo form-direccion">
                  <label>Dirección de la obra</label>
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Calle, Ciudad, Estado"
                  />
                </div>

                <div className="form-fila">
                  <div className="form-grupo">
                    <label>Fecha de Inicio</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div className="form-grupo">
                    <label>Fecha Estimada de Fin</label>
                    <input
                      type="date"
                      value={fechaEstimada}
                      onChange={(e) => setFechaEstimada(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-fila">
                  <div className="form-grupo">
                    <label>Estado del Proyecto</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                      <option value="pendiente">En Planeación</option>
                      <option value="activo">En Progreso</option>
                      <option value="en espera">En Espera</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                  <div className="form-grupo">
                    <label>Avance de Obra (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={avanceObra}
                      onChange={(e) => setAvanceObra(e.target.value)}
                      placeholder="0-100"
                    />
                  </div>
                </div>

                <div className="form-grupo">
                  <label>Presupuesto estimado (opcional)</label>
                  <input
                    type="number"
                    value={presupuesto}
                    onChange={(e) => setPresupuesto(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-grupo">
                  <label>Gerente asignado (opcional)</label>
                  <select
                    value={gerenteSeleccionado}
                    onChange={(e) => setGerenteSeleccionado(e.target.value)}
                    disabled={cargandoGerentes}
                  >
                    <option value="">Sin gerente</option>
                    {gerentes.map((gerente) => {
                      const nombreCompleto = `${gerente.nombre || ""} ${gerente.apellido || ""}`.trim();
                      return (
                        <option key={gerente.id} value={gerente.id}>
                          {nombreCompleto || gerente.correo}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Proveedor asignado (opcional)</label>
                  <select
                    value={proveedorSeleccionado}
                    onChange={(e) => setProveedorSeleccionado(e.target.value)}
                    disabled={cargandoProveedores}
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map((proveedor) => {
                      const nombreCompleto = `${proveedor.nombre || ""} ${proveedor.apellido || ""}`.trim();
                      const clasificacion = proveedor.clasificacionProveedor
                        ? ` [${proveedor.clasificacionProveedor.toUpperCase()}]`
                        : "";
                      return (
                        <option key={proveedor.id} value={proveedor.id}>
                          {nombreCompleto || proveedor.correo}
                          {clasificacion}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Cliente asignado (usuario)</label>
                  <select
                    value={usuarioSeleccionado}
                    onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                    disabled={cargandoUsuarios}
                  >
                    <option value="">Sin cliente</option>
                    {usuariosCliente.map((usuario) => {
                      return (
                        <option key={usuario.id} value={usuario.id}>
                          {construirEtiquetaUsuario(usuario)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="acciones-modal">
                  <button className="btn-cancelar" onClick={() => setMostrarFormulario(false)}>
                    Cancelar
                  </button>
                  <button className="btn-submeter" onClick={crearProyecto}>
                    Guardar Proyecto
                  </button>
                </div>
                </div>

                <aside className="proyecto-panel-proveedores">
                  <div className="panel-proveedores-encabezado">
                    <p className="panel-etiqueta">Comparador de proveedores</p>
                    <h3>Historial y recomendación</h3>
                    <p>
                      Revisa quién tiene mejor desempeño para este tipo de obra y elige con más contexto.
                    </p>
                  </div>

                  {proveedorRecomendado && (
                    <div className="proveedor-recomendado">
                      <div className="proveedor-recomendado-top">
                        <span className="proveedor-rank">#1 recomendado</span>
                        <span className={`badge ${proveedorRecomendado.clasificacionProveedor ? `badge-${normalizarTexto(proveedorRecomendado.clasificacionProveedor)}` : "badge-default"}`}>
                          {proveedorRecomendado.clasificacionProveedor || "Sin clasificar"}
                        </span>
                      </div>
                      <strong>
                        {`${proveedorRecomendado.nombre || ""} ${proveedorRecomendado.apellido || ""}`.trim() || proveedorRecomendado.correo || "Proveedor recomendado"}
                      </strong>
                      <p>
                        {proveedorRecomendado.promedioCalificacion || "0.0"} de promedio, {proveedorRecomendado.proyectosTerminados.length} finalizados y {proveedorRecomendado.coincidencias || 0} coincidencias con el proyecto.
                      </p>
                    </div>
                  )}

                  <div className="proveedor-lista">
                    {proveedoresConHistorial.length === 0 ? (
                      <p className="estado-mensaje proveedor-vacio">No hay proveedores registrados todavía.</p>
                    ) : (
                      proveedoresConHistorial.map((proveedor) => {
                        const nombreCompleto = `${proveedor.nombre || ""} ${proveedor.apellido || ""}`.trim() || proveedor.correo || "Proveedor";
                        const activo = proveedorSeleccionado === proveedor.id;
                        const esRecomendado = proveedorRecomendado?.id === proveedor.id;
                        const proyectosRecientes = proveedor.proyectosAsignados.slice(0, 2);

                        return (
                          <button
                            type="button"
                            key={proveedor.id}
                            className={`proveedor-card ${activo ? "activo" : ""} ${esRecomendado ? "recomendado" : ""}`}
                            onClick={() => setProveedorSeleccionado(proveedor.id)}
                          >
                            <div className="proveedor-card-top">
                              <div>
                                <span className="proveedor-rank">#{proveedor.posicionRanking}</span>
                                <h4>{nombreCompleto}</h4>
                              </div>
                              <span className={`badge ${proveedor.clasificacionProveedor ? `badge-${normalizarTexto(proveedor.clasificacionProveedor)}` : "badge-default"}`}>
                                {proveedor.clasificacionProveedor || "Sin clasificar"}
                              </span>
                            </div>

                            <div className="proveedor-card-metrics">
                              <div>
                                <span>Promedio</span>
                                <strong>{proveedor.promedioCalificacion || "0.0"}</strong>
                              </div>
                              <div>
                                <span>Finalizados</span>
                                <strong>{proveedor.proyectosTerminados.length}</strong>
                              </div>
                              <div>
                                <span>Asignados</span>
                                <strong>{proveedor.proyectosAsignados.length}</strong>
                              </div>
                            </div>

                            <div className="proveedor-especialidades">
                              {proveedor.especialidades.length > 0 ? (
                                proveedor.especialidades.slice(0, 3).map((especialidad) => (
                                  <span key={especialidad} className="chip-especialidad">
                                    {especialidad}
                                  </span>
                                ))
                              ) : (
                                <span className="chip-especialidad chip-vacio">Sin especialidades</span>
                              )}
                            </div>

                            <div className="proveedor-historial">
                              <span className="proveedor-historial-title">Historial reciente</span>
                              {proyectosRecientes.length > 0 ? (
                                proyectosRecientes.map((proyecto) => {
                                  const statusInfo = getStatusBadge(proyecto.estado);
                                  return (
                                    <div key={proyecto.id} className="proveedor-historial-item">
                                      <div>
                                        <strong>{proyecto.nombre || "Proyecto sin nombre"}</strong>
                                        <p>{proyecto.ubicacion || "Sin ubicación"}</p>
                                      </div>
                                      <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="proveedor-historial-vacio">Todavía no tiene proyectos asignados.</p>
                              )}
                            </div>

                            <div className="proveedor-card-footer">
                              <span>{proveedor.totalResenas} reseñas estimadas</span>
                              {proveedor.ultimoProyecto && (
                                <span>Último registro: {formatoFecha(proveedor.ultimoProyecto.fechaInicio || proveedor.ultimoProyecto.fechaCreacion || proveedor.ultimoProyecto.fechaFinalizacion)}</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>
              </div>
            </div>
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
              <button
                className={`filtro-btn ${filtroEstado === "ocultos" ? "activo" : ""}`}
                onClick={() => setFiltroEstado("ocultos")}
              >
                Ocultos
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
                    <th>GERENTE A CARGO</th>
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
                        <td>{proyecto.gerenteNombre || "Sin asignar"}</td>
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
                            <button className="btn-ver" onClick={() => abrirModalDetalle(proyecto)}>
                              Ver detalles
                            </button>
                            <button
                              className="btn-editar"
                              onClick={() => alternarOcultoProyecto(proyecto)}
                            >
                              {proyecto.oculto ? "Mostrar" : "Ocultar"}
                            </button>
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

        {proyectoDetalle && (
          <div className="modal-overlay" onClick={cerrarModalDetalle} role="presentation">
            <div
              className="modal-proyecto modal-detalle"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-detalle-titulo"
            >
              <div className="modal-header detalle-header">
                <h2 id="modal-detalle-titulo">Detalle del Proyecto</h2>
                <p>Revisa la descripción, edita datos o cambia la visibilidad del proyecto.</p>
              </div>

              <div className="formulario-container formulario-modal detalle-contenido">
                <div className="detalle-badge-row">
                  <span className={`badge ${getStatusBadge(proyectoDetalle.estado).class}`}>
                    {getStatusBadge(proyectoDetalle.estado).label}
                  </span>
                  <span className={`badge ${proyectoDetalle.oculto ? "badge-default" : "badge-progreso"}`}>
                    {proyectoDetalle.oculto ? "Oculto" : "Visible"}
                  </span>
                </div>

                <div className="form-grupo">
                  <label>Nombre del proyecto</label>
                  <input
                    type="text"
                    value={proyectoDetalle.nombre || ""}
                    onChange={(e) => setProyectoDetalle((prev) => ({ ...prev, nombre: e.target.value }))}
                    disabled={!editandoDetalle}
                  />
                </div>

                <div className="form-grupo">
                  <label>Descripción del proyecto</label>
                  <textarea
                    rows="4"
                    value={proyectoDetalle.descripcion || ""}
                    onChange={(e) =>
                      setProyectoDetalle((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    disabled={!editandoDetalle}
                  />
                </div>

                <div className="form-grupo">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={proyectoDetalle.ubicacion || ""}
                    onChange={(e) => setProyectoDetalle((prev) => ({ ...prev, ubicacion: e.target.value }))}
                    disabled={!editandoDetalle}
                  />
                </div>

                <div className="form-fila">
                  <div className="form-grupo">
                    <label>Fecha de inicio</label>
                    <input
                      type="date"
                      value={proyectoDetalle.fechaInicio || ""}
                      onChange={(e) =>
                        setProyectoDetalle((prev) => ({ ...prev, fechaInicio: e.target.value }))
                      }
                      disabled={!editandoDetalle}
                    />
                  </div>
                  <div className="form-grupo">
                    <label>Fecha estimada de fin</label>
                    <input
                      type="date"
                      value={proyectoDetalle.fechaEstimada || ""}
                      onChange={(e) =>
                        setProyectoDetalle((prev) => ({ ...prev, fechaEstimada: e.target.value }))
                      }
                      disabled={!editandoDetalle}
                    />
                  </div>
                </div>

                <div className="form-fila">
                  <div className="form-grupo">
                    <label>Estado</label>
                    <select
                      value={proyectoDetalle.estado || "pendiente"}
                      onChange={(e) => setProyectoDetalle((prev) => ({ ...prev, estado: e.target.value }))}
                      disabled={!editandoDetalle}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="activo">En progreso</option>
                      <option value="en espera">En espera</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                  <div className="form-grupo">
                    <label>Avance (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={proyectoDetalle.progreso || 0}
                      onChange={(e) => setProyectoDetalle((prev) => ({ ...prev, progreso: e.target.value }))}
                      disabled={!editandoDetalle}
                    />
                  </div>
                </div>

                <div className="form-grupo">
                  <label>Presupuesto</label>
                  <input
                    type="number"
                    value={proyectoDetalle.presupuesto || 0}
                    onChange={(e) =>
                      setProyectoDetalle((prev) => ({ ...prev, presupuesto: e.target.value }))
                    }
                    disabled={!editandoDetalle}
                  />
                </div>

                {editandoDetalle && (
                  <div className="form-grupo">
                    <label>Gerente</label>
                    <select
                      value={proyectoDetalle.gerenteId || ""}
                      onChange={(e) => {
                        const gerenteSeleccionadoObj = gerentes.find((g) => g.id === e.target.value);
                        const nombreGerente = gerenteSeleccionadoObj
                          ? `${gerenteSeleccionadoObj.nombre || ""} ${gerenteSeleccionadoObj.apellido || ""}`.trim()
                          : "";

                        setProyectoDetalle((prev) => ({
                          ...prev,
                          gerenteId: e.target.value,
                          gerenteNombre: nombreGerente,
                          gerenteCorreo: gerenteSeleccionadoObj?.correo || "",
                        }));
                      }}
                    >
                      <option value="">Sin gerente</option>
                      {gerentes.map((gerente) => {
                        const nombreCompleto = `${gerente.nombre || ""} ${gerente.apellido || ""}`.trim();
                        return (
                          <option key={gerente.id} value={gerente.id}>
                            {nombreCompleto || gerente.correo}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {editandoDetalle && (
                  <div className="form-grupo">
                    <label>Proveedor</label>
                    <select
                      value={proyectoDetalle.proveedorId || ""}
                      onChange={(e) => {
                        const proveedorSeleccionadoObj = proveedores.find((p) => p.id === e.target.value);
                        setProyectoDetalle((prev) => ({
                          ...prev,
                          proveedorId: e.target.value,
                          proveedorNombre: proveedorSeleccionadoObj
                            ? `${proveedorSeleccionadoObj.nombre || ""} ${proveedorSeleccionadoObj.apellido || ""}`.trim()
                            : "",
                          clasificacionProveedor: proveedorSeleccionadoObj?.clasificacionProveedor || "",
                        }));
                      }}
                    >
                      <option value="">Sin proveedor</option>
                      {proveedores.map((proveedor) => {
                        const nombreCompleto = `${proveedor.nombre || ""} ${proveedor.apellido || ""}`.trim();
                        const clasificacion = proveedor.clasificacionProveedor
                          ? ` [${proveedor.clasificacionProveedor.toUpperCase()}]`
                          : "";
                        return (
                          <option key={proveedor.id} value={proveedor.id}>
                            {nombreCompleto || proveedor.correo}
                            {clasificacion}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {editandoDetalle && (
                  <div className="form-grupo">
                    <label>Cliente (usuario)</label>
                    <select
                      value={proyectoDetalle.clienteId || proyectoDetalle.usuarioId || ""}
                      onChange={(e) => {
                        const usuarioSeleccionadoObj = usuariosCliente.find((u) => u.id === e.target.value);
                        const nombreCliente = usuarioSeleccionadoObj
                          ? `${usuarioSeleccionadoObj.nombre || ""} ${usuarioSeleccionadoObj.apellido || ""}`.trim()
                          : "";

                        setProyectoDetalle((prev) => ({
                          ...prev,
                          clienteId: e.target.value,
                          usuarioId: e.target.value,
                          clienteNombre: nombreCliente,
                          clienteCorreo: usuarioSeleccionadoObj?.correo || "",
                          usuarioCorreo: usuarioSeleccionadoObj?.correo || "",
                        }));
                      }}
                    >
                      <option value="">Sin cliente</option>
                      {usuariosCliente.map((usuario) => {
                        return (
                          <option key={usuario.id} value={usuario.id}>
                            {construirEtiquetaUsuario(usuario, proyectoDetalle.id)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {!editandoDetalle && proyectoDetalle.proveedorNombre && (
                  <div className="form-grupo">
                    <label>Proveedor</label>
                    <input
                      type="text"
                      value={proyectoDetalle.proveedorNombre}
                      disabled
                    />
                  </div>
                )}

                {!editandoDetalle && (proyectoDetalle.gerenteNombre || proyectoDetalle.gerenteCorreo) && (
                  <div className="form-grupo">
                    <label>Gerente</label>
                    <input
                      type="text"
                      value={proyectoDetalle.gerenteNombre || proyectoDetalle.gerenteCorreo}
                      disabled
                    />
                  </div>
                )}

                {!editandoDetalle && (proyectoDetalle.clienteNombre || proyectoDetalle.clienteCorreo) && (
                  <div className="form-grupo">
                    <label>Cliente</label>
                    <input
                      type="text"
                      value={proyectoDetalle.clienteNombre || proyectoDetalle.clienteCorreo}
                      disabled
                    />
                  </div>
                )}

                <div className="acciones-modal acciones-detalle">
                  <button className="btn-cancelar" onClick={cerrarModalDetalle}>
                    Cerrar
                  </button>
                  {!editandoDetalle && (
                    <button className="btn-editar-primario" onClick={() => setEditandoDetalle(true)}>
                      Editar
                    </button>
                  )}
                  {editandoDetalle && (
                    <button className="btn-submeter" onClick={guardarEdicionProyecto}>
                      Guardar cambios
                    </button>
                  )}
                  <button
                    className="btn-editar"
                    onClick={() => alternarOcultoProyecto(proyectoDetalle)}
                  >
                    {proyectoDetalle.oculto ? "Mostrar proyecto" : "Ocultar proyecto"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProyectosPage;
