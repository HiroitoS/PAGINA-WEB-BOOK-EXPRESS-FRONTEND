import { FaCheckCircle } from "react-icons/fa";

import TodoTaskRow from "./TodoTaskRow";

export default function TodoTaskSections({
  activeTasks,
  completedTasks,
  isLoading,
  onOpenTask,
  title,
}) {
  return (
    <>
      <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Trabajo por hacer
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-950">
              {title}
            </h2>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
            {activeTasks.length}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-1 p-4 sm:p-5">
            {Array.from(
              { length: 5 },
              (_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-gray-100"
                />
              ),
            )}
          </div>
        ) : activeTasks.length > 0 ? (
          <div>
            {activeTasks.map((task) => (
              <TodoTaskRow
                key={task.id}
                task={task}
                onOpen={onOpenTask}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <FaCheckCircle className="mx-auto text-3xl text-green-500" />
            <p className="mt-3 text-sm font-black text-gray-900">
              No hay tareas pendientes en esta vista.
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Puedes crear una nueva tarea desde la barra superior.
            </p>
          </div>
        )}
      </section>

      {completedTasks.length > 0 ? (
        <details className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-4 text-sm font-black text-gray-700 sm:px-5">
            Completadas ({completedTasks.length})
          </summary>

          <div className="border-t border-gray-100">
            {completedTasks.map((task) => (
              <TodoTaskRow
                key={task.id}
                task={task}
                onOpen={onOpenTask}
                completed
              />
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
