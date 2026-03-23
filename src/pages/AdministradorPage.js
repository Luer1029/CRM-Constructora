import "./RolePage.css";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

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

 const crearUsuario = async () => {

   if (!nombre || !apellido || !telefono || !fechaNacimiento || !email || !password || !rol) {
     setMensaje("Completa nombre, apellido, teléfono, fecha de nacimiento, correo, contraseña y rol.");
     return;
   }

   try{

     const userCredential = await createUserWithEmailAndPassword(
       auth,
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

   }catch(error){
     console.log(error);
     setMensaje("Error al crear usuario.");
   }

 };

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
          setMostrarFormulario(!mostrarFormulario);
          setMensaje("");
        }}
      >
        {mostrarFormulario ? "Cancelar" : "+ Nuevo Usuario"}
      </button>

      {mostrarFormulario && (
        <div className="formulario-container">
          <h2>Crear Nuevo Usuario</h2>

          <div className="form-grupo">
            <label>Nombre:</label>
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="form-grupo">
            <label>Apellido:</label>
            <input
              type="text"
              placeholder="Apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
            />
          </div>

          <div className="form-fila">
            <div className="form-grupo">
              <label>Teléfono:</label>
              <input
                type="tel"
                placeholder="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="form-grupo">
              <label>Fecha de Nacimiento:</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grupo">
            <label>Dirección:</label>
            <input
              type="text"
              placeholder="Dirección"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>

          <div className="form-grupo">
            <label>Correo Electrónico:</label>
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-grupo">
            <label>Contraseña:</label>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-grupo">
            <label>Rol:</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="">Seleccionar rol</option>
              <option value="administrador">Administrador</option>
              <option value="gerente">Gerente</option>
              <option value="supervisor">Supervisor</option>
              <option value="proveedor">Proveedor</option>
              <option value="usuario">Usuario</option>
            </select>
          </div>

          <button className="btn-submeter" onClick={crearUsuario}>
            Crear Usuario
          </button>
        </div>
      )}

      <div className="lista-contenedor">
        <h2>Usuarios Registrados</h2>
        <p style={{ color: "#6b7280", marginTop: "10px" }}>
          Los usuarios creados aparecerán aquí.
        </p>
      </div>
    </div>
  </div>
 );

}

export default AdministradorPage;