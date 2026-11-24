import { useEffect, useState } from "react";
import { FiCheckCircle, FiLock, FiRefreshCw, FiShield } from "react-icons/fi";
import axiosClient from "../../../api/axiosClient";

const URL = "/admin/erp/sunat/gre/conexion/";

export default function ERPSunatPage() {
  const [configuration, setConfiguration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ignore = false;
    axiosClient.get(URL).then(({ data }) => {
      if (!ignore) setConfiguration(data);
    }).catch(() => {
      if (!ignore) setMessage("No se pudo consultar la configuración del servicio.");
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, []);

  async function testConnection() {
    if (!configuration?.configured || !configuration?.connectivity_enabled || checking) return;
    setChecking(true);
    setConnected(false);
    setMessage("");
    try {
      const { data } = await axiosClient.post(URL, {});
      setConnected(data.authenticated === true);
      setMessage(data.authenticated
        ? "Autenticación GRE confirmada. Aún no se emiten documentos."
        : "SUNAT no confirmó la conexión.");
    } catch {
      setMessage("No se validó la conexión. Revisa en el servidor las credenciales y permisos de SUNAT.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">ERP · Integraciones</p>
        <h1 className="mt-1 text-2xl font-black text-gray-950">Documentos electrónicos SUNAT</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Preparación de la integración tributaria de Book Express. Esta etapa permite
          comprobar la conexión GRE de forma segura. Todavía no emite guías, facturas ni boletas.
        </p>
      </header>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
            <FiShield aria-hidden="true" size={21} />
          </span>
          <div>
            <h2 className="text-lg font-black text-gray-950">Conexión GRE</h2>
            <p className="mt-1 text-sm text-gray-600">
              Solo Administración puede realizar esta comprobación. Las credenciales
              se configuran en el servidor; no se escriben ni muestran en esta pantalla.
            </p>
          </div>
        </div>
        {loading ? (
          <p role="status" className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            Consultando configuración…
          </p>
        ) : configuration && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Credenciales", configuration.configured ? "Configuradas" : "Pendientes"],
                ["Prueba de conexión", configuration.connectivity_enabled ? "Habilitada" : "Deshabilitada"],
                ["Emisión de GRE", "No disponible todavía"],
              ].map(([name, value]) => (
                <div key={name} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-bold text-gray-600">{name}</p>
                  <p className="mt-1 text-sm font-black text-gray-950">{value}</p>
                </div>
              ))}
            </div>
            {!configuration.configured && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                Faltan configuraciones privadas: {configuration.missing_fields.join(", ")}.
                No compartas claves SOL, secretos de aplicación ni contraseñas en el chat.
              </p>
            )}
            <button type="button" onClick={testConnection}
              disabled={checking || !configuration.configured || !configuration.connectivity_enabled}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
              <FiRefreshCw aria-hidden="true" />
              {checking ? "Comprobando conexión…" : "Comprobar autenticación GRE"}
            </button>
          </>
        )}
        {message && (
          <p role="status" className={"flex items-start gap-2 rounded-xl p-3 text-sm " +
            (connected ? "border border-green-200 bg-green-50 text-green-900"
              : "border border-gray-200 bg-gray-50 text-gray-800")}>
            {connected ? <FiCheckCircle aria-hidden="true" /> : <FiLock aria-hidden="true" />}
            {message}
          </p>
        )}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-700">
          <strong className="block text-gray-950">Siguientes integraciones</strong>
          XML UBL firmado, envío GRE, seguimiento de ticket y CDR, control de estados,
          facturas y boletas electrónicas, y consulta autorizada de RUC/DNI.
          Ninguna de estas operaciones está habilitada en esta etapa.
        </div>
      </section>
    </main>
  );
}
