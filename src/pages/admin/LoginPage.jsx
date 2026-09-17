import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import {
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultAdminPath } from "../../utils/adminAccess";

import logoBookExpress from "../../assets/brand/logo-book-express-negro-recortado.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loadingAuth, user } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function togglePasswordVisibility() {
    setShowPassword((currentValue) => !currentValue);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoadingLogin(true);

    try {
      const loggedUser = await login(form.username, form.password);
      navigate(getDefaultAdminPath(loggedUser));
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoadingLogin(false);
    }
  }

  if (!loadingAuth && isAuthenticated) {
    return <Navigate to={getDefaultAdminPath(user)} replace />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 px-4 py-10">
      <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-red-600/15 blur-3xl" />
      <div className="absolute inset-0 bg-linear-to-br from-gray-950 via-gray-950 to-black" />

      <section className="relative w-full max-w-md">
        <div className="absolute -inset-4 rounded-full bg-red-700/10 blur-3xl" />

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-400/50 to-transparent" />

          <div className="mb-8 text-center">
            <div className="mx-auto flex h-24 w-44 items-center justify-center rounded-3xl border border-white/10 bg-black/45 p-4 shadow-xl">
              <img
                src={logoBookExpress}
                alt="Book Express"
                className="max-h-16 w-auto object-contain"
              />
            </div>

            <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-700/20 text-red-300 ring-1 ring-red-500/30">
              <FaShieldAlt />
            </div>

            <p className="mt-4 text-sm font-black uppercase tracking-wide text-red-300">
              Acceso administrativo
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight text-white">
              Iniciar sesión
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-300">
              Ingresa con tu usuario autorizado.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-200">
                Usuario
              </label>

              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 pl-11 text-sm font-medium text-white outline-none transition placeholder:text-gray-500 focus:border-red-400 focus:bg-white/15 focus:ring-2 focus:ring-red-500/20"
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-200">
                Contraseña
              </label>

              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 pl-11 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-gray-500 focus:border-red-400 focus:bg-white/15 focus:ring-2 focus:ring-red-500/20"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-white"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="inline-flex w-full items-center justify-center rounded-xl bg-red-700 px-4 py-3 font-black text-white shadow-lg shadow-red-950/30 transition hover:-translate-y-0.5 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingLogin ? "Ingresando..." : "Ingresar al panel"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-gray-400">
            Acceso exclusivo para usuarios autorizados de Book Express.
          </p>
        </div>
      </section>
    </main>
  );
}