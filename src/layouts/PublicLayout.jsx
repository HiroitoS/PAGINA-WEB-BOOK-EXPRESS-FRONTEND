import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import {
  FaBars,
  FaBookOpen,
  FaEnvelope,
  FaFacebookF,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegBuilding,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";
import logoBookExpress from "../assets/brand/logo-book-express-transparente.png";
import ScrollToTop from "../components/common/ScrollToTop";
import WhatsappFloatingButton from "../components/public/WhatsappFloatingButton";

const publicPhone = "934971161";
const publicEmail = "contacto@book-express.com";
const facebookUrl = "https://www.facebook.com/BookExpressHyo";

const navigationLinks = [
  {
    label: "Inicio",
    to: "/",
  },
  {
    label: "Nosotros",
    to: "/nosotros",
  },
  {
    label: "Servicios",
    to: "/servicios",
  },
  {
    label: "Catálogo",
    to: "/catalogo",
  },
  {
    label: "Plan lector",
    to: "/plan-lector",
  },
  {
    label: "Contacto",
    to: "/contacto",
  },
];

const serviceLinks = [
  "Textos escolares",
  "Plan lector",
  "Materiales educativos",
  "Atención a colegios",
];

function navClass({ isActive }) {
  return isActive
    ? "text-white font-bold"
    : "text-gray-300 hover:text-white";
}

function mobileNavClass({ isActive }) {
  return isActive
    ? "rounded-2xl bg-red-700 px-4 py-3 font-black text-white"
    : "rounded-2xl px-4 py-3 font-bold text-gray-300 hover:bg-white/10 hover:text-white";
}

function buildWhatsappUrl() {
  const envPhoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER || publicPhone;
  const cleanPhoneNumber = envPhoneNumber.replace(/\D/g, "");
  const phoneWithCountryCode = cleanPhoneNumber.startsWith("51")
    ? cleanPhoneNumber
    : `51${cleanPhoneNumber}`;

  const message =
    "Hola Book Express, deseo recibir información sobre libros y materiales educativos.";
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
}

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const whatsappUrl = buildWhatsappUrl();

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ScrollToTop />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/95 shadow-lg shadow-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link
            to="/"
            className="flex shrink-0 items-center"
            onClick={closeMenu}
          >
            <img
              src={logoBookExpress}
              alt="Book Express"
              className="h-14 w-40 object-contain md:h-20 md:w-60"
            />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-7 text-lg lg:flex">
            {navigationLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((currentValue) => !currentValue)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xl text-white transition hover:bg-white/10 md:hidden"
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-gray-950 px-4 py-4 md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-2">
              {navigationLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMenu}
                  className={mobileNavClass}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <WhatsappFloatingButton />

      <footer className="border-t border-white/10 bg-black text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex">
              <img
                src={logoBookExpress}
                alt="Book Express"
                className="h-20 w-60 object-contain"
              />
            </Link>

            <p className="mt-5 max-w-md text-sm leading-6 text-gray-300">
              Distribuidora de libros y materiales educativos para familias,
              colegios, docentes y directivos.
            </p>

            <div className="mt-5 space-y-3 text-sm text-gray-300">
              <div className="flex gap-3">
                <FaMapMarkerAlt className="mt-1 shrink-0 text-red-400" />
                <span>Huancayo, Junín · Perú</span>
              </div>

              <div className="flex gap-3">
                <FaRegBuilding className="mt-1 shrink-0 text-red-400" />
                <span>Distribuidora y Comercializadora Book Express SAC</span>
              </div>

              <div className="flex gap-3">
                <FaBookOpen className="mt-1 shrink-0 text-red-400" />
                <span>RUC: 20601658811</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-red-400">
              Navegación
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-gray-300">
              {navigationLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-red-400">
              Servicios
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-gray-300">
              {serviceLinks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-red-400">
              Contacto
            </h2>

            <div className="mt-5 space-y-4 text-sm text-gray-300">
              <a
                href={`tel:+51${publicPhone}`}
                className="flex gap-3 transition hover:text-white"
              >
                <FaPhoneAlt className="mt-1 shrink-0 text-red-400" />
                <span>+51 934 971 161</span>
              </a>

              <a
                href={`mailto:${publicEmail}`}
                className="flex gap-3 transition hover:text-white"
              >
                <FaEnvelope className="mt-1 shrink-0 text-red-400" />
                <span>{publicEmail}</span>
              </a>

              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 transition hover:text-white"
              >
                <FaFacebookF className="mt-1 shrink-0 text-red-400" />
                <span>BookExpressHyo</span>
              </a>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-green-700"
              >
                <FaWhatsapp />
                Escribir por WhatsApp
              </a>

              <Link
                to="/contacto"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Enviar consulta
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} Book Express. Todos los derechos
              reservados.
            </p>

            <p>Catálogo digital y atención comercial educativa.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}