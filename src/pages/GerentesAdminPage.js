import "./RolePage.css";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

const ESTADOS_ACTIVOS = ["activo", "en progreso"];

const normalizarTexto = (valor) => String(valor || "").toLowerCase().trim();

const esProyectoActivo = (estado) => ESTADOS_ACTIVOS.includes(normalizarTexto(estado));

function GerentesAdminPage() {
  const [gerentes, setGerentes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [usuariosSnapshot, proyectosSnapshot] = await Promise.all([
        getDocs(collection(db, "usuarios")),
        getDocs(collection(db, "proyectos")),
      ]);

      const listaGerentes = usuariosSnapshot.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }))
        .filter((usuario) => normalizarTexto(usuario.rol) === "gerente");

      const listaProyectos = proyectosSnapshot.docs.map((documento) => ({
        id: documento.id,
        oculto: false,
        ...documento.data(),
      }));

      setGerentes(listaGerentes);
      setProyectos(listaProyectos);
      setAsignaciones(
        listaProyectos.reduce((acc, proyecto) => {
          acc[proyecto.id] = proyecto.gerenteId || "";
          return acc;
        }, {})
      );
      setMensaje("");
    } catch (error) {
      console.log(error);
      setMensaje("Error al cargar la gestión de gerentes.");
    } finally {
      setCargando(false);
    }
  };

  const proyectosVisibles = useMemo(
    () => proyectos.filter((proyecto) => !proyecto.oculto),
    [proyectos]
  );

  const proyectosActivos = useMemo(
    () => proyectosVisibles.filter((proyecto) => esProyectoActivo(proyecto.estado)),
    [proyectosVisibles]
  );

  const gerentesConProyectos = useMemo(
    () =>
      gerentes.map((gerente) => {
        const activos = proyectosActivos.filter((proyecto) => proyecto.gerenteId === gerente.id);
        return {
          ...gerente,
          proyectosActivos: activos,
          estaActivo: activos.length > 0,
        };
      }),
    [gerentes, proyectosActivos]
  );

  const totalGerentes = gerentes.length;
  const gerentesActivos = gerentesConProyectos.filter((gerente) => gerente.estaActivo).length;
  const proyectosActivosAsignados = proyectosActivos.filter((proyecto) => proyecto.gerenteId).length;

  const handleCambioAsignacion = (proyectoId, gerenteId) => {
    setAsignaciones((prev) => ({
      ...prev,
      [proyectoId]: gerenteId,
    }));
  };

  const gerenteAsignadoAOtroProyecto = (gerenteId, proyectoActualId) => {
    if (!gerenteId) return false;

    return proyectosVisibles.some(
      (proyecto) => proyecto.id !== proyectoActualId && proyecto.gerenteId === gerenteId
    );
  };

  const obtenerNombreGerente = (gerente) => {
    const nombreCompleto = `${gerente.nombre || ""} ${gerente.apellido || ""}`.trim();
    return nombreCompleto || gerente.correo || "Gerente";
  };

  const asignarGerenteAProyecto = async (proyecto) => {
    try {
      const gerenteId = asignaciones[proyecto.id] || "";
      const gerenteSeleccionado = gerentes.find((gerente) => gerente.id === gerenteId);

      const payload = gerenteSeleccionado
        ? {
            gerenteId: gerenteSeleccionado.id,
            gerenteNombre: obtenerNombreGerente(gerenteSeleccionado),
            gerenteCorreo: gerenteSeleccionado.correo || "",
            gerenteEmail: gerenteSeleccionado.correo || "",
            correoGerente: gerenteSeleccionado.correo || "",
          }
        : {
            gerenteId: "",
            gerenteNombre: "",
            gerenteCorreo: "",
            gerenteEmail: "",
            correoGerente: "",
          };

      if (gerenteSeleccionado) {
        const batch = writeBatch(db);

        proyectosVisibles
          .filter((item) => item.id !== proyecto.id && item.gerenteId === gerenteSeleccionado.id)
          .forEach((item) => {
            batch.update(doc(db, "proyectos", item.id), {
              gerenteId: "",
              gerenteNombre: "",
              gerenteCorreo: "",
              gerenteEmail: "",
              correoGerente: "",
            });
          });

        batch.update(doc(db, "proyectos", proyecto.id), payload);
        await batch.commit();
      } else {
        await updateDoc(doc(db, "proyectos", proyecto.id), payload);
      }

      setProyectos((prev) =>
        prev.map((item) => {
          if (item.id === proyecto.id) {
            return { ...item, ...payload };
          }

          if (gerenteSeleccionado && item.gerenteId === gerenteSeleccionado.id) {
            return {
              ...item,
              gerenteId: "",
              gerenteNombre: "",
              gerenteCorreo: "",
              gerenteEmail: "",
              correoGerente: "",
            };
          }

          return item;
        })
      );

      if (payload.gerenteId) {
        const reasignado = proyectosVisibles.some(
          (item) => item.id !== proyecto.id && item.gerenteId === payload.gerenteId
        );

        setMensaje(
          reasignado
            ? "Gerente reasignado correctamente. Ahora solo tiene este proyecto."
            : "Gerente asignado correctamente al proyecto."
        );
      } else {
        setMensaje("Proyecto sin gerente asignado.");
      }
    } catch (error) {
      console.log(error);
      setMensaje("Error al asignar gerente al proyecto.");
    }
  };

  const liberarGerenteDeTodosLosProyectos = async (gerente) => {
    try {
      const correoGerente = normalizarTexto(gerente.correo);
      const proyectosDelGerente = proyectos.filter((proyecto) => {
        if (proyecto.gerenteId === gerente.id) return true;

        return [
          normalizarTexto(proyecto.gerenteCorreo),
          normalizarTexto(proyecto.gerenteEmail),
          normalizarTexto(proyecto.correoGerente),
        ].includes(correoGerente);
      });

      if (!proyectosDelGerente.length) {
        setMensaje("Ese gerente no tiene proyectos asignados.");
        return;
      }

      const batch = writeBatch(db);

      proyectosDelGerente.forEach((proyecto) => {
        batch.update(doc(db, "proyectos", proyecto.id), {
          gerenteId: "",
          gerenteNombre: "",
          gerenteCorreo: "",
          gerenteEmail: "",
          correoGerente: "",
        });
      });

      await batch.commit();

      setProyectos((prev) =>
        prev.map((proyecto) =>
          proyectosDelGerente.some((item) => item.id === proyecto.id)
            ? {
                ...proyecto,
                gerenteId: "",
                gerenteNombre: "",
                gerenteCorreo: "",
                gerenteEmail: "",
                correoGerente: "",
              }
            : proyecto
        )
      );

      setAsignaciones((prev) => {
        const actualizado = { ...prev };
        proyectosDelGerente.forEach((proyecto) => {
          actualizado[proyecto.id] = "";
        });
        return actualizado;
      });

      setMensaje("Gerente desasignado de todos sus proyectos.");
    } catch (error) {
      console.log(error);
      setMensaje("Error al liberar al gerente de sus proyectos.");
    }
  };

  const quitarGerenteDeProyecto = async (proyecto) => {
    try {
      const payload = {
        gerenteId: "",
        gerenteNombre: "",
        gerenteCorreo: "",
        gerenteEmail: "",
        correoGerente: "",
      };

      await updateDoc(doc(db, "proyectos", proyecto.id), payload);

      setProyectos((prev) =>
        prev.map((item) => (item.id === proyecto.id ? { ...item, ...payload } : item))
      );

      setAsignaciones((prev) => ({
        ...prev,
        [proyecto.id]: "",
      }));

      setMensaje("Gerente removido correctamente del proyecto.");
    } catch (error) {
      console.log(error);
      setMensaje("Error al remover el gerente del proyecto.");
    }
  };

  return (
    <div className="pagina-rol">
      <div className="contenedor-rol">
        <div className="header-proyectos">
          <h1>🧭 Gestión de Gerentes</h1>
          <p className="sub-titulo">
            Consulta gerentes disponibles, sus proyectos activos y asigna un gerente por proyecto.
          </p>
        </div>

        {mensaje && (
          <div className={`mensaje ${mensaje.includes("Error") ? "error" : "exito"}`}>
            {mensaje}
          </div>
        )}

        <div className="resumen-cards">
          <div className="card-resumen">
            <div className="card-header">TOTAL GERENTES</div>
            <div className="card-numero">{totalGerentes}</div>
          </div>
          <div className="card-resumen">
            <div className="card-header">GERENTES ACTIVOS</div>
            <div className="card-numero">{gerentesActivos}</div>
          </div>
          <div className="card-resumen">
            <div className="card-header">PROYECTOS ACTIVOS ASIGNADOS</div>
            <div className="card-numero">{proyectosActivosAsignados}</div>
          </div>
        </div>

        <div className="lista-contenedor">
          <div className="lista-header">
            <h2>Lista de Gerentes</h2>
          </div>

          {cargando ? (
            <p className="estado-mensaje">Cargando gerentes...</p>
          ) : gerentesConProyectos.length === 0 ? (
            <p className="estado-mensaje">No hay gerentes registrados en Gestión de Usuarios.</p>
          ) : (
            <div className="tabla-container">
              <table className="tabla-proyectos">
                <thead>
                  <tr>
                    <th>GERENTE</th>
                    <th>CORREO</th>
                    <th>ESTADO</th>
                    <th>PROYECTOS ACTIVOS</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {gerentesConProyectos.map((gerente) => (
                    <tr key={gerente.id}>
                      <td>{obtenerNombreGerente(gerente)}</td>
                      <td>{gerente.correo || "-"}</td>
                      <td>
                        <span
                          className={`badge ${gerente.estaActivo ? "badge-finalizado" : "badge-pendiente"}`}
                        >
                          {gerente.estaActivo ? "Activo" : "Sin proyectos activos"}
                        </span>
                      </td>
                      <td>
                        {gerente.proyectosActivos.length > 0
                          ? gerente.proyectosActivos.map((proyecto) => proyecto.nombre).join(", ")
                          : "-"}
                      </td>
                      <td>
                        <button
                          className="btn-editar"
                          onClick={() => liberarGerenteDeTodosLosProyectos(gerente)}
                          disabled={!gerente.estaActivo}
                        >
                          Quitar de todos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lista-contenedor gerentes-asignacion">
          <div className="lista-header">
            <h2>Asignar gerente por proyecto</h2>
          </div>

          {cargando ? (
            <p className="estado-mensaje">Cargando proyectos...</p>
          ) : proyectosVisibles.length === 0 ? (
            <p className="estado-mensaje">No hay proyectos disponibles.</p>
          ) : (
            <div className="tabla-container">
              <table className="tabla-proyectos">
                <thead>
                  <tr>
                    <th>PROYECTO</th>
                    <th>ESTADO</th>
                    <th>GERENTE ACTUAL</th>
                    <th>ASIGNAR GERENTE</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosVisibles.map((proyecto) => (
                    <tr key={proyecto.id}>
                      <td>{proyecto.nombre}</td>
                      <td>
                        <span className={`badge ${esProyectoActivo(proyecto.estado) ? "badge-progreso" : "badge-default"}`}>
                          {proyecto.estado || "Sin estado"}
                        </span>
                      </td>
                      <td>{proyecto.gerenteNombre || "Sin asignar"}</td>
                      <td>
                        <select
                          className="select-tabla"
                          value={asignaciones[proyecto.id] || ""}
                          onChange={(e) => handleCambioAsignacion(proyecto.id, e.target.value)}
                        >
                          <option value="">Sin gerente</option>
                          {gerentes.map((gerente) => (
                            <option
                              key={gerente.id}
                              value={gerente.id}
                              disabled={
                                gerenteAsignadoAOtroProyecto(gerente.id, proyecto.id) &&
                                asignaciones[proyecto.id] !== gerente.id
                              }
                            >
                              {obtenerNombreGerente(gerente)}
                              {gerenteAsignadoAOtroProyecto(gerente.id, proyecto.id)
                                ? " (ocupado)"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="acciones-tabla">
                          <button className="btn-ver" onClick={() => asignarGerenteAProyecto(proyecto)}>
                            Guardar
                          </button>
                          <button
                            className="btn-editar"
                            onClick={() => quitarGerenteDeProyecto(proyecto)}
                            disabled={!proyecto.gerenteId}
                          >
                            Quitar gerente
                          </button>
                        </div>
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

export default GerentesAdminPage;
