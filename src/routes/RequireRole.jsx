import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth";

export default function RequireRole({ allowedRoles = [], children }) {
  const { user, hasRole } = useAuth();
  const allowed = user?.is_superuser || hasRole(allowedRoles);

  if (!allowed) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-red-700">
            Acceso no permitido
          </p>

          <h1 className="mt-3 text-2xl font-black text-gray-950">
            No tienes permisos para ingresar a este módulo.
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tu usuario puede acceder solo a los módulos asignados según su rol.
          </p>

          <Link
            to="/admin/dashboard"
            className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}