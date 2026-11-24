import logoBookExpress from "../../assets/brand/logo-book-express-negro-recortado.png";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  })[character]);
}

function dateTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("es-PE", {
    timeZone: "America/Lima", dateStyle: "short", timeStyle: "short",
  });
}

/** Imprime una constancia logística. No emite GRE ni registra movimientos. */
export default function printInternalReturn(plan, dispatch) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const confirmed = plan.kind === "received";
  const details = (plan.lines ?? []).map((entry, index) => {
    const product = dispatch.lines?.find((line) => line.id === entry.line_id);
    return `<tr><td class="number">${index + 1}</td>
      <td>${escapeHtml(product?.product ?? "Lote sin identificar")}</td>
      <td class="number">${escapeHtml(product?.receipt_number ?? "—")}</td>
      <td class="number strong">${escapeHtml(entry.quantity)}</td></tr>`;
  }).join("");
  const total = (plan.lines ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const logo = escapeHtml(new URL(logoBookExpress, window.location.href).href);
  const documentNumber = escapeHtml(plan.reference);
  const heading = confirmed
    ? "CONSTANCIA INTERNA DE RECEPCIÓN DE RETORNO"
    : "CONSTANCIA INTERNA DE PREPARACIÓN DE RETORNO";
  const subtitle = confirmed
    ? "Recepción física confirmada · cantidades efectivamente devueltas"
    : "Documento de control por lote · preparación sin movimiento de inventario";
  const status = confirmed
    ? "Recepción física registrada en inventario. Este documento interno no acredita GRE."
    : "Preparación registrada. La salida, el transporte y la recepción aún requieren confirmación física.";
  const content = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${documentNumber} · Book Express</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; background: #f1f2f4; color: #171717; font: 12px/1.5 Arial, sans-serif; }
.toolbar { max-width: 190mm; margin: 0 auto 12px; text-align: right; }
button { padding: 11px 19px; border: 0; border-radius: 8px; background: #b91c1c; color: #fff; font-weight: 700; cursor: pointer; }
.sheet { max-width: 190mm; min-height: 255mm; padding: 12mm; margin: auto; background: #fff; box-shadow: 0 8px 26px #0002; }
.top { display: grid; grid-template-columns: 110px 1fr auto; align-items: center; gap: 14px; padding-bottom: 14px; border-bottom: 3px solid #b91c1c; }
.logo { background: #080b12; border-radius: 6px; padding: 7px; }
.logo img { display: block; width: 100%; max-height: 58px; object-fit: contain; }
.business { text-align: center; font-weight: 800; }
.business small { display: block; color: #555; font-size: 10px; font-weight: 400; }
.identifier { color: #b91c1c; text-align: right; font-size: 15px; font-weight: 800; }
.identifier small { display: block; color: #555; font-size: 9px; }
h1 { margin: 20px 0 2px; font-size: 17px; text-align: center; }
.subtitle { margin: 0 0 18px; text-align: center; font-size: 10px; color: #555; }
.heading { margin: 18px 0 8px; border-left: 4px solid #b91c1c; background: #f1f2f4; padding: 8px 10px; font-weight: 800; font-size: 11px; }
.info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.info div { overflow-wrap: anywhere; }
.info span { display: block; font-size: 10px; color: #666; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; }
th, td { border: 1px solid #cbd0d6; padding: 8px 6px; overflow-wrap: anywhere; }
th { background: #f0f1f3; text-align: center; font-size: 10px; }
.number { text-align: center; }
.strong { font-weight: 800; }
tfoot th { background: #e9ebed; }
.status { margin-top: 16px; padding: 11px; border: 1px solid #d5d5d5; background: #fafafa; font-size: 10px; }
.sign { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin: 64px 0 18px; }
.sign div { border-top: 1px solid #222; padding-top: 8px; font-size: 10px; text-align: center; }
.legal { margin-top: 20px; padding: 10px; border: 1px solid #ddd; font-size: 9px; color: #555; text-align: center; }
@media print { body { padding: 0; background: #fff; } .toolbar { display: none; } .sheet { min-height: 0; padding: 0; box-shadow: none; } }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Imprimir documento</button></div>
<main class="sheet"><header class="top">
<div class="logo"><img src="${logo}" alt="Book Express"></div>
<div class="business">BOOK EXPRESS<small>Distribuidora y Comercializadora Book Express S.A.C.</small><small>RUC 20601658811</small></div>
<div class="identifier"><small>CONTROL INTERNO</small>${documentNumber}</div>
</header>
<h1>${heading}</h1>
<p class="subtitle">${subtitle}</p>
<div class="heading">Datos de la operación</div>
<div class="info">
<div><span>Documento de salida original</span><strong>${escapeHtml(plan.source_document)}</strong></div>
<div><span>${confirmed ? "Fecha de recepción" : "Fecha de preparación"}</span><strong>${escapeHtml(dateTime(plan.created_at))}</strong></div>
<div><span>Origen de retorno</span><strong>${escapeHtml(dispatch.destination)}</strong></div>
<div><span>${confirmed ? "Almacén receptor" : "Destino previsto"}</span><strong>${escapeHtml(dispatch.source)}</strong></div>
<div><span>Colegio asociado</span><strong>${escapeHtml(dispatch.school)}</strong></div>
<div><span>${confirmed ? "Registrado por" : "Preparó en el ERP"}</span><strong>${escapeHtml(plan.created_by)}</strong></div>
</div>
<div class="heading">${confirmed ? "Libros efectivamente recibidos" : "Libros preparados para retorno"}</div>
<table><colgroup><col style="width:7%"><col style="width:55%"><col style="width:25%"><col style="width:13%"></colgroup>
<thead><tr><th>N.º</th><th>Producto</th><th>Lote / guía de origen</th><th>Cantidad</th></tr></thead>
<tbody>${details}</tbody>
<tfoot><tr><th colspan="3">${confirmed ? "TOTAL RECIBIDO" : "TOTAL PREPARADO"}</th><th>${escapeHtml(total)}</th></tr></tfoot>
</table>
<div class="status"><strong>Motivo registrado:</strong> ${escapeHtml(plan.reason)}<br>
<strong>Estado:</strong> ${status}${confirmed ? `<br><strong>Recibió:</strong> ${escapeHtml(plan.received_by)}` : ""}</div>
<div class="sign"><div>Responsable que entrega · nombre, firma y fecha</div><div>Responsable que recibe · nombre, firma y fecha</div></div>
<p class="legal">USO INTERNO BOOK EXPRESS. Esta constancia NO es una Guía de Remisión Electrónica SUNAT,
NO acredita transporte ni recepción, y NO reemplaza la documentación tributaria exigible.</p>
</main></body></html>`;
  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  return true;
}
