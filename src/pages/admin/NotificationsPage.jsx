import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSyncAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router";

import {
  getAdminNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notificationsApi";
import { getNotificationDestination } from "../../utils/notificationNavigation";

function getResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

function getSeverityIcon(severity) {
  if (severity === "warning" || severity === "error") {
    return FaExclamationTriangle;
  }

  if (severity === "success") {
    return FaCheck;
  }

  return FaInfoCircle;
}

function getSeverityClass(severity) {
  if (severity === "warning") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (severity === "error") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (severity === "success") {
    return "bg-green-50 text-green-700 ring-green-100";
  }

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.is_read
      ).length,
    [notifications]
  );

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const params =
        filter === "unread"
          ? { is_read: "false" }
          : filter === "pending"
            ? { is_resolved: "false" }
            : filter === "resolved"
              ? { is_resolved: "true" }
              : {};

      const data = await getAdminNotifications(params);
      setNotifications(getResults(data));
    } catch {
      setError(
        "No se pudieron cargar las notificaciones. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(notification) {
    if (notification.is_read) return;

    try {
      const updated = await markNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? updated : item
        )
      );
    } catch {
      setError(
        "No se pudo marcar la notificación como leída. Intenta nuevamente."
      );
    }
  }

  async function handleOpenNotification(notification) {
    if (!notification.is_read) {
      try {
        const updated = await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? updated : item
          )
        );
      } catch {
        // La navegación al detalle no debe bloquearse por este cambio visual.
      }
    }

    navigate(getNotificationDestination(notification));
  }

  async function handleMarkAllRead() {
    if (updating) return;

    setUpdating(true);

    try {
      await markAllNotificationsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } finally {
      setUpdating(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchNotifications() {
      setLoading(true);
      setError("");

      try {
        const params =
          filter === "unread"
            ? { is_read: "false" }
            : filter === "pending"
              ? { is_resolved: "false" }
              : filter === "resolved"
                ? { is_resolved: "true" }
                : {};

        const data = await getAdminNotifications(params);

        if (!ignore) {
          setNotifications(getResults(data));
        }
      } catch {
        if (!ignore) {
          setError(
            "No se pudieron cargar las notificaciones. Intenta nuevamente."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchNotifications();

    return () => {
      ignore = true;
    };
  }, [filter]);

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-gray-950 p-5 text-white shadow-xl shadow-gray-950/10 sm:p-6"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Centro de notificaciones
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Tus notificaciones
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Revisa asignaciones, seguimientos y avisos importantes de tu trabajo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={updating || notifications.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-50"
            >
              <FaCheckDouble />
              Marcar todas como leídas
            </button>
          </div>
        </div>
      </motion.section>

      <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-black text-gray-950">
              Historial
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {unreadCount} notificación(es) sin leer en esta vista.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Todas"],
              ["unread", "Sin leer"],
              ["pending", "Pendientes"],
              ["resolved", "Resueltas"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  filter === value
                    ? "bg-red-700 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-6">
        {loading && (
          <div className="p-10 text-center text-gray-600">
            Cargando notificaciones...
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
              <FaBell />
            </div>

            <p className="mt-4 font-black text-gray-950">
              No hay notificaciones en esta vista.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Los nuevos avisos aparecerán aquí automáticamente.
            </p>
          </div>
        )}

        {!loading &&
          notifications.map((notification) => {
            const SeverityIcon = getSeverityIcon(notification.severity);

            return (
              <div
                key={notification.id}
                className={`border-b border-gray-100 p-4 last:border-b-0 sm:p-5 ${
                  notification.is_read ? "bg-white" : "bg-red-50/30"
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${getSeverityClass(
                      notification.severity
                    )}`}
                  >
                    <SeverityIcon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 items-start gap-2">
                        <h3 className="font-black text-gray-950">
                          {notification.title}
                        </h3>

                        {!notification.is_read && (
                          <FaCircle className="mt-1.5 shrink-0 text-[7px] text-red-700" />
                        )}
                      </div>

                      <span className="shrink-0 text-xs font-semibold text-gray-400">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    {notification.message && (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {notification.message}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                        {notification.module}
                      </span>

                      {!notification.is_read && (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100">
                          Sin leer
                        </span>
                      )}

                      {notification.is_resolved && (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100">
                          Resuelta
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notification)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-100"
                        >
                          <FaCheck />
                          Marcar como leída
                        </button>
                      )}

                      {notification.link && (
                        <button
                          type="button"
                          onClick={() => handleOpenNotification(notification)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-gray-800"
                        >
                          Ver detalle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}
