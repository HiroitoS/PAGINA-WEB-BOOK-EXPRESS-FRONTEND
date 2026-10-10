import { useId, useState } from "react";
import { FaCheckCircle, FaChevronRight } from "react-icons/fa";

import TodoTaskRow from "./TodoTaskRow";

function TaskStatusGroup({
  completed = false,
  emphasis = false,
  label,
  onOpenTask,
  showWhenEmpty = false,
  tasks,
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  if (!tasks.length && !showWhenEmpty) {
    return null;
  }

  return (
    <section className="min-w-0">
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50 sm:px-5"
        type="button"
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <FaChevronRight
            aria-hidden="true"
            className={
              "shrink-0 text-xs text-gray-500 transition-transform "
              + (expanded ? "rotate-90" : "")
            }
          />
          <span
            className={
              "truncate text-sm font-black "
              + (emphasis ? "text-red-700" : "text-gray-800")
            }
          >
            {label}
          </span>
        </span>

        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600">
          {tasks.length}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-gray-100" id={contentId}>
          {tasks.length ? (
            tasks.map((task) => (
              <TodoTaskRow
                key={task.id}
                task={task}
                onOpen={onOpenTask}
                completed={completed}
              />
            ))
          ) : (
            <div className="px-5 py-9 text-center">
              <FaCheckCircle className="mx-auto text-2xl text-gray-400" />
              <p className="mt-3 text-sm font-bold text-gray-700">
                No hay tareas en esta vista.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default function TodoTaskSections({
  groups,
  isLoading,
  onOpenTask,
  title,
}) {
  const {
    overdueTasks,
    activeTasks,
    waitingTasks,
    completedTasks,
    cancelledTasks,
  } = groups;

  const openCount = (
    overdueTasks.length + activeTasks.length + waitingTasks.length
  );
  const hasTasks = (
    openCount + completedTasks.length + cancelledTasks.length
  ) > 0;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Organización de tareas
          </p>
          <h2 className="mt-1 text-lg font-black text-gray-950">
            {title}
          </h2>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
          {openCount} por atender
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-1 p-4 sm:p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          <TaskStatusGroup
            emphasis
            label="Vencidas"
            tasks={overdueTasks}
            onOpenTask={onOpenTask}
          />
          <TaskStatusGroup
            label="Activas"
            tasks={activeTasks}
            onOpenTask={onOpenTask}
            showWhenEmpty={!hasTasks}
          />
          <TaskStatusGroup
            label="En espera"
            tasks={waitingTasks}
            onOpenTask={onOpenTask}
          />
          <TaskStatusGroup
            completed
            label="Completadas"
            tasks={completedTasks}
            onOpenTask={onOpenTask}
          />
          <TaskStatusGroup
            label="Canceladas"
            tasks={cancelledTasks}
            onOpenTask={onOpenTask}
          />
        </div>
      )}
    </section>
  );
}
