import { useEffect, useState } from "react";
import {
  FaPlus,
  FaTasks,
  FaUsers,
} from "react-icons/fa";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";

import { getWorkspaceTaskLists } from "../../../../api/adminApi";

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.results) ? data.results : [];
}

function listNavClass({ isActive }) {
  return isActive
    ? "flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-950 shadow-sm"
    : "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-400 transition hover:bg-white/10 hover:text-white";
}

export default function TodoSidebarLists({
  onNavigate,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [taskLists, setTaskLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadLists() {
      try {
        const data = await getWorkspaceTaskLists({
          is_active: "true",
        });

        if (!ignore) {
          setTaskLists(normalizeList(data));
        }
      } catch (error) {
        if (!ignore) {
          setTaskLists([]);
        }
        console.error(error);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadLists();

    return () => {
      ignore = true;
    };
  }, [location.pathname]);

  function goToListsManager() {
    navigate("/admin/workspace/lists");
    onNavigate?.();
  }

  return (
    <div className="my-2 border-y border-white/10 py-2">
      <div className="flex items-center justify-between gap-2 px-4 py-1.5">
        <span className="text-xs font-black uppercase tracking-wide text-gray-500">
          Listas
        </span>

        <button
          aria-label="Administrar listas"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
          type="button"
          onClick={goToListsManager}
        >
          <FaPlus className="text-xs" />
        </button>
      </div>

      {isLoading ? (
        <p className="px-4 py-2 text-xs font-semibold text-gray-500">
          Cargando listas...
        </p>
      ) : taskLists.length > 0 ? (
        <div className="space-y-1">
          {taskLists.map((taskList) => (
            <NavLink
              key={taskList.id}
              className={listNavClass}
              to={`/admin/workspace/lists/${taskList.id}`}
              onClick={onNavigate}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                style={{
                  backgroundColor: taskList.color || "#dc2626",
                }}
              />
              <span className="min-w-0 flex-1 truncate">
                {taskList.name}
              </span>
              {taskList.is_shared ? (
                <FaUsers
                  aria-label="Lista compartida"
                  className="shrink-0 text-xs text-gray-500"
                />
              ) : (
                <FaTasks
                  aria-label="Lista personal"
                  className="shrink-0 text-xs text-gray-600"
                />
              )}
            </NavLink>
          ))}
        </div>
      ) : (
        <p className="px-4 py-2 text-xs leading-5 text-gray-500">
          Aún no tienes listas creadas.
        </p>
      )}

      <button
        className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-bold text-gray-400 transition hover:bg-white/10 hover:text-white"
        type="button"
        onClick={goToListsManager}
      >
        <FaPlus className="text-xs" />
        <span>Nueva lista</span>
      </button>
    </div>
  );
}
