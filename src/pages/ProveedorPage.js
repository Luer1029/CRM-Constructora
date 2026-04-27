import "./RolePage.css";
import { useEffect, useMemo, useState } from "react";
import { arrayUnion, collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import RoleQuickSidebar from "./RoleQuickSidebar";

const normalizarTexto = (valor) => String(valor || "").toLowerCase().trim();

const ESPECIALIDADES_CONSTRUCCION = [
  "ALBANILERIA",
  "PLOMERIA",
  "ELECTRICIDAD",
  "ESTRUCTURA",
  "ACABADOS",
  "PINTURA",
  "CARPINTERIA",
  "HERRERIA",
  "IMPERMEABILIZACION",
  "REPARACION DE TUBERIAS",
  "MAQUINARIA Y EQUIPO",
  "SEGURIDAD INDUSTRIAL",
];

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

const obtenerClaseEstado = (estado) => {
  const valor = normalizarTexto(estado);
  if (valor === "activo" || valor === "en progreso") return "badge-progreso";
  if (valor === "finalizado") return "badge-finalizado";
  if (valor === "pendiente") return "badge-pendiente";
  if (valor === "en espera") return "badge-espera";
  return "badge-default";
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
      fechaCreacion: tarea?.fechaCreacion || tarea?.creadaEn || tarea?.fecha || "",
      fechaRevision: tarea?.fechaRevision || tarea?.revisadoEn || "",
    }))
    .filter((tarea) => tarea.titulo.length > 0);
};

const serializarTareasParaFirestore = (tareas) => {
  return normalizarTareas(tareas).map((tarea) => ({
    id: String(tarea.id || generarIdTarea()),
    titulo: String(tarea.titulo || "").trim(),
    descripcion: String(tarea.descripcion || "").trim(),
    departamento: String(tarea.departamento || "").trim(),
    departamentoEncargado: String(tarea.departamento || "").trim(),
    revisado: Boolean(tarea.revisado),
    completada: Boolean(tarea.revisado),
    revisada: Boolean(tarea.revisado),
    fechaCreacion: tarea.fechaCreacion || "",
    fechaRevision: tarea.fechaRevision || "",
  }));
};

const calcularProgresoTareas = (tareas, progresoBase = 0) => {
  const lista = normalizarTareas(tareas);

  if (lista.length === 0) {
    return Math.max(0, Math.min(100, Number(progresoBase) || 0));
  }

  const revisadas = lista.filter((tarea) => tarea.revisado).length;
  return Math.round((revisadas / lista.length) * 100);
};

const generarIdTarea = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `tarea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const generarIdBitacora = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `bitacora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

const normalizarBitacoras = (bitacoras) => {
  if (!Array.isArray(bitacoras)) return [];

  return bitacoras
    .map((bitacora, indice) => ({
      id: String(bitacora?.id || bitacora?.bitacoraId || `${indice}-${bitacora?.titulo || "bitacora"}`),
      titulo: String(bitacora?.titulo || "Bitacora sin titulo").trim(),
      desarrollo: String(bitacora?.desarrollo || bitacora?.detalle || bitacora?.descripcion || "").trim(),
      fechaPublicacion: bitacora?.fechaPublicacion || bitacora?.fecha || bitacora?.creadaEn || "",
      proveedorId: String(bitacora?.proveedorId || "").trim(),
      proveedorNombre: String(bitacora?.proveedorNombre || "").trim(),
    }))
    .filter((bitacora) => bitacora.titulo.length > 0 || bitacora.desarrollo.length > 0)
    .sort((a, b) => new Date(b.fechaPublicacion || 0).getTime() - new Date(a.fechaPublicacion || 0).getTime());
};

const serializarBitacorasParaFirestore = (bitacoras) => {
  return normalizarBitacoras(bitacoras).map((bitacora) => ({
    id: String(bitacora.id || generarIdBitacora()),
    titulo: String(bitacora.titulo || "").trim(),
    desarrollo: String(bitacora.desarrollo || "").trim(),
    fechaPublicacion: bitacora.fechaPublicacion || new Date().toISOString(),
    proveedorId: String(bitacora.proveedorId || "").trim(),
    proveedorNombre: String(bitacora.proveedorNombre || "").trim(),
  }));
};

const generarProyectosTerminados = (userId) => {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cantidad = 8 + (hash % 8);
  const proyectosBase = [
    { id: "1", nombre: "Remodelacion Oficina Centro", cliente: "Empresas XYZ S.A.S", ubicacion: "Centro, Bogotá", fechaFinalizacion: "2026-02-15", presupuesto: 45000000 },
    { id: "2", nombre: "Construccion Local Comercial", cliente: "GrupoComercial 2000", ubicacion: "Usaquén, Bogotá", fechaFinalizacion: "2026-01-28", presupuesto: 72500000 },
    { id: "3", nombre: "Acabados Residencial Norte", cliente: "Inversiones Habitacionales", ubicacion: "Suba, Bogotá", fechaFinalizacion: "2025-12-10", presupuesto: 38200000 },
    { id: "4", nombre: "Reparacion Estructura Edificio", cliente: "Condo Torre Las Flores", ubicacion: "Chapinero, Bogotá", fechaFinalizacion: "2025-11-22", presupuesto: 92000000 },
    { id: "5", nombre: "Instalacion Sistemas Sanitarios", cliente: "Constructora del Sur LTDA", ubicacion: "Kennedy, Bogotá", fechaFinalizacion: "2025-10-05", presupuesto: 28500000 },
    { id: "6", nombre: "Instalacion Electrica Completa", cliente: "Bienes Raices Premium", ubicacion: "Teusaquillo, Bogotá", fechaFinalizacion: "2025-09-18", presupuesto: 34750000 },
    { id: "7", nombre: "Pintura y Acabados Interiores", cliente: "Grupo Inmobiliario Altus", ubicacion: "Barrios Unidos, Bogotá", fechaFinalizacion: "2025-08-08", presupuesto: 16200000 },
    { id: "8", nombre: "Albañileria Estructura Metalica", cliente: "Constructora Andina", ubicacion: "San Cristobal, Bogotá", fechaFinalizacion: "2025-07-25", presupuesto: 156300000 },
    { id: "9", nombre: "Carpinteria y Herreria Artesanal", cliente: "Inversiones del Caribe SAS", ubicacion: "Santa Fe, Bogotá", fechaFinalizacion: "2025-07-12", presupuesto: 22000000 },
    { id: "10", nombre: "Impermeabilizacion Azotea", cliente: "Condominio Plaza Mayor", ubicacion: "Las Lomas, Bogotá", fechaFinalizacion: "2025-06-30", presupuesto: 19500000 },
  ];
  return proyectosBase.slice(0, cantidad);
};

const generarResenas = (userId) => {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cantidad = 4 + (hash % 5);
  const calificacionBase = 3.8 + ((hash % 12) / 10);
  
  const resenasBase = [
    { id: "r1", empresa: "Empresas XYZ S.A.S", calificacion: 5.0, fecha: "2026-02-15", comentario: "Excelente trabajo en la remodelación. El equipo fue muy profesional y cumplió perfectamente.", proyecto: "Remodelacion Oficina Centro" },
    { id: "r2", empresa: "GrupoComercial 2000", calificacion: 5.0, fecha: "2026-01-28", comentario: "Construcción completada antes de lo esperado con acabados impecables.", proyecto: "Construccion Local Comercial" },
    { id: "r3", empresa: "Inversiones Habitacionales", calificacion: 4.5, fecha: "2025-12-10", comentario: "Buen trabajo en los acabados, aunque hubo pequeños retrasos iniciales.", proyecto: "Acabados Residencial Norte" },
    { id: "r4", empresa: "Condo Torre Las Flores", calificacion: 5.0, fecha: "2025-11-22", comentario: "Trabajo excepcional, equipo competente y plazos cumplidos perfectamente.", proyecto: "Reparacion Estructura Edificio" },
    { id: "r5", empresa: "Constructora del Sur LTDA", calificacion: 4.3, fecha: "2025-10-05", comentario: "Instalación completada satisfactoriamente, buena calidad al final.", proyecto: "Instalacion Sistemas Sanitarios" },
    { id: "r6", empresa: "Bienes Raices Premium", calificacion: 5.0, fecha: "2025-09-18", comentario: "Servicio excepcional y jefe de proyecto muy comunicativo.", proyecto: "Instalacion Electrica Completa" },
    { id: "r7", empresa: "Grupo Inmobiliario Altus", calificacion: 5.0, fecha: "2025-08-08", comentario: "Atención excepcional al detalle, equipo profesional y puntual.", proyecto: "Pintura y Acabados Interiores" },
    { id: "r8", empresa: "Inversiones Comerciales SAS", calificacion: 3.8, fecha: "2025-07-20", comentario: "Trabajo completado pero con problemas iniciales de supervisión.", proyecto: "Remodelacion Local Comercial" },
  ];
  
  return resenasBase.slice(0, cantidad).map(r => ({
    ...r,
    calificacion: Math.min(5.0, Math.max(3.5, r.calificacion + ((hash % 3) / 10) - 0.15))
  }));
};

function ProveedorPage({ onLogout }) {
  const [clasificacion, setClasificacion] = useState("basica");
  const [proyectosAsignados, setProyectosAsignados] = useState([]);
  const [proyectoActivoId, setProyectoActivoId] = useState("");
  const [mostrarFormularioTarea, setMostrarFormularioTarea] = useState(false);
  const [mostrarFormularioBitacora, setMostrarFormularioBitacora] = useState(false);
  const [nuevaTareaForm, setNuevaTareaForm] = useState({
    titulo: "",
    descripcion: "",
    departamento: "",
  });
  const [nuevaBitacoraForm, setNuevaBitacoraForm] = useState({
    titulo: "",
    desarrollo: "",
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoTareaId, setGuardandoTareaId] = useState("");
  const [guardandoBitacoraId, setGuardandoBitacoraId] = useState("");
  const [especialidadesProveedor, setEspecialidadesProveedor] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [proyectosTerminados, setProyectosTerminados] = useState([]);
  const [resenas, setResenas] = useState([]);

  useEffect(() => {
    const cargarConfiguracionProveedor = async () => {
      const usuarioActual = auth.currentUser;

      if (!usuarioActual?.uid) {
        console.log("❌ No hay usuario logueado");
        setMensaje("No se encontro una sesion valida para proveedor.");
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        console.log("👤 Usuario logueado:", usuarioActual.uid);
        
        // Generar datos dinámicos basados en el usuario
        const proyectosTerminadosGenerados = generarProyectosTerminados(usuarioActual.uid);
        const resenasGeneradas = generarResenas(usuarioActual.uid);
        
        console.log("🎯 Datos generados:", {
          proyectos: proyectosTerminadosGenerados.length,
          resenas: resenasGeneradas.length,
        });
        
        setProyectosTerminados(proyectosTerminadosGenerados);
        setResenas(resenasGeneradas);
        
        console.log("✅ Estado actualizado inmediatamente");
        const usuarioRef = doc(db, "usuarios", usuarioActual.uid);
        
        const calificacionPromedio = resenasGeneradas.length > 0 
          ? Number((resenasGeneradas.reduce((sum, r) => sum + r.calificacion, 0) / resenasGeneradas.length).toFixed(1))
          : 0;

        await updateDoc(usuarioRef, {
          proyectosTerminados: proyectosTerminadosGenerados.map(p => ({
            id: String(p.id),
            nombre: String(p.nombre),
            cliente: String(p.cliente),
            ubicacion: String(p.ubicacion),
            fechaFinalizacion: String(p.fechaFinalizacion),
            presupuesto: Number(p.presupuesto),
          })),
          resenas: resenasGeneradas.map(r => ({
            id: String(r.id),
            empresa: String(r.empresa),
            calificacion: Number(r.calificacion),
            fecha: String(r.fecha),
            comentario: String(r.comentario),
            proyecto: String(r.proyecto),
          })),
          calificacionPromedio: calificacionPromedio,
          totalResenas: Number(resenasGeneradas.length),
          totalProyectosTerminados: Number(proyectosTerminadosGenerados.length),
          fechaActualizacionDatos: new Date().toISOString(),
        });

        console.log("✅ Datos guardados en Firebase");

        const [usuarioSnap, proyectosSnap] = await Promise.all([
          getDoc(usuarioRef),
          getDocs(collection(db, "proyectos")),
        ]);

        if (usuarioSnap.exists()) {
          const datos = usuarioSnap.data();
          if (datos?.clasificacionProveedor) {
            setClasificacion(datos.clasificacionProveedor);
          }
          setEspecialidadesProveedor(
            normalizarEspecialidades(datos?.especialidadesProveedor || datos?.departamentosProveedor || [])
          );
        }

        const proyectos = proyectosSnap.docs
          .map((documento) => {
            const datos = documento.data();
            const tareas = normalizarTareas(datos?.tareasObra || datos?.tareas || []);
            const progresoBase = Number(datos?.progreso) || 0;

            return {
              id: documento.id,
              ...datos,
              tareasObra: tareas,
              bitacorasObra: normalizarBitacoras(datos?.bitacorasObra || datos?.bitacoras || []),
              progreso: calcularProgresoTareas(tareas, progresoBase),
            };
          })
          .filter((proyecto) => {
            if (proyecto.oculto) return false;
            return normalizarTexto(proyecto.proveedorId) === normalizarTexto(usuarioActual.uid);
          })
          .sort((a, b) => {
            const fechaA = new Date(a.fechaCreacion || a.fechaInicio || 0).getTime();
            const fechaB = new Date(b.fechaCreacion || b.fechaInicio || 0).getTime();
            return fechaB - fechaA;
          });

        setProyectosAsignados(proyectos);
        setProyectoActivoId((actual) =>
          proyectos.some((proyecto) => proyecto.id === actual) ? actual : proyectos[0]?.id || ""
        );

        setMensaje("");
      } catch (error) {
        console.error("❌ Error en cargarConfiguracionProveedor:", error);
        setMensaje("No se pudo cargar tu configuracion de clasificacion.");
      } finally {
        setCargando(false);
      }
    };

    cargarConfiguracionProveedor();
  }, []);

  // Log para verificar que los datos se renderizen
  useEffect(() => {
    console.log("📊 Estado actual de proyectosTerminados:", proyectosTerminados);
    console.log("📊 Estado actual de resenas:", resenas);
  }, [proyectosTerminados, resenas]);

  const recargarDatos = async () => {
    const usuarioActual = auth.currentUser;
    if (!usuarioActual?.uid) return;

    const proyectosTerminadosGenerados = generarProyectosTerminados(usuarioActual.uid);
    const resenasGeneradas = generarResenas(usuarioActual.uid);
    
    console.log("🔄 Recargando datos:", {
      proyectos: proyectosTerminadosGenerados.length,
      resenas: resenasGeneradas.length,
    });

    setProyectosTerminados(proyectosTerminadosGenerados);
    setResenas(resenasGeneradas);

    const usuarioRef = doc(db, "usuarios", usuarioActual.uid);
    const calificacionPromedio = resenasGeneradas.length > 0 
      ? Number((resenasGeneradas.reduce((sum, r) => sum + r.calificacion, 0) / resenasGeneradas.length).toFixed(1))
      : 0;

    try {
      await updateDoc(usuarioRef, {
        proyectosTerminados: proyectosTerminadosGenerados.map(p => ({
          id: String(p.id),
          nombre: String(p.nombre),
          cliente: String(p.cliente),
          ubicacion: String(p.ubicacion),
          fechaFinalizacion: String(p.fechaFinalizacion),
          presupuesto: Number(p.presupuesto),
        })),
        resenas: resenasGeneradas.map(r => ({
          id: String(r.id),
          empresa: String(r.empresa),
          calificacion: Number(r.calificacion),
          fecha: String(r.fecha),
          comentario: String(r.comentario),
          proyecto: String(r.proyecto),
        })),
        calificacionPromedio: calificacionPromedio,
        totalResenas: Number(resenasGeneradas.length),
        totalProyectosTerminados: Number(proyectosTerminadosGenerados.length),
        fechaActualizacionDatos: new Date().toISOString(),
      });
      console.log("✅ Datos recargados y sincronizados");
    } catch (error) {
      console.error("❌ Error sincronizando:", error);
    }
  };

  useEffect(() => {
    // Este useEffect sincroniza cambios posteriores a los datos
    const sincronizarCambios = async () => {
      const usuarioActual = auth.currentUser;
      if (!usuarioActual?.uid || (proyectosTerminados.length === 0 && resenas.length === 0)) {
        return;
      }

      try {
        const usuarioRef = doc(db, "usuarios", usuarioActual.uid);
        
        const calificacionPromedio = resenas.length > 0 
          ? Number((resenas.reduce((sum, r) => sum + r.calificacion, 0) / resenas.length).toFixed(1))
          : 0;

        await updateDoc(usuarioRef, {
          calificacionPromedio: calificacionPromedio,
          totalResenas: Number(resenas.length),
          totalProyectosTerminados: Number(proyectosTerminados.length),
          fechaActualizacionDatos: new Date().toISOString(),
        });
      } catch (error) {
        console.log("Error sincronizando cambios:", error);
      }
    };

    sincronizarCambios();
  }, [resenas.length, proyectosTerminados.length]);

  const guardarClasificacion = async () => {
    const usuarioActual = auth.currentUser;

    if (!usuarioActual?.uid) {
      setMensaje("No se encontro una sesion valida para guardar cambios.");
      return;
    }

    try {
      setGuardando(true);
      const usuarioRef = doc(db, "usuarios", usuarioActual.uid);

      await setDoc(
        usuarioRef,
        {
          correo: usuarioActual.email || "",
          rol: "proveedor",
          clasificacionProveedor: clasificacion,
          especialidadesProveedor: normalizarEspecialidades(especialidadesProveedor),
          departamentosProveedor: normalizarEspecialidades(especialidadesProveedor),
          fechaActualizacionClasificacion: new Date().toISOString(),
        },
        { merge: true }
      );

      setMensaje("Clasificacion actualizada correctamente.");
    } catch (error) {
      console.log(error);
      setMensaje("No se pudo guardar la clasificacion del proveedor.");
    } finally {
      setGuardando(false);
    }
  };

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

  const proyectoActivo = useMemo(() => {
    return proyectosAsignados.find((proyecto) => proyecto.id === proyectoActivoId) || proyectosAsignados[0] || null;
  }, [proyectosAsignados, proyectoActivoId]);

  const tareasProyectoActivo = useMemo(() => {
    if (!proyectoActivo) return [];
    return normalizarTareas(proyectoActivo.tareasObra || proyectoActivo.tareas || []);
  }, [proyectoActivo]);

  const progresoProyectoActivo = useMemo(() => {
    if (!proyectoActivo) return 0;
    return calcularProgresoTareas(tareasProyectoActivo, Number(proyectoActivo.progreso) || 0);
  }, [proyectoActivo, tareasProyectoActivo]);

  const resumenTareas = useMemo(() => {
    const total = tareasProyectoActivo.length;
    const revisadas = tareasProyectoActivo.filter((tarea) => tarea.revisado).length;

    return {
      total,
      revisadas,
      pendientes: Math.max(0, total - revisadas),
    };
  }, [tareasProyectoActivo]);

  const bitacorasProyectoActivo = useMemo(() => {
    if (!proyectoActivo) return [];
    return normalizarBitacoras(proyectoActivo.bitacorasObra || proyectoActivo.bitacoras || []);
  }, [proyectoActivo]);

  const guardarTareasYProgreso = async (proyectoId, tareasActualizadas) => {
    const tareasSerializadas = serializarTareasParaFirestore(tareasActualizadas);
    const progresoCalculado = calcularProgresoTareas(tareasSerializadas, Number(proyectoActivo?.progreso) || 0);

    try {
      setGuardandoTareaId(proyectoId);
      const proyectoRef = doc(db, "proyectos", proyectoId);
      await updateDoc(proyectoRef, {
        tareasObra: tareasSerializadas,
        progreso: progresoCalculado,
        fechaActualizacionAvance: new Date().toISOString(),
      });

      setProyectosAsignados((prev) =>
        prev.map((item) =>
          item.id === proyectoId
            ? { ...item, tareasObra: tareasSerializadas, progreso: progresoCalculado }
            : item
        )
      );
      setMensaje("Tareas actualizadas correctamente y avance recalculado.");
    } catch (error) {
      console.log(error);
      const esPermiso = error?.code === "permission-denied";
      setMensaje(
        esPermiso
          ? "No se pudieron guardar las tareas del proyecto por permisos en Firestore."
          : `No se pudieron guardar las tareas del proyecto. ${error?.message || ""}`.trim()
      );
    } finally {
      setGuardandoTareaId("");
    }
  };

  const agregarTareaAlProyectoActivo = async () => {
    if (!proyectoActivo?.id) {
      setMensaje("No hay un proyecto activo para agregar tareas.");
      return;
    }

    const tituloTarea = nuevaTareaForm.titulo.trim();
    const descripcionTarea = nuevaTareaForm.descripcion.trim();
    const departamentoTarea = nuevaTareaForm.departamento.trim().toUpperCase();

    if (!tituloTarea) {
      setMensaje("Escribe el titulo de la tarea antes de guardarla.");
      return;
    }

    if (!descripcionTarea) {
      setMensaje("Completa la descripcion de la tarea antes de guardarla.");
      return;
    }

    if (!departamentoTarea) {
      setMensaje("Indica el departamento encargado antes de guardar.");
      return;
    }

    const tareasActualizadas = [
      ...tareasProyectoActivo,
      {
        id: generarIdTarea(),
        titulo: tituloTarea,
        descripcion: descripcionTarea,
        departamento: departamentoTarea,
        revisado: false,
        fechaCreacion: new Date().toISOString(),
        fechaRevision: "",
      },
    ];

    await guardarTareasYProgreso(proyectoActivo.id, tareasActualizadas);
    setNuevaTareaForm({ titulo: "", descripcion: "", departamento: "" });
    setMostrarFormularioTarea(false);
  };

  const actualizarCampoNuevaTarea = (campo, valor) => {
    setNuevaTareaForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const alternarEspecialidad = (especialidad) => {
    setEspecialidadesProveedor((prev) => {
      const valor = String(especialidad || "").trim().toUpperCase();
      if (!valor) return prev;
      if (prev.includes(valor)) {
        return prev.filter((item) => item !== valor);
      }
      return [...prev, valor];
    });
  };

  const cambiarRevisionTarea = async (tareaId, revisado) => {
    if (!proyectoActivo?.id) return;

    const tareasActualizadas = tareasProyectoActivo.map((tarea) =>
      tarea.id === tareaId
        ? {
            ...tarea,
            revisado,
            fechaRevision: revisado ? new Date().toISOString() : "",
          }
        : tarea
    );

    await guardarTareasYProgreso(proyectoActivo.id, tareasActualizadas);
  };

  const publicarBitacoraProyectoActivo = async () => {
    if (!proyectoActivo?.id) {
      setMensaje("No hay un proyecto activo para publicar bitacoras.");
      return;
    }

    const usuarioActual = auth.currentUser;
    if (!usuarioActual?.uid) {
      setMensaje("No se encontro una sesion valida para publicar bitacoras.");
      return;
    }

    const titulo = nuevaBitacoraForm.titulo.trim();
    const desarrollo = nuevaBitacoraForm.desarrollo.trim();

    if (!titulo) {
      setMensaje("Escribe el titulo de la bitacora.");
      return;
    }

    if (!desarrollo) {
      setMensaje("Escribe el desarrollo de la bitacora.");
      return;
    }

    const bitacoraNueva = {
      id: generarIdBitacora(),
      titulo,
      desarrollo,
      fechaPublicacion: new Date().toISOString(),
      proveedorId: usuarioActual.uid,
      proveedorNombre: proyectoActivo?.proveedorNombre || usuarioActual.email || "Proveedor",
    };

    const bitacoraSerializada = serializarBitacorasParaFirestore([bitacoraNueva])[0];

    try {
      setGuardandoBitacoraId(proyectoActivo.id);
      await updateDoc(doc(db, "proyectos", proyectoActivo.id), {
        bitacorasObra: arrayUnion(bitacoraSerializada),
        fechaActualizacionBitacora: new Date().toISOString(),
      });

      setProyectosAsignados((prev) =>
        prev.map((item) =>
          item.id === proyectoActivo.id
            ? {
                ...item,
                bitacorasObra: normalizarBitacoras([bitacoraSerializada, ...(item.bitacorasObra || item.bitacoras || [])]),
              }
            : item
        )
      );

      setNuevaBitacoraForm({ titulo: "", desarrollo: "" });
      setMostrarFormularioBitacora(false);
      setMensaje("Bitacora publicada correctamente.");
    } catch (error) {
      console.log(error);
      const detalle = [error?.code, error?.message].filter(Boolean).join(" - ");
      setMensaje(`No se pudo publicar la bitacora del proyecto.${detalle ? ` ${detalle}` : ""}`);
    } finally {
      setGuardandoBitacoraId("");
    }
  };

  return (
    <div className="pagina-rol">
      <RoleQuickSidebar title="Panel Proveedor" onLogout={onLogout} />
      <div className="contenedor-rol proveedor-view">
        <div className="header-proyectos">
          <h1>Panel de Proveedor</h1>
          <p className="sub-titulo">
            Consulta tus proyectos asignados, agrega tareas de obra y marca cada revisión para recalcular el avance.
          </p>
          {proyectosAsignados.length > 1 ? (
            <div className="form-grupo proyecto-actual-selector">
              <label>Proyecto activo para tareas</label>
              <select value={proyectoActivo?.id || ""} onChange={(event) => setProyectoActivoId(event.target.value)}>
                {proyectosAsignados.map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre || "Proyecto sin nombre"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
            <div className="card-numero">{resumen.promedioAvance}%</div>
            <div className="card-progreso">
              <div className="progress-bar" style={{ width: `${resumen.promedioAvance}%` }} />
            </div>
          </div>
          <div className="card-resumen">
            <div className="card-header">TAREAS REVISADAS</div>
            <div className="card-numero">
              {resumenTareas.revisadas}/{resumenTareas.total}
            </div>
            <div className="card-footer">{resumenTareas.pendientes} pendientes por revisar</div>
          </div>
        </div>

        {cargando ? (
          <div className="lista-contenedor">
            <p className="estado-mensaje">Cargando proyecto asignado...</p>
          </div>
        ) : proyectosAsignados.length === 0 ? (
          <div className="lista-contenedor">
            <p className="estado-mensaje">No tienes proyectos asignados por ahora.</p>
          </div>
        ) : (
          <>
            <div className="lista-contenedor gerente-detalle-card">
              <div className="lista-header">
                <h2>{proyectoActivo?.nombre || "Proyecto sin nombre"}</h2>
                <span className={`badge ${obtenerClaseEstado(proyectoActivo?.estado)}`}>
                  {proyectoActivo?.estado || "Sin estado"}
                </span>
              </div>

              <p className="gerente-descripcion">
                {proyectoActivo?.descripcion || "Sin descripcion disponible para este proyecto."}
              </p>

              <div className="gerente-info-grid">
                <div className="gerente-info-item">
                  <span>Ubicacion</span>
                  <strong>{proyectoActivo?.ubicacion || "No definida"}</strong>
                </div>
                <div className="gerente-info-item">
                  <span>Fecha inicio</span>
                  <strong>{formatoFecha(proyectoActivo?.fechaInicio)}</strong>
                </div>
                <div className="gerente-info-item">
                  <span>Fecha estimada fin</span>
                  <strong>{formatoFecha(proyectoActivo?.fechaEstimada)}</strong>
                </div>
                <div className="gerente-info-item">
                  <span>Presupuesto</span>
                  <strong>{formatoMoneda(proyectoActivo?.presupuesto)}</strong>
                </div>
              </div>

              <div className="gerente-avance-block">
                <div className="gerente-avance-head">
                  <span>Avance de obra</span>
                  <strong>{progresoProyectoActivo}%</strong>
                </div>
                <div className="progreso-visual gerente-avance-bar">
                  <div
                    className="progreso-relleno"
                    style={{ width: `${progresoProyectoActivo}%` }}
                  />
                </div>

                <p className="progreso-nota">El avance se calcula automáticamente según las tareas revisadas.</p>
              </div>

              <div className="gerente-tareas-block">
                <div className="gerente-avance-head">
                  <span>Tareas de obra</span>
                  <strong>
                    {resumenTareas.revisadas}/{resumenTareas.total}
                  </strong>
                </div>

                <div className="tarea-entrada">
                  {!mostrarFormularioTarea ? (
                    <button
                      className="btn-submeter"
                      onClick={() => setMostrarFormularioTarea(true)}
                      disabled={guardandoTareaId === proyectoActivo?.id}
                    >
                      Agregar tarea
                    </button>
                  ) : (
                    <div className="tarea-formulario">
                      <div className="form-grupo">
                        <label>Titulo de la tarea</label>
                        <input
                          type="text"
                          placeholder="Ej: Revisar armado de columnas"
                          value={nuevaTareaForm.titulo}
                          onChange={(event) => actualizarCampoNuevaTarea("titulo", event.target.value)}
                          disabled={guardandoTareaId === proyectoActivo?.id}
                        />
                      </div>
                      <div className="form-grupo">
                        <label>Descripcion</label>
                        <textarea
                          rows="3"
                          placeholder="Detalle de la actividad a ejecutar"
                          value={nuevaTareaForm.descripcion}
                          onChange={(event) => actualizarCampoNuevaTarea("descripcion", event.target.value)}
                          disabled={guardandoTareaId === proyectoActivo?.id}
                        />
                      </div>
                      <div className="form-grupo">
                        <label>Departamento encargado</label>
                        <input
                          type="text"
                          list="departamentos-proveedor"
                          placeholder="Ej: PLOMERIA"
                          value={nuevaTareaForm.departamento}
                          onChange={(event) => actualizarCampoNuevaTarea("departamento", event.target.value)}
                          disabled={guardandoTareaId === proyectoActivo?.id}
                        />
                        <datalist id="departamentos-proveedor">
                          {normalizarEspecialidades(especialidadesProveedor).map((item) => (
                            <option key={item} value={item} />
                          ))}
                          {ESPECIALIDADES_CONSTRUCCION.map((item) => (
                            <option key={`base-${item}`} value={item} />
                          ))}
                        </datalist>
                      </div>
                      <div className="tarea-formulario-acciones">
                        <button
                          className="btn-submeter"
                          onClick={agregarTareaAlProyectoActivo}
                          disabled={guardandoTareaId === proyectoActivo?.id}
                        >
                          {guardandoTareaId === proyectoActivo?.id ? "Guardando..." : "Guardar tarea"}
                        </button>
                        <button
                          className="btn-ver"
                          onClick={() => {
                            setMostrarFormularioTarea(false);
                            setNuevaTareaForm({ titulo: "", descripcion: "", departamento: "" });
                          }}
                          disabled={guardandoTareaId === proyectoActivo?.id}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {tareasProyectoActivo.length === 0 ? (
                  <p className="estado-mensaje estado-tareas-vacias">
                    Aun no hay tareas registradas para este proyecto.
                  </p>
                ) : (
                  <div className="lista-tareas">
                    {tareasProyectoActivo.map((tarea) => (
                      <label
                        key={tarea.id}
                        className={`tarea-item ${tarea.revisado ? "tarea-item-revisada" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={tarea.revisado}
                          onChange={(event) => cambiarRevisionTarea(tarea.id, event.target.checked)}
                          disabled={guardandoTareaId === proyectoActivo?.id}
                        />
                        <div>
                          <strong>{tarea.titulo}</strong>
                          {tarea.descripcion ? <span>{tarea.descripcion}</span> : null}
                          {tarea.departamento ? <span>Departamento: {tarea.departamento}</span> : null}
                          <span>
                            {tarea.revisado
                              ? `Revisada${tarea.fechaRevision ? ` el ${formatoFecha(tarea.fechaRevision)}` : ""}`
                              : "Pendiente de revisión"}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="gerente-tareas-block">
                <div className="gerente-avance-head">
                  <span>Bitacoras del proyecto</span>
                  <strong>{bitacorasProyectoActivo.length} publicaciones</strong>
                </div>

                {!mostrarFormularioBitacora ? (
                  <button
                    className="btn-submeter"
                    onClick={() => setMostrarFormularioBitacora(true)}
                    disabled={guardandoBitacoraId === proyectoActivo?.id}
                  >
                    Publicar bitacora
                  </button>
                ) : (
                  <div className="tarea-formulario bitacora-formulario">
                    <div className="form-grupo">
                      <label>Titulo</label>
                      <input
                        type="text"
                        placeholder="Ej: Avance de cimentacion"
                        value={nuevaBitacoraForm.titulo}
                        onChange={(event) =>
                          setNuevaBitacoraForm((prev) => ({ ...prev, titulo: event.target.value }))
                        }
                        disabled={guardandoBitacoraId === proyectoActivo?.id}
                      />
                    </div>
                    <div className="form-grupo">
                      <label>Desarrollo</label>
                      <textarea
                        rows="4"
                        placeholder="Describe lo realizado en esta jornada"
                        value={nuevaBitacoraForm.desarrollo}
                        onChange={(event) =>
                          setNuevaBitacoraForm((prev) => ({ ...prev, desarrollo: event.target.value }))
                        }
                        disabled={guardandoBitacoraId === proyectoActivo?.id}
                      />
                    </div>
                    <div className="tarea-formulario-acciones">
                      <button
                        className="btn-submeter"
                        onClick={publicarBitacoraProyectoActivo}
                        disabled={guardandoBitacoraId === proyectoActivo?.id}
                      >
                        {guardandoBitacoraId === proyectoActivo?.id ? "Publicando..." : "Publicar"}
                      </button>
                      <button
                        className="btn-ver"
                        onClick={() => {
                          setMostrarFormularioBitacora(false);
                          setNuevaBitacoraForm({ titulo: "", desarrollo: "" });
                        }}
                        disabled={guardandoBitacoraId === proyectoActivo?.id}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {bitacorasProyectoActivo.length === 0 ? (
                  <p className="estado-mensaje estado-tareas-vacias">
                    Aun no hay bitacoras publicadas para este proyecto.
                  </p>
                ) : (
                  <div className="timeline-bitacora">
                    {bitacorasProyectoActivo.map((bitacora) => (
                      <article key={bitacora.id} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-card">
                          <header className="timeline-head">
                            <h4>{bitacora.titulo}</h4>
                            <span>{formatoFechaHora(bitacora.fechaPublicacion)}</span>
                          </header>
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
                        <th>UBICACION</th>
                        <th>ESTADO</th>
                        <th>AVANCE</th>
                        <th>TAREAS</th>
                        <th>ACCION</th>
                        <th>FECHA FIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectosAsignados.slice(1).map((proyecto) => (
                        <tr key={proyecto.id}>
                          <td>{proyecto.nombre || "Proyecto"}</td>
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
                            <div className="celda-tareas">
                              <span>
                                {normalizarTareas(proyecto.tareasObra || proyecto.tareas || []).filter((tarea) => tarea.revisado).length}/
                                {normalizarTareas(proyecto.tareasObra || proyecto.tareas || []).length}
                              </span>
                              <button className="btn-ver" onClick={() => setProyectoActivoId(proyecto.id)}>
                                Gestionar
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn-ver"
                              onClick={() => setProyectoActivoId(proyecto.id)}
                            >
                              Ver detalle
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

        <div className="lista-contenedor proveedor-card">
          <div className="lista-header">
            <h2>Clasificacion del proveedor</h2>
            <span className="role-badge">Rol: Proveedor</span>
          </div>

          {mensaje ? (
            <div className={`mensaje ${mensaje.includes("No se pudo") || mensaje.includes("No se encontro") ? "error" : "exito"}`}>
              {mensaje}
            </div>
          ) : null}

          <p className="proveedor-help-text">
            Tu clasificacion es administrada por el equipo de administración.
          </p>

          <div className="proveedor-opciones">
            <label className={`proveedor-opcion ${clasificacion === "basica" ? "activa" : ""}`}>
              <input
                type="radio"
                name="clasificacion"
                value="basica"
                checked={clasificacion === "basica"}
                onChange={(event) => setClasificacion(event.target.value)}
                disabled={true}
              />
              <div>
                <strong>Basica</strong>
                <span>Proveedor en etapa inicial o con volumen bajo.</span>
              </div>
            </label>

            <label className={`proveedor-opcion ${clasificacion === "estandar" ? "activa" : ""}`}>
              <input
                type="radio"
                name="clasificacion"
                value="estandar"
                checked={clasificacion === "estandar"}
                onChange={(event) => setClasificacion(event.target.value)}
                disabled={true}
              />
              <div>
                <strong>Estandar</strong>
                <span>Proveedor con operaciones estables y cumplimiento regular.</span>
              </div>
            </label>

            <label className={`proveedor-opcion ${clasificacion === "premium" ? "activa" : ""}`}>
              <input
                type="radio"
                name="clasificacion"
                value="premium"
                checked={clasificacion === "premium"}
                onChange={(event) => setClasificacion(event.target.value)}
                disabled={true}
              />
              <div>
                <strong>Premium</strong>
                <span>Proveedor estrategico con alto nivel de servicio y capacidad.</span>
              </div>
            </label>
          </div>

          <div className="gerente-tareas-block" style={{ marginTop: "14px" }}>
            <div className="gerente-avance-head">
              <span>Especialidades y departamentos</span>
              <strong>{normalizarEspecialidades(especialidadesProveedor).length} seleccionadas</strong>
            </div>
            <p className="proveedor-help-text">
              Las especialidades son administradas por el equipo de administración.
            </p>
            <div className="proveedor-opciones proveedor-opciones-especialidades">
              {ESPECIALIDADES_CONSTRUCCION.map((especialidad) => (
                <label
                  key={especialidad}
                  className={`proveedor-opcion ${normalizarEspecialidades(especialidadesProveedor).includes(especialidad) ? "activa" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={normalizarEspecialidades(especialidadesProveedor).includes(especialidad)}
                    onChange={() => alternarEspecialidad(especialidad)}
                    disabled={true}
                  />
                  <div>
                    <strong>{especialidad}</strong>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="proveedor-acciones">
            <button className="btn-submeter" onClick={guardarClasificacion} disabled={true} title="La clasificacion y especialidades son administradas por el equipo de administración">
              {guardando ? "Guardando..." : "Guardar clasificacion"}
            </button>
            <button className="btn-ver" onClick={recargarDatos} style={{ marginLeft: "10px" }} title="Recarga los proyectos y reviews desde Firebase">
              🔄 Recargar Datos
            </button>
          </div>
        </div>

        <div className="lista-contenedor gerente-tabla-secundaria">
          <div className="lista-header">
            <h2>Proyectos Terminados</h2>
            <span className="role-badge">{proyectosTerminados.length} completados</span>
          </div>
          <div className="tabla-container">
            <table className="tabla-proyectos">
              <thead>
                <tr>
                  <th>PROYECTO</th>
                  <th>CLIENTE</th>
                  <th>UBICACION</th>
                  <th>FECHA FINALIZACION</th>
                  <th>PRESUPUESTO</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {proyectosTerminados.length > 0 ? (
                  proyectosTerminados.map((proyecto) => (
                    <tr key={proyecto.id}>
                      <td>{proyecto.nombre}</td>
                      <td>{proyecto.cliente}</td>
                      <td>{proyecto.ubicacion}</td>
                      <td>{formatoFecha(proyecto.fechaFinalizacion)}</td>
                      <td>{formatoMoneda(proyecto.presupuesto)}</td>
                      <td><span className="badge badge-finalizado">Finalizado</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#999'}}>
                      No hay proyectos terminados aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lista-contenedor">
          <div className="lista-header">
            <h2>Calificaciones y Reviews</h2>
            <strong>
              {resenas.length > 0 
                ? `${(resenas.reduce((sum, r) => sum + r.calificacion, 0) / resenas.length).toFixed(1)} ⭐ / 5.0 (${resenas.length} opiniones)`
                : "Sin calificaciones aún"
              }
            </strong>
          </div>

          {resenas.length > 0 && (
            <div className="resumen-cards" style={{ marginBottom: "20px" }}>
              <div className="card-resumen">
                <div className="card-header">PROMEDIO</div>
                <div className="card-numero">
                  {(resenas.reduce((sum, r) => sum + r.calificacion, 0) / resenas.length).toFixed(1)}
                </div>
                <div className="card-footer">Calificación</div>
              </div>
              <div className="card-resumen">
                <div className="card-header">TOTAL REVIEWS</div>
                <div className="card-numero">{resenas.length}</div>
                <div className="card-footer">Opiniones</div>
              </div>
              <div className="card-resumen">
                <div className="card-header">MAYOR NOTA</div>
                <div className="card-numero">{Math.max(...resenas.map(r => r.calificacion)).toFixed(1)}</div>
                <div className="card-footer">Mejor valoración</div>
              </div>
              <div className="card-resumen">
                <div className="card-header">MENOR NOTA</div>
                <div className="card-numero">{Math.min(...resenas.map(r => r.calificacion)).toFixed(1)}</div>
                <div className="card-footer">Valor mínimo</div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: "16px" }}>
            {resenas.length > 0 ? (
              resenas.map((resena) => {
                const borderColor = 
                  resena.calificacion >= 4.5 ? "#4CAF50" :
                  resena.calificacion >= 4.0 ? "#FFC107" :
                  resena.calificacion >= 3.5 ? "#FFA726" :
                  "#F44336";
                
                return (
                  <div key={resena.id} style={{ padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "8px", borderLeft: `4px solid ${borderColor}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                      <div>
                        <strong>{resena.empresa}</strong>
                        <span style={{ color: "#FFB800", marginLeft: "8px" }}>
                          {'⭐'.repeat(Math.round(resena.calificacion))} {resena.calificacion}
                        </span>
                      </div>
                      <small style={{ color: "#666" }}>{formatoFecha(resena.fecha)}</small>
                    </div>
                    <p style={{ margin: "8px 0", color: "#333" }}>
                      {resena.comentario}
                    </p>
                    <small style={{ color: "#999" }}>Proyecto: {resena.proyecto}</small>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                No hay reviews disponibles aún
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProveedorPage;
