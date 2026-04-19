import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const formatoFechaHora = (valor = new Date()) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatoFechaCorta = (valor) => {
  if (!valor) return "No definida";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "No definida";
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const aplicarMembretePdf = (doc, { titulo, subtitulo = "", area = "Operacion" }) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(16, 44, 82);
  doc.rect(0, 0, pageWidth, 102, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(38, 22, 44, 44, 8, 8, "F");

  doc.setTextColor(16, 44, 82);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("CC", 49, 50);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Constructora CRM", 94, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("NIT 900.123.456-7", 94, 58);
  doc.text(`Area: ${area}`, pageWidth - 140, 36);
  doc.text(`Emitido: ${formatoFechaHora()}`, pageWidth - 220, 58);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(titulo || "Reporte", 40, 128);

  if (subtitulo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitulo, 40, 146);
  }

  return 162;
};

export const aplicarPiePaginasPdf = (doc) => {
  const totalPaginas = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPaginas; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, pageHeight - 34, pageWidth - 40, pageHeight - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Constructora CRM - Reporte interno", 40, pageHeight - 20);
    doc.text(`Pagina ${i} de ${totalPaginas}`, pageWidth - 96, pageHeight - 20);
  }
};

export const generarResumenProyectoPdf = ({
  nombreArchivo,
  tituloReporte,
  subtitulo,
  area,
  proyecto,
  tareasCompletadas = [],
  tareasPendientes = [],
  bitacoras = [],
}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  aplicarMembretePdf(doc, {
    titulo: tituloReporte,
    subtitulo,
    area,
  });

  const resumenRows = [
    ["Proyecto", proyecto?.nombre || "Proyecto sin nombre"],
    ["Estado", proyecto?.estado || "Sin estado"],
    ["Ubicacion", proyecto?.ubicacion || "No definida"],
    ["Proveedor", proyecto?.proveedorNombre || proyecto?.proveedorCorreo || "Sin proveedor"],
    ["Gerente", proyecto?.gerenteNombre || proyecto?.gerenteCorreo || "Sin gerente"],
    ["Fecha inicio", formatoFechaCorta(proyecto?.fechaInicio)],
    ["Fecha estimada", formatoFechaCorta(proyecto?.fechaEstimada)],
    ["Avance", `${Number(proyecto?.progreso) || 0}%`],
  ];

  autoTable(doc, {
    startY: 172,
    margin: { left: 40, right: 40 },
    head: [["Campo", "Valor"]],
    body: resumenRows,
    styles: { fontSize: 10, cellPadding: 7 },
    headStyles: { fillColor: [30, 64, 175] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Resumen de tareas", 40, doc.lastAutoTable.finalY + 24);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 32,
    margin: { left: 40, right: 40 },
    head: [["Estado", "Cantidad"]],
    body: [
      ["Completadas", tareasCompletadas.length],
      ["Pendientes", tareasPendientes.length],
      ["Total", tareasCompletadas.length + tareasPendientes.length],
    ],
    styles: { fontSize: 10, cellPadding: 7 },
    headStyles: { fillColor: [15, 118, 110] },
  });

  const detalleTareas = [
    ...tareasPendientes.map((tarea) => ["Pendiente", tarea.titulo || "Tarea", tarea.departamento || "Sin departamento"]),
    ...tareasCompletadas.map((tarea) => ["Completada", tarea.titulo || "Tarea", tarea.departamento || "Sin departamento"]),
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Detalle de tareas", 40, doc.lastAutoTable.finalY + 24);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 32,
    margin: { left: 40, right: 40 },
    head: [["Estado", "Tarea", "Departamento"]],
    body: detalleTareas.length ? detalleTareas : [["-", "Sin tareas", "-"]],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Bitacoras", 40, doc.lastAutoTable.finalY + 24);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 32,
    margin: { left: 40, right: 40 },
    head: [["Fecha", "Titulo", "Desarrollo"]],
    body: bitacoras.length
      ? bitacoras.slice(0, 20).map((bitacora) => [
          formatoFechaCorta(bitacora.fechaPublicacion),
          bitacora.titulo || "Bitacora",
          bitacora.desarrollo || "Sin detalle",
        ])
      : [["-", "Sin bitacoras", "-"]],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [71, 85, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  aplicarPiePaginasPdf(doc);
  doc.save(nombreArchivo || `resumen-proyecto-${new Date().toISOString().slice(0, 10)}.pdf`);
};
