import logoBookExpress from "../../assets/brand/logo-book-express-negro-recortado.png";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

const modeLabels = {
  fair: "Feria",
  consignment: "Consignación",
  point_of_sale: "Punto de venta",
};

const statusLabels = {
  documented: "Orden interna registrada · salida sin confirmar",
  in_transit: "Salida confirmada · pendiente de recepción",
  received: "Recepción en destino confirmada",
};

function field(label, value) {
  return `<div class="detail"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
}

/**
 * Imprime la constancia interna de una entrega sin registrar movimientos.
 * Este documento NO es una GRE ni acredita validación SUNAT.
 */
export default function printInternalDispatch(data) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const logoUrl = escapeHtml(new URL(logoBookExpress, window.location.href).href);
  const rows = (data.lines ?? []).map((line, index) => `
    <tr>
      <td class="number">${index + 1}</td>
      <td class="product">${escapeHtml(line.product)}</td>
      <td class="guide">${escapeHtml(line.receipt_number)}</td>
      <td class="number strong">${escapeHtml(line.quantity)}</td>
    </tr>`).join("");

  const content = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.document_number)} · Book Express</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html { background: #eff1f4; }
    body { width: min(100%, 210mm); margin: 0 auto; padding: 16px;
      color: #171717; font: 12px/1.45 Arial, Helvetica, sans-serif; }
    .toolbar { display: flex; justify-content: end; margin: 0 auto 12px; max-width: 186mm; }
    .toolbar button { padding: 10px 18px; border: 0; border-radius: 7px;
      background: #bb0000; color: #fff; font-weight: 700; cursor: pointer; }
    .sheet { max-width: 186mm; margin: 0 auto; padding: 12mm;
      min-height: 260mm; background: #fff; box-shadow: 0 10px 32px #00000016; }
    .top { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
      gap: 12px; padding-bottom: 12px; border-bottom: 3px solid #bd0000; }
    .logo { display: inline-flex; align-items: center; justify-content: center;
      width: 115px; min-height: 66px; padding: 6px; background: #070b13; border-radius: 5px; }
    .logo img { display: block; width: 100%; max-height: 56px; object-fit: contain; }
    .center { text-align: center; }
    .center .business { font-size: 13px; font-weight: 800; letter-spacing: 0.04em; }
    .center .tax { margin-top: 4px; color: #535353; font-size: 10px; }
    .doc-id { justify-self: end; text-align: right; }
    .doc-id small { display: block; color: #555; font-size: 10px; font-weight: 700; }
    .doc-id strong { display: block; margin-top: 5px; color: #b60000;
      font-size: 14px; letter-spacing: 0.02em; }
    h1 { margin: 18px 0 2px; text-align: center; font-size: 17px; line-height: 1.3; }
    .subtitle { margin: 0 0 15px; text-align: center; color: #616161; font-size: 10px; }
    .section-title { margin: 14px 0 8px; padding: 7px 10px;
      background: #f1f2f4; color: #252525; border-left: 3px solid #ba0000;
      font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.025em; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 16px; }
    .detail { min-width: 0; }
    dt { color: #5a5a5a; font-size: 10px; font-weight: 700; }
    dd { margin: 2px 0 0; font-size: 11px; font-weight: 700; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td { padding: 8px 7px; border: 1px solid #c8cbd0; vertical-align: middle; }
    th { background: #eceef1; color: #202020; font-size: 10px;
      text-align: center; text-transform: uppercase; }
    td { font-size: 10.5px; overflow-wrap: anywhere; }
    td.product { text-align: left; }
    td.guide, td.number { text-align: center; }
    .strong { font-weight: 800; }
    tfoot th { background: #f2f3f5; }
    .status { display: block; margin-top: 11px; padding: 8px 10px;
      border: 1px solid #d4d4d4; background: #f8f8f8;
      text-align: center; font-size: 10px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px;
      margin: 55px 0 16px; break-inside: avoid; }
    .signature { border-top: 1px solid #444; padding: 6px 5px 0;
      text-align: center; font-size: 10px; }
    .legal { margin: 14px 0 0; padding: 9px; border: 1px solid #d6d6d6;
      color: #555; font-size: 9px; text-align: center; break-inside: avoid; }
    @media print {
      html { background: #fff; }
      body { width: 100%; margin: 0; padding: 0; font-size: 11px; }
      .toolbar { display: none; }
      .sheet { max-width: none; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
      .top, .section-title, th, .status, .legal { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    @media screen and (max-width: 650px) {
      .sheet { padding: 18px; }
      .top { grid-template-columns: 1fr auto; }
      .center { grid-column: 1 / -1; grid-row: 2; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="window.print()">Imprimir documento</button></div>
  <main class="sheet">
    <header class="top">
      <div class="logo"><img src="${logoUrl}" alt="Book Express"></div>
      <div class="center">
        <div class="business">BOOK EXPRESS</div>
        <div class="tax">Distribuidora y Comercializadora Book Express S.A.C.</div>
        <div class="tax">RUC 20601658811</div>
      </div>
      <div class="doc-id"><small>N.º DE CONTROL INTERNO</small>
        <strong>${escapeHtml(data.document_number)}</strong></div>
    </header>
    <h1>ORDEN INTERNA DE SALIDA Y ENTREGA</h1>
    <p class="subtitle">Documento logístico interno · no es comprobante ni guía de remisión SUNAT</p>
    <div class="section-title">Información de la entrega</div>
    <dl class="grid">
      ${field("Colegio", data.school)}
      ${field("Operación", data.operation_name)}
      ${field("Modalidad", modeLabels[data.mode] ?? data.mode)}
      ${field("Responsable previsto", data.responsible_name)}
      ${field("Fecha de registro", data.created_at
        ? new Date(data.created_at).toLocaleDateString("es-PE")
        : "—")}
      ${field("Lugar de salida", data.source)}
      ${field("Lugar de destino", data.destination)}
    </dl>
    <div class="section-title">Detalle de mercadería por guía / lote</div>
    <table>
      <colgroup>
        <col style="width:6%"><col style="width:58%">
        <col style="width:24%"><col style="width:12%">
      </colgroup>
      <thead><tr>
        <th scope="col">N.º</th><th scope="col">Producto</th>
        <th scope="col">Guía de recepción</th><th scope="col">Cant.</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <th colspan="3" scope="row">Total de unidades</th>
        <th>${escapeHtml(data.total)}</th>
      </tr></tfoot>
    </table>
    <div class="status"><strong>Estado:</strong>
      ${escapeHtml(statusLabels[data.status] ?? data.status)}
      ${data.external_guide_reference ? `<br><strong>GRE externa declarada:</strong> ${escapeHtml(data.external_guide_reference)}` : ""}
      ${data.recipient_name ? `<br><strong>Responsable que recibió:</strong> ${escapeHtml(data.recipient_name)}` : ""}
    </div>
    <div class="signatures">
      <div class="signature">Entrega / firma y fecha</div>
      <div class="signature">Recibe / firma y fecha</div>
    </div>
    <p class="legal"><strong>Uso interno:</strong> esta orden no acredita emisión ni aceptación
      de una GRE, no representa una venta y no sustituye los documentos tributarios
      que sean exigibles. El movimiento se registra únicamente al confirmar salida
      y recepción en el ERP.</p>
  </main>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  return true;
}
