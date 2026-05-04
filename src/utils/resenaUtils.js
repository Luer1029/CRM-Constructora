const COMENTARIOS_RESEÑA = [
  "Excelente cumplimiento en tiempos y calidad de entrega.",
  "La coordinacion del equipo fue profesional durante todo el proyecto.",
  "Buen resultado final y buena comunicacion con el cliente.",
  "Trabajo consistente, ordenado y con atencion a los detalles.",
  "Cumplieron los objetivos tecnicos con una ejecucion confiable.",
  "Proyecto entregado con observaciones menores resueltas rapidamente.",
];

export const generarResenas = (userId, proyectosTerminados = []) => {
  if (!Array.isArray(proyectosTerminados) || proyectosTerminados.length === 0) {
    return [];
  }

  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cantidad = Math.min(proyectosTerminados.length, 3 + (hash % 4));

  const ordenados = [...proyectosTerminados]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((proyecto, indice) => ({
      peso: (hash + indice * 17) % 997,
      proyecto,
      indice,
    }))
    .sort((a, b) => a.peso - b.peso)
    .slice(0, cantidad)
    .map((item) => item.proyecto);

  return ordenados.map((proyecto, indice) => {
    const comentarioBase = COMENTARIOS_RESEÑA[(hash + indice) % COMENTARIOS_RESEÑA.length];
    const calificacion = Number((4 + ((hash + indice * 11) % 11) / 10).toFixed(1));

    return {
      id: `r-${proyecto.id}`,
      empresa: proyecto.cliente || "Cliente",
      calificacion: Math.min(5, Math.max(3.8, calificacion)),
      fecha: proyecto.fechaFinalizacion || new Date().toISOString(),
      comentario: `${comentarioBase} Proyecto entregado: ${proyecto.nombre}.`,
      proyecto: proyecto.nombre || "Proyecto",
    };
  });
};

export const generarProyectosTerminados = (userId) => {
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
