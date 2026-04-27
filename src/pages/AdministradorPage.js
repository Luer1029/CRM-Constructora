import "./RolePage.css";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db, secondaryAuth, secondaryDb } from "../firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";

const DEMO_PASSWORD = "123456";

const USUARIOS_DEMO = [
  { nombre: "Carlos", apellido: "Mendoza", telefono: "3001112201", fechaNacimiento: "1992-03-11", direccion: "Calle 45 #12-20", correo: "usuario1@crm.com", rol: "usuario" },
  { nombre: "Laura", apellido: "Gomez", telefono: "3001112202", fechaNacimiento: "1994-06-18", direccion: "Carrera 18 #40-10", correo: "usuario2@crm.com", rol: "usuario" },
  { nombre: "Andres", apellido: "Rojas", telefono: "3001112203", fechaNacimiento: "1990-09-09", direccion: "Avenida 7 #60-30", correo: "usuario3@crm.com", rol: "usuario" },
  { nombre: "Diana", apellido: "Morales", telefono: "3001112204", fechaNacimiento: "1995-01-25", direccion: "Calle 90 #15-40", correo: "usuario4@crm.com", rol: "usuario" },
  { nombre: "Felipe", apellido: "Castro", telefono: "3001112205", fechaNacimiento: "1991-11-30", direccion: "Calle 120 #20-50", correo: "usuario5@crm.com", rol: "usuario" },
  { nombre: "Pedro", apellido: "Salazar", telefono: "3105551101", fechaNacimiento: "1988-05-10", direccion: "Zona Industrial Norte", correo: "proveedor1@crm.com", rol: "proveedor", clasificacionProveedor: "premium" },
  { nombre: "Marta", apellido: "Linares", telefono: "3105551102", fechaNacimiento: "1987-07-14", direccion: "Parque Empresarial Sur", correo: "proveedor2@crm.com", rol: "proveedor", clasificacionProveedor: "estandar" },
  { nombre: "Ramon", apellido: "Suarez", telefono: "3105551103", fechaNacimiento: "1985-02-21", direccion: "Calle Comercio 10", correo: "proveedor3@crm.com", rol: "proveedor", clasificacionProveedor: "basica" },
  { nombre: "Natalia", apellido: "Pinzon", telefono: "3105551104", fechaNacimiento: "1990-12-08", direccion: "Bodega Central Oriente", correo: "proveedor4@crm.com", rol: "proveedor", clasificacionProveedor: "estandar" },
  { nombre: "Jorge", apellido: "Pena", telefono: "3105551105", fechaNacimiento: "1986-04-27", direccion: "Centro Logistico Occidente", correo: "proveedor5@crm.com", rol: "proveedor", clasificacionProveedor: "premium" },
  { nombre: "Manuel", apellido: "Barrera", telefono: "3207779901", fechaNacimiento: "1984-03-03", direccion: "Calle 30 #8-20", correo: "gerente1@crm.com", rol: "gerente" },
  { nombre: "Juliana", apellido: "Delgado", telefono: "3207779902", fechaNacimiento: "1983-10-17", direccion: "Calle 50 #14-11", correo: "gerente2@crm.com", rol: "gerente" },
  { nombre: "Ricardo", apellido: "Lopez", telefono: "3207779903", fechaNacimiento: "1982-01-22", direccion: "Carrera 70 #25-16", correo: "gerente3@crm.com", rol: "gerente" },
  { nombre: "Paula", apellido: "Cortes", telefono: "3207779904", fechaNacimiento: "1989-09-05", direccion: "Calle 80 #22-09", correo: "gerente4@crm.com", rol: "gerente" },
  { nombre: "Sergio", apellido: "Nieto", telefono: "3207779905", fechaNacimiento: "1981-12-19", direccion: "Diagonal 15 #33-45", correo: "gerente5@crm.com", rol: "gerente" },
];

const PROYECTOS_DEMO = [
  { nombre: "Residencial Alameda", descripcion: "Construccion de conjunto residencial de 3 torres con zonas comunes y parqueaderos.", ubicacion: "Bogota - Suba", fechaInicio: "2026-01-10", fechaEstimada: "2026-12-20", presupuesto: 1800000000, estado: "activo", progreso: 35 },
  { nombre: "Centro Empresarial Norte", descripcion: "Obra comercial para oficinas premium y locales de servicios.", ubicacion: "Bogota - Usaquen", fechaInicio: "2026-02-15", fechaEstimada: "2027-03-30", presupuesto: 2600000000, estado: "activo", progreso: 22 },
  { nombre: "Urbanizacion Los Pinos", descripcion: "Desarrollo de vivienda de interes social con urbanismo y vias internas.", ubicacion: "Soacha", fechaInicio: "2026-03-02", fechaEstimada: "2026-11-25", presupuesto: 1500000000, estado: "en progreso", progreso: 48 },
  { nombre: "Torre Medica Central", descripcion: "Edificacion de uso medico con consultorios, imagenologia y urgencias.", ubicacion: "Medellin", fechaInicio: "2026-01-28", fechaEstimada: "2027-01-15", presupuesto: 3200000000, estado: "en espera", progreso: 12 },
  { nombre: "Parque Industrial Delta", descripcion: "Construccion de bodegas modulares para operadores logisticos.", ubicacion: "Cali", fechaInicio: "2026-04-05", fechaEstimada: "2027-02-28", presupuesto: 2900000000, estado: "pendiente", progreso: 5 },
];

const normalizarTexto = (valor) => String(valor || "").toLowerCase().trim();
const esErrorPermisos = (error) =>
  error?.code === "permission-denied" || String(error?.message || "").toLowerCase().includes("insufficient permissions");

function AdministradorPage(){

 const [nombre,setNombre] = useState("");
 const [apellido,setApellido] = useState("");
 const [telefono,setTelefono] = useState("");
 const [fechaNacimiento,setFechaNacimiento] = useState("");
 const [direccion,setDireccion] = useState("");
 const [email,setEmail] = useState("");
 const [password,setPassword] = useState("");
 const [rol,setRol] = useState("");
 const [mostrarFormulario, setMostrarFormulario] = useState(false);
 const [mensaje, setMensaje] = useState("");
 const [usuarios, setUsuarios] = useState([]);
 const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
 const [generandoDemo, setGenerandoDemo] = useState(false);
 const [agregandoProyectos, setAgregandoProyectos] = useState(false);
 const [eliminandoUsuarioId, setEliminandoUsuarioId] = useState("");
 const [filtroRol, setFiltroRol] = useState("todos");

 useEffect(() => {
   cargarUsuarios();
 }, []);

 useEffect(() => {
   if (!mostrarFormulario) {
     return undefined;
   }

   const cerrarConEscape = (event) => {
     if (event.key === "Escape") {
       setMostrarFormulario(false);
     }
   };

   window.addEventListener("keydown", cerrarConEscape);
   return () => window.removeEventListener("keydown", cerrarConEscape);
 }, [mostrarFormulario]);

 const cargarUsuarios = async () => {
   try {
     setCargandoUsuarios(true);
     const querySnapshot = await getDocs(collection(db, "usuarios"));
     const listaUsuarios = querySnapshot.docs.map((documento) => ({
       id: documento.id,
       ...documento.data(),
     }));
     setUsuarios(listaUsuarios);
   } catch (error) {
     console.log(error);
     setMensaje("Error al cargar usuarios.");
   } finally {
     setCargandoUsuarios(false);
   }
 };

 const crearUsuario = async () => {

   if (!nombre || !apellido || !telefono || !fechaNacimiento || !email || !password || !rol) {
     setMensaje("Completa nombre, apellido, teléfono, fecha de nacimiento, correo, contraseña y rol.");
     return;
   }

  try{

     const userCredential = await createUserWithEmailAndPassword(
       secondaryAuth,
       email,
       password
     );

     const uid = userCredential.user.uid;

     await setDoc(doc(db,"usuarios",uid),{
        nombre: nombre,
        apellido: apellido,
        telefono: telefono,
        fechaNacimiento: fechaNacimiento,
        direccion: direccion,
        correo: email,
        rol: rol
     });

     setMensaje("Usuario creado correctamente.");
      setNombre("");
      setApellido("");
      setTelefono("");
      setFechaNacimiento("");
      setDireccion("");
     setEmail("");
     setPassword("");
     setRol("");
     setMostrarFormulario(false);
     cargarUsuarios();

   }catch(error){
     console.log(error);
     setMensaje("Error al crear usuario.");
   } finally {
     // Evita mantener sesión iniciada en la instancia secundaria.
     await signOut(secondaryAuth).catch(() => {});
   }

 };

 const crearUsuariosYProyectosDemo = async () => {
   try {
     setGenerandoDemo(true);
     setMensaje("Generando datos demo...");

     const adminUid = auth.currentUser?.uid;
     if (!adminUid) {
       setMensaje("Sesion invalida. Inicia sesion nuevamente como administrador.");
       return;
     }

     let usuariosExistentes = [];
     try {
       const snapshotUsuarios = await getDocs(collection(db, "usuarios"));
       usuariosExistentes = snapshotUsuarios.docs.map((documento) => ({
         id: documento.id,
         ...documento.data(),
       }));
     } catch (error) {
       if (!esErrorPermisos(error)) {
         throw error;
       }
     }

     const mapaPorCorreo = usuariosExistentes.reduce((acc, item) => {
       acc[normalizarTexto(item.correo)] = item;
       return acc;
     }, {});

     const obtenerOUcrearUsuarioDemo = async (registro) => {
       const correoNormalizado = normalizarTexto(registro.correo);
       const usuarioExistente = mapaPorCorreo[correoNormalizado];

       if (usuarioExistente?.id) {
         const payloadExistente = {
           ...registro,
           correo: registro.correo,
           rol: registro.rol,
           fechaActualizacionClasificacion: registro.clasificacionProveedor ? new Date().toISOString() : undefined,
         };

         try {
           await setDoc(doc(db, "usuarios", usuarioExistente.id), payloadExistente, { merge: true });
         } catch (error) {
           if (!esErrorPermisos(error)) {
             throw error;
           }

           await signInWithEmailAndPassword(secondaryAuth, registro.correo, DEMO_PASSWORD);
           await setDoc(doc(secondaryDb, "usuarios", usuarioExistente.id), payloadExistente, { merge: true });
         } finally {
           await signOut(secondaryAuth).catch(() => {});
         }

         return { id: usuarioExistente.id, ...registro };
       }

       let uid = "";

       try {
         const credencial = await createUserWithEmailAndPassword(secondaryAuth, registro.correo, DEMO_PASSWORD);
         uid = credencial.user.uid;
       } catch (error) {
         if (error.code !== "auth/email-already-in-use") {
           throw error;
         }

         try {
           await signInWithEmailAndPassword(secondaryAuth, registro.correo, DEMO_PASSWORD);
           uid = secondaryAuth.currentUser?.uid || "";
         } catch (signInError) {
           const recargaUsuarios = await getDocs(collection(db, "usuarios"));
           const usuarioEncontrado = recargaUsuarios.docs
             .map((documento) => ({ id: documento.id, ...documento.data() }))
             .find((item) => normalizarTexto(item.correo) === correoNormalizado);

           if (!usuarioEncontrado?.id) {
             throw signInError;
           }

           uid = usuarioEncontrado.id;
         }
       } finally {
         // Se cierra en cada flujo despues de escribir para evitar afectar la sesion principal.
       }

       const payload = {
         nombre: registro.nombre,
         apellido: registro.apellido,
         telefono: registro.telefono,
         fechaNacimiento: registro.fechaNacimiento,
         direccion: registro.direccion,
         correo: registro.correo,
         rol: registro.rol,
       };

       if (registro.clasificacionProveedor) {
         payload.clasificacionProveedor = registro.clasificacionProveedor;
         payload.fechaActualizacionClasificacion = new Date().toISOString();
       }

       try {
         await setDoc(doc(secondaryDb, "usuarios", uid), payload, { merge: true });
       } catch (error) {
         if (!esErrorPermisos(error)) {
           throw error;
         }

         await setDoc(doc(db, "usuarios", uid), payload, { merge: true });
       } finally {
         await signOut(secondaryAuth).catch(() => {});
       }

       mapaPorCorreo[correoNormalizado] = { id: uid, ...payload };
       return { id: uid, ...payload };
     };

     const usuariosDemoCreados = [];
     for (const registro of USUARIOS_DEMO) {
       // Secuencia para no saturar auth secundaria y evitar bloqueos de sesión.
       const usuarioCreado = await obtenerOUcrearUsuarioDemo(registro);
       usuariosDemoCreados.push(usuarioCreado);
     }

     const proveedoresDemo = usuariosDemoCreados.filter((item) => item.rol === "proveedor");
     const gerentesDemo = usuariosDemoCreados.filter((item) => item.rol === "gerente");
     const clientesDemo = usuariosDemoCreados.filter((item) => item.rol === "usuario");

     let nombresProyectosExistentes = new Set();
     try {
       const snapshotProyectos = await getDocs(collection(db, "proyectos"));
       nombresProyectosExistentes = new Set(
         snapshotProyectos.docs.map((documento) => normalizarTexto(documento.data().nombre))
       );
     } catch (error) {
       if (!esErrorPermisos(error)) {
         throw error;
       }
     }

     let proyectosCreados = 0;

     for (let i = 0; i < PROYECTOS_DEMO.length; i += 1) {
       const proyectoDemo = PROYECTOS_DEMO[i];
       if (nombresProyectosExistentes.has(normalizarTexto(proyectoDemo.nombre))) {
         continue;
       }

       const proveedor = proveedoresDemo[i % proveedoresDemo.length];
       const gerente = gerentesDemo[i % gerentesDemo.length];
       const cliente = clientesDemo[i % clientesDemo.length];

       const payloadProyecto = {
         ...proyectoDemo,
         fechaCreacion: new Date().toISOString(),
         oculto: false,
         creadoPor: adminUid,
         proveedorId: proveedor?.id || "",
         proveedorNombre: proveedor ? `${proveedor.nombre || ""} ${proveedor.apellido || ""}`.trim() : "",
         proveedorCorreo: proveedor?.correo || "",
         clasificacionProveedor: proveedor?.clasificacionProveedor || "",
         gerenteId: gerente?.id || "",
         gerenteNombre: gerente ? `${gerente.nombre || ""} ${gerente.apellido || ""}`.trim() : "",
         gerenteCorreo: gerente?.correo || "",
         gerenteEmail: gerente?.correo || "",
         correoGerente: gerente?.correo || "",
         clienteId: cliente?.id || "",
         clienteUid: cliente?.id || "",
         clienteNombre: cliente ? `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() : "",
         clienteCorreo: cliente?.correo || "",
         usuarioId: cliente?.id || "",
         usuarioAsignadoId: cliente?.id || "",
         usuarioCorreo: cliente?.correo || "",
         correoCliente: cliente?.correo || "",
         correoClienteAsignado: cliente?.correo || "",
       };

       await addDoc(collection(db, "proyectos"), payloadProyecto);

       proyectosCreados += 1;
     }

     await signOut(secondaryAuth).catch(() => {});

     await cargarUsuarios();
     setMensaje(`Datos demo listos: 5 usuarios, 5 proveedores, 5 gerentes y ${proyectosCreados} proyectos creados.`);
   } catch (error) {
     console.log(error);
     if (esErrorPermisos(error)) {
       setMensaje("Error al generar datos demo: permisos insuficientes en Firestore para crear usuarios/proyectos.");
     } else {
       setMensaje(`Error al generar datos demo: ${error.message || "desconocido"}`);
     }
   } finally {
     await signOut(secondaryAuth).catch(() => {});
     setGenerandoDemo(false);
   }
 };

 const agregarCincoProyectosDemo = async () => {
   try {
     setAgregandoProyectos(true);
     setMensaje("Creando 5 proyectos demo...");

     const adminUid = auth.currentUser?.uid;
     if (!adminUid) {
       setMensaje("Sesion invalida. Inicia sesion nuevamente como administrador.");
       return;
     }

     let listaUsuarios = [];
     try {
       const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
       listaUsuarios = usuariosSnapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
     } catch (error) {
       if (!esErrorPermisos(error)) {
         throw error;
       }
     }

     const proveedoresDemo = listaUsuarios.filter((item) => normalizarTexto(item.rol) === "proveedor");
     const gerentesDemo = listaUsuarios.filter((item) => normalizarTexto(item.rol) === "gerente");
     const clientesDemo = listaUsuarios.filter((item) => normalizarTexto(item.rol) === "usuario");

     const lote = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12);
     let creados = 0;

     for (let i = 0; i < 5; i += 1) {
       const plantilla = PROYECTOS_DEMO[i % PROYECTOS_DEMO.length];
       const proveedor = proveedoresDemo.length ? proveedoresDemo[i % proveedoresDemo.length] : null;
       const gerente = gerentesDemo.length ? gerentesDemo[i % gerentesDemo.length] : null;
       const cliente = clientesDemo.length ? clientesDemo[i % clientesDemo.length] : null;

       const payloadProyecto = {
         ...plantilla,
         nombre: `${plantilla.nombre} - Lote ${lote}-${i + 1}`,
         fechaCreacion: new Date().toISOString(),
         oculto: false,
         creadoPor: adminUid,
         proveedorId: proveedor?.id || "",
         proveedorNombre: proveedor ? `${proveedor.nombre || ""} ${proveedor.apellido || ""}`.trim() : "",
         proveedorCorreo: proveedor?.correo || "",
         clasificacionProveedor: proveedor?.clasificacionProveedor || "",
         gerenteId: gerente?.id || "",
         gerenteNombre: gerente ? `${gerente.nombre || ""} ${gerente.apellido || ""}`.trim() : "",
         gerenteCorreo: gerente?.correo || "",
         gerenteEmail: gerente?.correo || "",
         correoGerente: gerente?.correo || "",
         clienteId: cliente?.id || "",
         clienteUid: cliente?.id || "",
         clienteNombre: cliente ? `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() : "",
         clienteCorreo: cliente?.correo || "",
         usuarioId: cliente?.id || "",
         usuarioAsignadoId: cliente?.id || "",
         usuarioCorreo: cliente?.correo || "",
         correoCliente: cliente?.correo || "",
         correoClienteAsignado: cliente?.correo || "",
       };

       await addDoc(collection(db, "proyectos"), payloadProyecto);

       creados += 1;
     }

     setMensaje(`Se crearon ${creados} proyectos demo correctamente.`);
   } catch (error) {
     console.log(error);
     if (esErrorPermisos(error)) {
       setMensaje("Error al crear proyectos demo: permisos insuficientes en Firestore.");
     } else {
       setMensaje(`Error al crear proyectos demo: ${error.message || "desconocido"}`);
     }
   } finally {
     await signOut(secondaryAuth).catch(() => {});
     setAgregandoProyectos(false);
   }
 };

 const eliminarUsuarioSeguro = async (usuario) => {
   if (!usuario?.id) return;

   if (auth.currentUser?.uid === usuario.id) {
    setMensaje("No puedes eliminar tu propio usuario mientras tienes sesión activa.");
    return;
   }

   const confirmacion = window.confirm(
    `Vas a eliminar a ${usuario.nombre || "Usuario"} (${usuario.correo || "sin correo"}).\n\n` +
      "El sistema quitara sus asignaciones de proyectos y limpiara calificaciones relacionadas para evitar errores.\n\n" +
      "¿Deseas continuar?"
   );

   if (!confirmacion) return;

   try {
    setEliminandoUsuarioId(usuario.id);

    const [proyectosSnapshot, calificacionesSnapshot] = await Promise.all([
      getDocs(collection(db, "proyectos")),
      getDocs(collection(db, "calificacionesProveedores")),
    ]);

    const batch = writeBatch(db);
    const correoUsuario = normalizarTexto(usuario.correo);
    let proyectosActualizados = 0;
    let calificacionesEliminadas = 0;

    proyectosSnapshot.docs.forEach((documento) => {
      const proyecto = { id: documento.id, ...documento.data() };
      const payload = {};

      const coincideProveedor =
        proyecto.proveedorId === usuario.id || normalizarTexto(proyecto.proveedorCorreo) === correoUsuario;
      if (coincideProveedor) {
        payload.proveedorId = "";
        payload.proveedorNombre = "";
        payload.proveedorCorreo = "";
        payload.clasificacionProveedor = "";
      }

      const coincideGerente =
        proyecto.gerenteId === usuario.id ||
        normalizarTexto(proyecto.gerenteCorreo) === correoUsuario ||
        normalizarTexto(proyecto.gerenteEmail) === correoUsuario ||
        normalizarTexto(proyecto.correoGerente) === correoUsuario;
      if (coincideGerente) {
        payload.gerenteId = "";
        payload.gerenteNombre = "";
        payload.gerenteCorreo = "";
        payload.gerenteEmail = "";
        payload.correoGerente = "";
      }

      const coincideCliente =
        proyecto.clienteId === usuario.id ||
        proyecto.clienteUid === usuario.id ||
        proyecto.usuarioId === usuario.id ||
        proyecto.usuarioAsignadoId === usuario.id ||
        normalizarTexto(proyecto.clienteCorreo) === correoUsuario ||
        normalizarTexto(proyecto.usuarioCorreo) === correoUsuario ||
        normalizarTexto(proyecto.correoCliente) === correoUsuario ||
        normalizarTexto(proyecto.correoClienteAsignado) === correoUsuario;
      if (coincideCliente) {
        payload.clienteId = "";
        payload.clienteUid = "";
        payload.clienteNombre = "";
        payload.clienteCorreo = "";
        payload.usuarioId = "";
        payload.usuarioAsignadoId = "";
        payload.usuarioCorreo = "";
        payload.correoCliente = "";
        payload.correoClienteAsignado = "";
      }

      if (Object.keys(payload).length > 0) {
        batch.update(doc(db, "proyectos", proyecto.id), payload);
        proyectosActualizados += 1;
      }
    });

    calificacionesSnapshot.docs.forEach((documento) => {
      const calificacion = documento.data();
      const esCalificacionDelProveedor =
        calificacion.proveedorId === usuario.id ||
        normalizarTexto(calificacion.proveedorCorreo) === correoUsuario;
      const esCalificacionDelCliente =
        calificacion.usuarioId === usuario.id || normalizarTexto(calificacion.usuarioCorreo) === correoUsuario;

      if (esCalificacionDelProveedor || esCalificacionDelCliente) {
        batch.delete(doc(db, "calificacionesProveedores", documento.id));
        calificacionesEliminadas += 1;
      }
    });

    batch.delete(doc(db, "usuarios", usuario.id));
    await batch.commit();

    setUsuarios((prev) => prev.filter((item) => item.id !== usuario.id));
    setMensaje(
      `Usuario eliminado. Proyectos ajustados: ${proyectosActualizados}. Calificaciones limpiadas: ${calificacionesEliminadas}.`
    );
   } catch (error) {
    console.log(error);
    setMensaje("Error al eliminar usuario de forma segura.");
   } finally {
    setEliminandoUsuarioId("");
   }
 };

 const usuariosFiltrados = usuarios.filter((usuario) => {
  if (filtroRol === "todos") return true;
  return normalizarTexto(usuario.rol) === normalizarTexto(filtroRol);
 });

 return(
  <div className="pagina-rol">
    <div className="contenedor-rol">
      <h1>👥 Gestión de Usuarios</h1>

      {mensaje && (
        <div className={`mensaje ${mensaje.includes("Error") ? "error" : "exito"}`}>
          {mensaje}
        </div>
      )}

      <button
        className="btn-agregar"
        onClick={() => {
          setMostrarFormulario(true);
          setMensaje("");
        }}
      >
        + Nuevo Usuario
      </button>

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
            aria-labelledby="modal-titulo-usuario"
          >
            <div className="modal-header">
              <h2 id="modal-titulo-usuario">Crear Usuario</h2>
              <p>Registra un nuevo usuario en el sistema.</p>
            </div>

            <div className="formulario-container formulario-modal">
              <div className="form-fila">
                <div className="form-grupo">
                  <label>Nombre</label>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div className="form-grupo">
                  <label>Apellido</label>
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-fila">
                <div className="form-grupo">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>

                <div className="form-grupo">
                  <label>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grupo">
                <label>Dirección</label>
                <input
                  type="text"
                  placeholder="Dirección"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              <div className="form-fila">
                <div className="form-grupo">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="Correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-grupo">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grupo">
                <label>Rol</label>
                <select value={rol} onChange={(e) => setRol(e.target.value)}>
                  <option value="">Seleccionar rol</option>
                  <option value="administrador">Administrador</option>
                  <option value="gerente">Gerente</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="proveedor">Proveedor</option>
                  <option value="usuario">Usuario</option>
                </select>
              </div>

              <div className="acciones-modal">
                <button className="btn-cancelar" onClick={() => setMostrarFormulario(false)}>
                  Cancelar
                </button>
                <button className="btn-submeter" onClick={crearUsuario}>
                  Crear Usuario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="lista-contenedor">
        <div className="lista-header">
          <h2>Usuarios Registrados</h2>
          <div className="filtros-estado">
            <button
              className={`filtro-btn ${filtroRol === "todos" ? "activo" : ""}`}
              onClick={() => setFiltroRol("todos")}
            >
              Todos
            </button>
            <button
              className={`filtro-btn ${filtroRol === "administrador" ? "activo" : ""}`}
              onClick={() => setFiltroRol("administrador")}
            >
              Administradores
            </button>
            <button
              className={`filtro-btn ${filtroRol === "gerente" ? "activo" : ""}`}
              onClick={() => setFiltroRol("gerente")}
            >
              Gerentes
            </button>
            <button
              className={`filtro-btn ${filtroRol === "supervisor" ? "activo" : ""}`}
              onClick={() => setFiltroRol("supervisor")}
            >
              Supervisores
            </button>
            <button
              className={`filtro-btn ${filtroRol === "proveedor" ? "activo" : ""}`}
              onClick={() => setFiltroRol("proveedor")}
            >
              Proveedores
            </button>
            <button
              className={`filtro-btn ${filtroRol === "usuario" ? "activo" : ""}`}
              onClick={() => setFiltroRol("usuario")}
            >
              Usuarios
            </button>
          </div>
        </div>

        {cargandoUsuarios ? (
          <p className="estado-mensaje">Cargando usuarios...</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p className="estado-mensaje">No hay usuarios registrados.</p>
        ) : (
          <div className="tabla-container">
            <table className="tabla-proyectos">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>CORREO</th>
                  <th>ROL</th>
                  <th>TELÉFONO</th>
                  <th>FECHA NACIMIENTO</th>
                  <th>DIRECCIÓN</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{`${usuario.nombre || ""} ${usuario.apellido || ""}`.trim() || "Sin nombre"}</td>
                    <td>{usuario.correo || "-"}</td>
                    <td>
                      <span className="badge badge-progreso">{usuario.rol || "usuario"}</span>
                    </td>
                    <td>{usuario.telefono || "-"}</td>
                    <td>{usuario.fechaNacimiento || "-"}</td>
                    <td>{usuario.direccion || "-"}</td>
                    <td>
                      <button
                        className="btn-editar"
                        onClick={() => eliminarUsuarioSeguro(usuario)}
                        disabled={eliminandoUsuarioId === usuario.id}
                      >
                        {eliminandoUsuarioId === usuario.id ? "Eliminando..." : "Eliminar"}
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

export default AdministradorPage;