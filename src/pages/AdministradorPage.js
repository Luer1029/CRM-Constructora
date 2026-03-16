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
  <div className="role-bg">
   <div className="role-card">
    <h2 className="role-header">Panel Administrador</h2>

    <div className="role-content role-content-left">
      <p className="role-message">Gestiona usuarios del sistema desde esta ventana.</p>

      <button
        className="admin-toggle-btn"
        onClick={() => {
          setMostrarFormulario(!mostrarFormulario);
          setMensaje("");
        }}
      >
        {mostrarFormulario ? "Cerrar formulario" : "Crear usuario"}
      </button>

      {mostrarFormulario ? (
        <div className="admin-form-card">
          <h3 className="admin-form-title">Nuevo usuario</h3>

          <div className="admin-input-group">
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e)=>setNombre(e.target.value)}
            />
          </div>

          <div className="admin-input-group">
            <input
              type="text"
              placeholder="Apellido"
              value={apellido}
              onChange={(e)=>setApellido(e.target.value)}
            />
          </div>

          <div className="admin-input-group">
            <input
              type="tel"
              placeholder="Teléfono"
              value={telefono}
              onChange={(e)=>setTelefono(e.target.value)}
            />
          </div>

          <div className="admin-input-group">
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e)=>setFechaNacimiento(e.target.value)}
            />
          </div>

          <div className="admin-input-group">
            <input
              type="text"
              placeholder="Dirección"
              value={direccion}
              onChange={(e)=>setDireccion(e.target.value)}
            />
          </div>

          <div className="admin-input-group">
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
            />
          </div>

          <div className="admin-input-group">
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />
          </div>

          <div className="admin-input-group">
            <select value={rol} onChange={(e)=>setRol(e.target.value)}>
              <option value="">Seleccionar rol</option>
              <option value="administrador">Administrador</option>
              <option value="gerente">Gerente</option>
              <option value="supervisor">Supervisor</option>
              <option value="proveedor">Proveedor</option>
              <option value="usuario">Usuario</option>
            </select>
          </div>

          <button className="admin-create-btn" onClick={crearUsuario}>
            Guardar usuario
          </button>
        </div>
      ) : null}

      {mensaje ? <p className="admin-message">{mensaje}</p> : null}
    </div>
   </div>
  </div>

 );

}

export default AdministradorPage;