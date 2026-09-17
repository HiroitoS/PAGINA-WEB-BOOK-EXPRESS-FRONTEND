import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { userCanEnterCurrentPanel } from "../utils/adminAccess";

export default function RequireAuth() {
  const { isAuthenticated, loadingAuth, user } = useAuth();

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-xl bg-white px-6 py-5 shadow">
          <p className="text-sm font-medium text-gray-700">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!userCanEnterCurrentPanel(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-xl font-black text-gray-950 sm:text-2xl">
            Acceso no permitido
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tu usuario está autenticado, pero todavía no tiene acceso a ningún
            módulo habilitado del panel de Book Express.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
