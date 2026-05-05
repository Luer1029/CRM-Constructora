import "./RolePage.css";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db, secondaryAuth } from "../firebase";
import { addDoc, collection, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";

// Datos y utilidades demo eliminados (no se usan en producción)

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



// Función de creación de proyectos demo eliminada (anteriormente usada solo en demo UI)

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

      {/* Botones demo eliminados para producción */}

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