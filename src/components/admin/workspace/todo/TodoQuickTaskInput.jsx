import { useState } from "react";
import {
  FaCalendarAlt,
  FaPlus,
  FaSpinner,
  FaUserCheck,
} from "react-icons/fa";

function getTodayInputValue() {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000,
  );

  return local.toISOString().slice(0, 10);
}

export default function TodoQuickTaskInput({
  assigneeOptions = [],
  defaultToday = false,
  isSaving = false,
  onCreate,
  requireDate = false,
  showAssignee = false,
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(
    defaultToday ? getTodayInputValue() : "",
  );
  const [assignedTo, setAssignedTo] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  async function submitTask() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setValidationMessage("Escribe el nombre de la tarea.");
      return;
    }

    if (requireDate && !dueDate) {
      setValidationMessage(
        "Selecciona una fecha para una tarea planificada.",
      );
      return;
    }

    const created = await onCreate({
      title: cleanTitle,
      dueDate,
      assignedTo,
    });

    if (created) {
      setTitle("");
      setAssignedTo("");
      setValidationMessage("");
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitTask();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-red-200 text-red-700">
          <FaPlus className="text-xs" />
        </span>

        <input
          type="text"
          value={title}
          disabled={isSaving}
          onChange={(event) => {
            setTitle(event.target.value);
            setValidationMessage("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Agregar una tarea y presionar Enter..."
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold text-gray-950 outline-none placeholder:font-normal placeholder:text-gray-400 disabled:cursor-not-allowed"
        />

        {isSaving ? (
          <FaSpinner className="animate-spin text-gray-400" />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
            <FaCalendarAlt className="text-gray-400" />
            <span>Fecha</span>
            <input
              type="date"
              value={dueDate}
              disabled={isSaving}
              onChange={(event) => {
                setDueDate(event.target.value);
                setValidationMessage("");
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-red-400"
            />
          </label>

          {showAssignee ? (
            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
              <FaUserCheck className="text-gray-400" />
              <span>Responsable</span>
              <select
                value={assignedTo}
                disabled={isSaving}
                onChange={(event) => {
                  setAssignedTo(event.target.value);
                  setValidationMessage("");
                }}
                className="max-w-64 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-red-400"
              >
                <option value="">Sin asignar</option>
                {assigneeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <p className="text-xs text-gray-500">
          Luego podrás agregar recordatorio, prioridad y más detalles.
        </p>
      </div>

      {validationMessage ? (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 sm:px-5">
          {validationMessage}
        </p>
      ) : null}
    </div>
  );
}
