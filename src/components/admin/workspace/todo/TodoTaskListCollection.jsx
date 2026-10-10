import {
  FaEdit,
  FaTasks,
  FaUsers,
} from "react-icons/fa";

import { getTaskListScopeLabel } from "./taskListUtils";

export default function TodoTaskListCollection({
  isLoading,
  onEdit,
  onOpen,
  taskLists,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm xl:col-span-7">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">
          Tus espacios
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-950">
          Listas visibles
        </h2>
        <p className="mt-1 text-sm leading-5 text-gray-500">
          Las listas compartidas solo muestran equipos a los que tienes acceso.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from(
            { length: 4 },
            (_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl bg-gray-100"
              />
            ),
          )}
        </div>
      ) : taskLists.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {taskLists.map((taskList) => (
            <article
              key={taskList.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: taskList.color || "#dc2626",
                  }}
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-black text-gray-950">
                      {taskList.name}
                    </h3>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-black text-gray-600">
                      {taskList.is_shared
                        ? "Compartida"
                        : "Personal"}
                    </span>
                    {taskList.is_active === false ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-700">
                        Inactiva
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {getTaskListScopeLabel(taskList)}
                    {taskList.created_by_name
                      ? ` · Creada por ${taskList.created_by_name}`
                      : ""}
                  </p>

                  {taskList.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                      {taskList.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {taskList.can_manage ? (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700"
                    type="button"
                    onClick={() => onEdit(taskList)}
                  >
                    <FaEdit />
                    Editar
                  </button>
                ) : null}

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                  type="button"
                  onClick={() => onOpen(taskList)}
                >
                  {taskList.is_shared ? <FaUsers /> : <FaTasks />}
                  Abrir
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <FaTasks className="mx-auto text-3xl text-gray-300" />
          <p className="mt-3 text-sm font-black text-gray-900">
            Todavía no tienes listas.
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Crea una lista personal o una lista compartida con uno de tus equipos.
          </p>
        </div>
      )}
    </section>
  );
}
