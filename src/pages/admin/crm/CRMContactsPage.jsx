import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaEnvelope,
  FaExclamationTriangle,
  FaPhoneAlt,
  FaSearch,
  FaSchool,
  FaUserTie,
} from "react-icons/fa";

import { getCRMContacts } from "../../../api/crmApi";
import CRMContactCreatePanel from "../../../components/admin/crm/CRMContactCreatePanel";

const PAGE_SIZE = 25;

const INITIAL_FILTERS = {
  search: "",
  decision_role: "",
  is_active: "true",
};

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.join(" ");
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallback;
}

function buildParams(filters, page) {
  const params = {
    page,
    page_size: PAGE_SIZE,
  };

  Object.entries(filters).forEach(([key, value]) => {
    const normalizedValue = String(value ?? "").trim();

    if (normalizedValue) {
      params[key] = normalizedValue;
    }
  });

  return params;
}

function ContactStatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      }`}
    >
      {active ? "Vigente" : "Inactivo"}
    </span>
  );
}

function RelationshipBadge({ value }) {
  const level = Number(value);

  if (!Number.isInteger(level) || level < 1) {
    return (
      <span className="text-sm font-semibold text-gray-400">
        Sin evaluar
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-gray-950 px-2.5 py-1 text-xs font-black text-white">
      Relación {level}/5
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-2xl bg-gray-100"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-700 ring-1 ring-gray-200">
        <FaUserTie />
      </div>

      <p className="mt-4 text-base font-black text-gray-950">
        No encontramos contactos.
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
        Ajusta los filtros o registra contactos desde la ficha del colegio.
      </p>
    </div>
  );
}

function ContactChannel({ contact }) {
  const phone = contact.whatsapp || contact.phone;

  if (phone) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <FaPhoneAlt className="text-xs text-gray-400" />
        <span>{phone}</span>
      </div>
    );
  }

  if (contact.email) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <FaEnvelope className="text-xs text-gray-400" />
        <span className="break-all">{contact.email}</span>
      </div>
    );
  }

  return <span className="text-sm text-gray-400">Sin contacto registrado</span>;
}

export default function CRMContactsPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.count || 0) / PAGE_SIZE)),
    [pagination.count],
  );

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getCRMContacts(buildParams(filters, page));

        if (!ignore) {
          setContacts(Array.isArray(data?.results) ? data.results : []);
          setPagination({
            count: Number(data?.count || 0),
            next: data?.next || null,
            previous: data?.previous || null,
          });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la lista de contactos.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [filters, page, refreshKey]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(INITIAL_FILTERS);
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-300">
              CRM Comercial
            </p>

            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              Contactos
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Centraliza a directores, coordinadores y personas clave vinculadas
              a los colegios de la cartera comercial.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Total visible
            </p>
            <p className="mt-1 text-2xl font-black">{pagination.count}</p>
          </div>
        </div>
      </motion.section>

      <section className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Gestión de contactos
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Registra una persona y vincúlala desde el inicio con el colegio al
              que pertenece.
            </p>
          </div>

          <CRMContactCreatePanel
            onCreated={() =>
              setRefreshKey((currentKey) => currentKey + 1)
            }
          />
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Filtros
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-950">
              Buscar contactos
            </h2>
          </div>

          <button
            className="w-fit rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            type="button"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <label className="relative lg:col-span-2">
            <span className="sr-only">Buscar</span>
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              name="search"
              placeholder="Nombre, cargo, colegio, correo o celular..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </label>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            name="decision_role"
            value={filters.decision_role}
            onChange={handleFilterChange}
          >
            <option value="">Todos los roles</option>
            <option value="decision_maker">Decisor</option>
            <option value="influencer">Influenciador</option>
            <option value="other">Otro</option>
          </select>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            name="is_active"
            value={filters.is_active}
            onChange={handleFilterChange}
          >
            <option value="">Todos los estados</option>
            <option value="true">Vigentes</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
            <p className="text-sm leading-6 text-red-800">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      <section className="mt-4 rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-black text-gray-950">
            Personas vinculadas a colegios
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Cada contacto mantiene su relación con el colegio y su historial comercial.
          </p>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <LoadingRows />
          ) : contacts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3">Contacto</th>
                      <th className="px-3 py-3">Colegio</th>
                      <th className="px-3 py-3">Rol</th>
                      <th className="px-3 py-3">Relación</th>
                      <th className="px-3 py-3">Contacto</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3 text-right">Acción</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="align-middle transition hover:bg-gray-50"
                      >
                        <td className="px-3 py-4">
                          <p className="font-black text-gray-950">
                            {contact.full_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {contact.position || "Cargo no registrado"}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex items-start gap-2">
                            <FaSchool className="mt-0.5 shrink-0 text-gray-400" />
                            <span className="text-sm font-bold text-gray-800">
                              {contact.school?.name || "Sin colegio"}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-4 text-sm font-semibold text-gray-700">
                          {contact.decision_role_display || "Sin clasificar"}
                        </td>

                        <td className="px-3 py-4">
                          <RelationshipBadge value={contact.relationship_level} />
                        </td>

                        <td className="px-3 py-4">
                          <ContactChannel contact={contact} />
                        </td>

                        <td className="px-3 py-4">
                          <ContactStatusBadge active={contact.is_active} />
                        </td>

                        <td className="px-3 py-4 text-right">
                          <Link
                            className="inline-flex rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                            to={`/admin/crm/contactos/${contact.id}`}
                          >
                            Ver ficha
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {contacts.map((contact) => (
                  <article
                    key={contact.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-black text-gray-950">
                          {contact.full_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {contact.position || "Cargo no registrado"}
                        </p>
                      </div>

                      <ContactStatusBadge active={contact.is_active} />
                    </div>

                    <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                        Colegio
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {contact.school?.name || "Sin colegio"}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
                        {contact.decision_role_display || "Sin clasificar"}
                      </span>
                      <RelationshipBadge value={contact.relationship_level} />
                      {contact.is_primary ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
                          Principal
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3">
                      <ContactChannel contact={contact} />
                    </div>

                    <Link
                      className="mt-4 flex w-full items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                      to={`/admin/crm/contactos/${contact.id}`}
                    >
                      Ver ficha
                    </Link>
                  </article>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Página {page} de {totalPages} · {pagination.count} contacto(s)
                </p>

                <div className="flex gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    disabled={!pagination.previous || loading}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  >
                    <FaChevronLeft />
                    Anterior
                  </button>

                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    disabled={!pagination.next || loading}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    Siguiente
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
