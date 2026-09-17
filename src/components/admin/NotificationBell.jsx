import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaChevronRight,
  FaCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router";

import {
  getAdminNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notificationsApi";
import { getNotificationDestination } from "../../utils/notificationNavigation";

const POLLING_INTERVAL_MS = 60_000;
const DROPDOWN_LIMIT = 6;

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

function formatRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000),
  );

  if (seconds < 60) return "Ahora";
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 172800) return "Ayer";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

async function fetchUnreadCount() {
  const data = await getUnreadNotificationCount();
  return Number(data?.count || 0);
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  const knownNotificationIdsRef = useRef(new Set());
  const pollingReadyRef = useRef(false);

  const badgeText = useMemo(() => {
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  }, [unreadCount]);

  async function loadRecentNotifications() {
    setLoadingList(true);

    try {
      const data = await getAdminNotifications();
      setNotifications(getResults(data).slice(0, DROPDOWN_LIMIT));
    } catch {
      setNotifications([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function openBell() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!nextOpen) return;

    try {
      const [count] = await Promise.all([
        fetchUnreadCount(),
        loadRecentNotifications(),
      ]);

      setUnreadCount(count);
    } catch {
      // La campana no debe bloquear el panel si el contador falla.
    }
  }

  async function handleMarkRead(notification) {
    if (notification.is_read || updating) return;

    setUpdating(true);

    try {
      const updated = await markNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? updated : item
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } finally {
      setUpdating(false);
    }
  }

  async function handleOpenNotification(notification) {
    setIsOpen(false);

    if (!notification.is_read) {
      try {
        const updated = await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? updated : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Abrir el destino es más importante que bloquear por el marcado de lectura.
      }
    }

    navigate(getNotificationDestination(notification));
  }

  async function handleMarkAllRead() {
    if (updating || unreadCount === 0) return;

    setUpdating(true);

    try {
      await markAllNotificationsRead();

      setUnreadCount(0);
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );
    } finally {
      setUpdating(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function syncNotifications({ allowToast }) {
      try {
        const [countData, listData] = await Promise.all([
          getUnreadNotificationCount(),
          getAdminNotifications(),
        ]);

        if (ignore) return;

        const recent = getResults(listData).slice(0, DROPDOWN_LIMIT);
        const unreadPending = recent.filter(
          (notification) => !notification.is_read
        );

        setUnreadCount(Number(countData?.count || 0));

        if (isOpen) {
          setNotifications(recent);
        }

        if (allowToast && pollingReadyRef.current) {
          const newNotification = unreadPending.find(
            (notification) =>
              !knownNotificationIdsRef.current.has(notification.id)
          );

          if (newNotification) {
            setToastNotification(newNotification);
          }
        }

        recent.forEach((notification) => {
          knownNotificationIdsRef.current.add(notification.id);
        });
        pollingReadyRef.current = true;
      } catch {
        // Notifications nunca debe bloquear la operación del panel.
      }
    }

    syncNotifications({ allowToast: false });

    const intervalId = window.setInterval(() => {
      syncNotifications({ allowToast: true });
    }, POLLING_INTERVAL_MS);

    function handleFocus() {
      syncNotifications({ allowToast: true });
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!toastNotification) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToastNotification(null);
    }, 7000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastNotification]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {toastNotification && (
        <div className="fixed inset-x-3 top-20 z-[70] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:left-auto sm:right-5 sm:w-96">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FaBell />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Nuevo aviso
              </p>
              <p className="mt-1 text-sm font-black text-gray-950">
                {toastNotification.title}
              </p>
              {toastNotification.message && (
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  {toastNotification.message}
                </p>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setToastNotification(null);
                    handleOpenNotification(toastNotification);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                >
                  Ver detalle
                  <FaChevronRight className="text-[10px]" />
                </button>

                <button
                  type="button"
                  onClick={() => setToastNotification(null)}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label="Abrir notificaciones"
        aria-expanded={isOpen}
        onClick={openBell}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
      >
        <FaBell />

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-black text-gray-950">
                Notificaciones
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {unreadCount === 0
                  ? "Todo al día"
                  : `${unreadCount} sin leer`}
              </p>
            </div>

            <button
              type="button"
              aria-label="Cerrar notificaciones"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 sm:hidden"
            >
              <FaTimes />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto sm:max-h-96">
            {loadingList && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Cargando notificaciones...
              </div>
            )}

            {!loadingList && notifications.length === 0 && (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                  <FaBell />
                </div>
                <p className="mt-3 text-sm font-black text-gray-950">
                  Sin notificaciones
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Los avisos importantes aparecerán aquí.
                </p>
              </div>
            )}

            {!loadingList &&
              notifications.map((notification) => {
                const SeverityIcon = getSeverityIcon(
                  notification.severity,
                );

                return (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-100 px-4 py-3 ${
                      notification.is_read ? "bg-white" : "bg-red-50/40"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${getSeverityClass(
                          notification.severity,
                        )}`}
                      >
                        <SeverityIcon className="text-xs" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 text-sm font-black text-gray-950">
                            {notification.title}
                          </p>

                          {!notification.is_read && (
                            <FaCircle className="mt-1 shrink-0 text-[7px] text-red-700" />
                          )}
                        </div>

                        {notification.message && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                            {notification.message}
                          </p>
                        )}

                        <p className="mt-1 text-[11px] font-semibold text-gray-400">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {!notification.is_read ? (
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => handleMarkRead(notification)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FaCheck />
                          Marcar como leída
                        </button>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-black text-green-700 ring-1 ring-green-100">
                          <FaCheck />
                          Leída
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                      >
                        Ver detalle
                        <FaChevronRight className="text-[10px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="grid gap-2 border-t border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={updating || unreadCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaCheckDouble />
              Marcar todas
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/admin/notificaciones");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2.5 text-xs font-black text-white transition hover:bg-gray-800"
            >
              Ver todas
              <FaChevronRight className="text-[10px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
