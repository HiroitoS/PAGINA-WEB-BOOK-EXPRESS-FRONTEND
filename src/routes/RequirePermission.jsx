import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth";

export default function RequirePermission({
  requiredPermissions = [],
  children,
}) {
  const { user, hasPermission } = useAuth();

  const allowed = user?.is_superuser || hasPermission(requiredPermissions);

  if (!allowed) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase tracking-wide text-red-700">
            Acceso no permitido
          </p>

          <h1 className="mt-3 text-xl font-black text-gray-950 sm:text-2xl">
            No tienes permiso para ingresar a este módulo.
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tu usuario no tiene habilitada esta función. Si la necesitas para
            realizar tu trabajo, un administrador puede revisar tus accesos.
          </p>

          <Link
            className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800"
            to="/admin"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
