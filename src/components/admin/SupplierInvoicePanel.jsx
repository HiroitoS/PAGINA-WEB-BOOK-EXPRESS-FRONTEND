import { useEffect, useState } from "react";
import { FiEdit2, FiFileText, FiPlus, FiX } from "react-icons/fi";
import {
  corregirFacturaEditorial,
  obtenerFacturasEditoriales,
  obtenerPedidosParaFactura,
  registrarFacturaEditorial,
} from "../../api/purchasingApi";

const fieldClass = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-red-600 focus:outline-none";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50";

function localDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function errorText(error) {
  if (!error?.response) return "No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.";
  if (error.response.status === 403) return "No tienes autorización para consultar o registrar facturas.";
  if (error.response.status >= 500) return "No pudimos completar la operación. Inténtalo nuevamente.";
  const data = error.response.data;
  for (const field of ["document_number", "items", "provider_id", "change_reason", "total_document", "detail"]) {
    const value = data?.[field];
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string" && message.length < 220) return message;
  }
  return "Revisa los datos del documento e inténtalo nuevamente.";
}

function toLine(item, orderId) {
  return {
    order_item_id: item.id,
    order_id: orderId,
    product_name: item.product_name,
    quantity_ordered: item.quantity_ordered,
    quantity_billed: String(item.quantity_ordered),
    expected_unit_cost: String(item.expected_unit_cost),
    unit_cost_billed: String(item.expected_unit_cost),
  };
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(number)
    : "Por revisar";
}

export default function SupplierInvoicePanel({ pedido, puedeAdministrar }) {
  const [facturas, setFacturas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    document_number: "", issued_on: localDate(), total_document: "",
    notes: "", change_reason: "",
  });
  const [lines, setLines] = useState([]);
  const [otherOrder, setOtherOrder] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      obtenerFacturasEditoriales(pedido.provider),
      obtenerPedidosParaFactura(pedido.provider),
    ]).then(([records, orders]) => {
      if (ignore) return;
      setFacturas(Array.isArray(records) ? records : []);
      setPedidos(Array.isArray(orders) ? orders : []);
      setError("");
    }).catch((err) => {
      if (!ignore) setError(errorText(err));
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [pedido.provider, reload]);

  function openNew() {
    setEditing(null);
    setOpen(true);
    setMessage("");
    setError("");
    setForm({
      document_number: "", issued_on: localDate(), total_document: "",
      notes: "", change_reason: "",
    });
    setLines((pedido.items || []).map((item) => ({
      order_item_id: item.id,
      order_id: pedido.id,
      product_name: item.product_name_snapshot,
      quantity_ordered: item.quantity_ordered,
      quantity_billed: String(item.quantity_ordered),
      expected_unit_cost: String(item.unit_supplier_cost),
      unit_cost_billed: String(item.unit_supplier_cost),
    })));
  }

  function editRecord(record) {
    setEditing(record.id);
    setOpen(true);
    setMessage("");
    setError("");
    setForm({
      document_number: record.document_number,
      issued_on: record.issued_on,
      total_document: record.total_document,
      notes: record.notes ?? "",
      change_reason: "",
    });
    setLines(record.items.map((item) => ({
      order_item_id: item.order_item_id,
      order_id: item.order_id,
      product_name: item.product_name,
      quantity_ordered: item.quantity_ordered,
      quantity_billed: String(item.quantity_billed),
      expected_unit_cost: String(item.expected_unit_cost),
      unit_cost_billed: String(item.unit_cost_billed),
    })));
  }

  function addOtherOrder() {
    const selected = pedidos.find((order) => String(order.id) === otherOrder);
    if (!selected) return;
    setLines((current) => {
      const ids = new Set(current.map((item) => item.order_item_id));
      return [...current, ...selected.items.filter((item) => !ids.has(item.id))
        .map((item) => toLine(item, selected.id))];
    });
    setOtherOrder("");
  }

  function changeForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeLine(id, key, value) {
    setLines((current) => current.map((item) => item.order_item_id === id
      ? { ...item, [key]: value } : item));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    if (!lines.length) {
      setError("Selecciona al menos un libro del pedido.");
      return;
    }
    if (lines.some((item) =>
      !Number.isInteger(Number(item.quantity_billed))
      || Number(item.quantity_billed) < 1
      || item.unit_cost_billed === ""
      || Number(item.unit_cost_billed) < 0
    )) {
      setError("Revisa las cantidades y los costos de cada libro.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const data = {
      provider_id: pedido.provider,
      document_number: form.document_number.trim(),
      issued_on: form.issued_on,
      total_document: form.total_document,
      notes: form.notes.trim(),
      items: lines.map((line) => ({
        order_item_id: line.order_item_id,
        quantity_billed: Number(line.quantity_billed),
        unit_cost_billed: line.unit_cost_billed,
      })),
      ...(editing ? { change_reason: form.change_reason.trim() } : {}),
    };
    try {
      if (editing) {
        await corregirFacturaEditorial(editing, data);
      } else {
        await registrarFacturaEditorial(data);
      }
      setMessage(editing
        ? "La corrección quedó registrada con su motivo e historial. No se modificó inventario."
        : "Factura registrada para revisión. Todavía no se contabilizó como pago o ingreso de libros.");
      setOpen(false);
      setEditing(null);
      setLoading(true);
      setReload((current) => current + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const related = facturas.filter((record) =>
    record.items?.some((line) => line.order_id === pedido.id),
  );
  const otherOptions = pedidos.filter((order) =>
    order.id !== pedido.id
    && order.items?.some((item) => !lines.some((line) => line.order_item_id === item.id)),
  );

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black text-gray-950">
            <FiFileText aria-hidden="true" /> Facturas y conciliación
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Administración registra el documento sobre los mismos libros del pedido.
            No crea otra entrada al inventario ni genera pagos.
          </p>
        </div>
        {puedeAdministrar && (
          <button type="button" onClick={openNew} className={buttonClass}>
            <FiPlus aria-hidden="true" /> Registrar factura
          </button>
        )}
      </div>

      {message && <p role="status" className="rounded-lg bg-white p-3 text-sm font-semibold text-gray-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p role="status" className="text-sm text-gray-600">Consultando documentos…</p>
      ) : related.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-600">
          Todavía no se han registrado facturas vinculadas a este pedido.
        </p>
      ) : (
        <div className="space-y-2">
          {related.map((record) => (
            <article key={record.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-gray-950">
                    Factura {record.document_number}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {record.issued_on} · {money(record.total_document)}
                  </p>
                  <span className="mt-1 inline-block text-xs font-semibold text-gray-700">
                    Pendiente de conciliación
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={buttonClass}
                    onClick={() => setExpanded((current) => current === record.id ? null : record.id)}>
                    {expanded === record.id ? "Ocultar detalle" : "Ver diferencias"}
                  </button>
                  {puedeAdministrar && (
                    <button type="button" className={buttonClass} onClick={() => editRecord(record)}>
                      <FiEdit2 aria-hidden="true" /> Corregir
                    </button>
                  )}
                </div>
              </div>
              {expanded === record.id && (
                <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                  {record.items.map((line) => (
                    <div key={line.id} className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                      <p className="break-words font-bold text-gray-900">{line.product_name}</p>
                      <p className="mt-1">Pedido: {line.quantity_ordered} · Recibido: {line.quantity_received} · Facturado: {line.quantity_billed}</p>
                      <p className="mt-1">Costo esperado: {money(line.expected_unit_cost)} · Facturado: {money(line.unit_cost_billed)}</p>
                      {line.quantity_other_invoices > 0 && (
                        <p className="mt-1">En otras facturas: {line.quantity_other_invoices} unidades</p>
                      )}
                      {line.review_required && (
                        <p className="mt-2 font-bold text-amber-900">
                          Revisar diferencia de cantidades o costo antes de conciliar.
                        </p>
                      )}
                    </div>
                  ))}
                  <h4 className="text-xs font-black text-gray-900">Historial de cambios</h4>
                  {record.events.map((event, index) => (
                    <p key={index} className="text-xs text-gray-700">
                      {event.actor} · {event.action === "corrected" ? "Corrección" : "Registro"}
                      {event.detail?.reason && <> · {event.detail.reason}</>}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {open && puedeAdministrar && (
        <form onSubmit={save} className="space-y-4 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-black text-gray-950">
              {editing ? "Corregir documento registrado" : "Registrar factura de editorial"}
            </h4>
            <button type="button" className={buttonClass} disabled={saving}
              onClick={() => { setOpen(false); setEditing(null); setError(""); }}>
              <FiX aria-hidden="true" /> Cerrar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold text-gray-800">
              Serie y número
              <input required maxLength={80} className={fieldClass} value={form.document_number}
                onChange={(event) => changeForm("document_number", event.target.value)}
                placeholder="F001-00001234" />
            </label>
            <label className="text-xs font-bold text-gray-800">
              Fecha de emisión
              <input type="date" required className={fieldClass} value={form.issued_on}
                onChange={(event) => changeForm("issued_on", event.target.value)} />
            </label>
            <label className="text-xs font-bold text-gray-800">
              Total de la factura (S/)
              <input type="number" min="0" step="0.01" required inputMode="decimal"
                className={fieldClass} value={form.total_document}
                onChange={(event) => changeForm("total_document", event.target.value)}
                placeholder="Importe total del comprobante" />
            </label>
          </div>
          <p className="text-xs leading-5 text-gray-600">
            Copia el importe total tal como aparece en la factura. Los impuestos o descuentos
            generales aún no se calculan automáticamente; las diferencias quedan para revisión.
          </p>

          {otherOptions.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-xs font-bold text-gray-800">
                ¿La factura comprende otro pedido de esta editorial?
                <select value={otherOrder} className={fieldClass}
                  onChange={(event) => setOtherOrder(event.target.value)}>
                  <option value="">Seleccionar otro pedido</option>
                  {otherOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      Pedido {item.id} · {item.school || "Sin colegio"}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={!otherOrder} onClick={addOtherOrder}
                className={buttonClass}>Agregar pedido</button>
            </div>
          )}

          <div className="space-y-2">
            <h5 className="text-sm font-black text-gray-950">Libros facturados</h5>
            {lines.length === 0 && <p className="text-sm text-gray-600">Selecciona libros del pedido.</p>}
            {lines.map((line) => (
              <div key={line.order_item_id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-bold text-gray-950">
                    {line.product_name} <span className="text-xs font-normal text-gray-600">· Pedido {line.order_id}</span>
                  </p>
                  <button type="button" onClick={() => setLines((previous) =>
                    previous.filter((item) => item.order_item_id !== line.order_item_id))}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-700">
                    <FiX aria-hidden="true" /> Quitar
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  Cantidad solicitada: {line.quantity_ordered} · Costo acordado: {money(line.expected_unit_cost)}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-gray-800">
                    Cantidad facturada
                    <input type="number" min="1" max="1000000" step="1" required
                      value={line.quantity_billed} className={fieldClass}
                      onChange={(event) => changeLine(line.order_item_id, "quantity_billed", event.target.value)} />
                  </label>
                  <label className="text-xs font-bold text-gray-800">
                    Costo facturado por unidad (S/)
                    <input type="number" min="0" step="0.01" required inputMode="decimal"
                      value={line.unit_cost_billed} className={fieldClass}
                      onChange={(event) => changeLine(line.order_item_id, "unit_cost_billed", event.target.value)} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <label className="block text-xs font-bold text-gray-800">
            Observaciones (opcional)
            <textarea value={form.notes} maxLength={1000} rows={2}
              onChange={(event) => changeForm("notes", event.target.value)}
              className={fieldClass} placeholder="Datos por confirmar con la editorial" />
          </label>
          {editing && (
            <label className="block text-xs font-bold text-gray-800">
              Motivo de la corrección
              <textarea required minLength={8} maxLength={500} rows={2}
                value={form.change_reason}
                onChange={(event) => changeForm("change_reason", event.target.value)}
                className={fieldClass} placeholder="Explica qué se corrigió y por qué" />
            </label>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={buttonClass} disabled={saving}
              onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" disabled={saving || !lines.length}
              className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">
              {saving ? "Guardando…" : editing ? "Guardar corrección" : "Guardar factura para revisión"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
