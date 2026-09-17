import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  FaArrowLeft,
  FaBookOpen,
  FaCheckCircle,
  FaInfoCircle,
  FaRegImage,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";
import {
  createPublicContactRequest,
  getPublicProductBySlug,
} from "../../api/publicApi";
import { buildWhatsappContactRequestPayload } from "../../utils/contactRequestBuilder";
import { formatPrice } from "../../utils/formatters";
import {
  getLatestPrice,
  getProductArea,
  getProductCover,
  getProductDescription,
  getProductGrade,
  getProductLevel,
  getProductName,
  getProductProvider,
  getProductSeries,
  getProductType,
  isProductAvailable,
} from "../../utils/productSanitizer";
import { buildWhatsappUrl } from "../../utils/whatsapp";

export default function ProductDetailPage() {
  const { slug } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showWhatsappForm, setShowWhatsappForm] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [contactForm, setContactForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    message: "",
  });

  function handleContactChange(event) {
    const { name, value } = event.target;

    setContactForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  useEffect(() => {
    let ignore = false;

    async function fetchProduct() {
      setLoading(true);
      setError("");

      try {
        const data = await getPublicProductBySlug(slug);

        if (!ignore) {
          setProduct(data);
        }
      } catch {
        if (!ignore) {
          setError("No se pudo cargar la ficha del producto.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-gray-700">
              Cargando ficha del producto...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-3xl bg-red-50 p-8 text-center text-red-700 ring-1 ring-red-100">
            <p className="font-bold">{error || "Producto no encontrado."}</p>

            <Link
              to="/catalogo"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
            >
              <FaArrowLeft />
              Volver al catálogo
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const name = getProductName(product);
  const provider = getProductProvider(product);
  const cover = getProductCover(product);
  const level = getProductLevel(product);
  const grade = getProductGrade(product);
  const area = getProductArea(product);
  const series = getProductSeries(product);
  const productType = getProductType(product);
  const description = getProductDescription(product);
  const latestPrice = getLatestPrice(product);
  const available = isProductAvailable(product);
  const whatsappUrl = buildWhatsappUrl(product);

  const details = [
    {
      label: "Editorial",
      value: provider,
    },
    {
      label: "Nivel",
      value: level,
    },
    {
      label: "Grado",
      value: grade,
    },
    {
      label: "Área",
      value: area,
    },
    {
      label: "Serie",
      value: series,
    },
    {
      label: "Tipo de material",
      value: productType,
    },
  ].filter((item) => item.value);

  function handleWhatsappClick() {
    setShowWhatsappForm(true);
  }

  async function handleWhatsappFormSubmit(event) {
    event.preventDefault();

    if (!contactForm.full_name.trim() || !contactForm.phone.trim()) {
      return;
    }

    setSendingRequest(true);

    const whatsappWindow = window.open("", "_blank");

    try {
      const basePayload = buildWhatsappContactRequestPayload(product);

      const payload = {
        ...basePayload,
        full_name: contactForm.full_name.trim(),
        phone: contactForm.phone.trim(),
        email: contactForm.email.trim(),
        message: contactForm.message.trim() || basePayload.message,
      };

      await createPublicContactRequest(payload);

      setShowWhatsappForm(false);

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }
    } catch {
      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }
    } finally {
      setSendingRequest(false);
    }
  }

  return (
    <section className="bg-gray-50">
      <div className="bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-6 text-white">
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 text-sm font-bold text-red-300 transition hover:text-white"
          >
            <FaArrowLeft />
            Volver al catálogo
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-red-400">
                Ficha del material
              </p>

              <h1 className="mt-2 max-w-5xl text-2xl font-black leading-tight md:text-4xl">
                {name}
              </h1>

              {provider && (
                <p className="mt-2 text-sm font-semibold text-gray-300">
                  Editorial: <span className="text-white">{provider}</span>
                </p>
              )}
            </div>

            <div
              className={
                available
                  ? "inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-700 ring-1 ring-green-100"
                  : "inline-flex w-fit items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-100"
              }
            >
              <FaCheckCircle />
              {available ? "Disponible o a consultar" : "No disponible"}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative flex h-96 items-center justify-center overflow-hidden rounded-3xl bg-gray-100 ring-1 ring-gray-200">
              {cover ? (
                <img
                  src={cover}
                  alt={name}
                  className="max-h-88 w-full object-contain p-4"
                />
              ) : (
                <PlaceholderCover />
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap gap-2">
              {provider && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                  {provider}
                </span>
              )}

              {productType && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-gray-600">
                  {productType}
                </span>
              )}
            </div>

            <h2 className="mt-3 text-2xl font-black leading-tight text-gray-950 md:text-3xl">
              {name}
            </h2>

            {description && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {description}
              </p>
            )}

            <div className="mt-5 grid gap-4 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100 md:grid-cols-[0.85fr_1.15fr] md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  Precio
                </p>

                {latestPrice?.show_price && latestPrice?.price ? (
                  <p className="mt-1 text-3xl font-black text-gray-950">
                    {formatPrice(latestPrice.price)}
                  </p>
                ) : (
                  <p className="mt-1 text-2xl font-black text-gray-950">
                    Consultar precio
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleWhatsappClick}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-700"
                >
                  <FaWhatsapp />
                  WhatsApp
                </button>

                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Realiza una consulta
                </Link>
              </div>
            </div>

            {details.length > 0 && (
              <div className="mt-5">
                <h3 className="flex items-center gap-2 text-base font-black text-gray-950">
                  <FaBookOpen className="text-red-700" />
                  Datos del material
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {details.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        {item.label}
                      </p>

                      <p className="mt-1 text-sm font-black text-gray-950">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <div className="flex gap-3">
                <FaInfoCircle className="mt-1 shrink-0 text-red-700" />

                <p className="text-xs leading-5 text-gray-700">
                  El precio y la disponibilidad pueden variar según campaña,
                  stock o actualización del catálogo. Book Express confirmará la
                  información antes de coordinar la atención.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                to="/catalogo"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-800 transition hover:bg-gray-100"
              >
                Ver más materiales
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showWhatsappForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-red-700">
                  Book Express
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-950">
                  Solicitar información
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Déjanos tus datos para registrar tu consulta y continuar por
                  WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWhatsappForm(false)}
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Cerrar formulario"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleWhatsappFormSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">
                  Nombre completo *
                </label>

                <input
                  type="text"
                  name="full_name"
                  value={contactForm.full_name}
                  onChange={handleContactChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  placeholder="Ej. María Pérez"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">
                  Celular / WhatsApp *
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={contactForm.phone}
                  onChange={handleContactChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  placeholder="Ej. 999999999"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  name="email"
                  value={contactForm.email}
                  onChange={handleContactChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">
                  Mensaje adicional
                </label>

                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleContactChange}
                  rows="3"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  placeholder="Ej. Deseo consultar disponibilidad para 2 unidades."
                />
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 ring-1 ring-gray-100">
                <p className="font-black text-gray-950">Producto consultado</p>
                <p className="mt-1">{name}</p>

                {provider && (
                  <p className="mt-1 text-gray-600">Editorial: {provider}</p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowWhatsappForm(false)}
                  className="rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-100"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={sendingRequest}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaWhatsapp />
                  {sendingRequest
                    ? "Registrando..."
                    : "Continuar por WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function PlaceholderCover() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-gray-100 via-white to-gray-200 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-xl text-red-700 ring-1 ring-red-100">
        <FaRegImage />
      </div>

      <p className="mt-3 text-sm font-black uppercase tracking-wide text-red-700">
        Portada pendiente
      </p>

      <p className="mt-2 max-w-xs text-xs leading-5 text-gray-500">
        La imagen de este material se actualizará próximamente.
      </p>
    </div>
  );
}