import { useState } from "react";
import { motion } from "motion/react";
import {
  FaCheckCircle,
  FaEnvelope,
  FaPhoneAlt,
  FaRegCommentDots,
  FaWhatsapp,
} from "react-icons/fa";
import { createPublicContactRequest } from "../../api/publicApi";

import contactHeroImage from "../../assets/image/contact/book-express-contacto-hero.png";

const INQUIRY_TYPES = [
  { value: "product", label: "Busco un libro o material educativo" },
  { value: "school", label: "Consulta para colegio" },
  { value: "reading_plan", label: "Plan lector" },
  { value: "catalog", label: "Editoriales y catálogo" },
  { value: "training", label: "Capacitación docente" },
  { value: "other", label: "Otra consulta" },
];

const contactItems = [
  {
    title: "WhatsApp",
    value: "934 971 161",
    description: "Canal rápido para consultas generales.",
    icon: FaWhatsapp,
  },
  {
    title: "Correo",
    value: "contacto@book-express.com",
    description: "Para consultas formales o institucionales.",
    icon: FaEnvelope,
  },
  {
    title: "Atención",
    value: "Familias, docentes y colegios",
    description: "Orientación sobre textos, plan lector y materiales.",
    icon: FaPhoneAlt,
  },
];

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function ContactPage() {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    inquiry_type: INQUIRY_TYPES[0].value,
    message: "",
  });

  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetMessages() {
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    resetMessages();

    if (!form.full_name.trim() || !form.phone.trim() || !form.message.trim()) {
      setErrorMessage(
        "Completa tu nombre, celular y mensaje para enviar la consulta."
      );
      return;
    }

    setSending(true);

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      inquiry_type: form.inquiry_type,
      message: form.message.trim(),
      source: "web",
    };

    try {
      await createPublicContactRequest(payload);

      setSuccessMessage(
        "Tu consulta fue registrada correctamente. Book Express revisará tu solicitud para orientarte."
      );

      setForm({
        full_name: "",
        phone: "",
        email: "",
        inquiry_type: INQUIRY_TYPES[0].value,
        message: "",
      });
    } catch {
      setErrorMessage(
        "No se pudo registrar la consulta en este momento. Inténtalo nuevamente o comunícate por WhatsApp."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="bg-gray-50">
      <div className="bg-gray-950 text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-12 lg:py-14">
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5 }}
            className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
          >
            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
              <div className="flex flex-col justify-center p-6 md:p-9 lg:p-10">
                <p className="text-sm font-black uppercase tracking-wide text-red-400">
                  Contacto Book Express
                </p>

                <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                  Cuéntanos qué material educativo necesitas.
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-300 md:text-base">
                  Registra tu consulta y te orientaremos sobre textos escolares,
                  plan lector, materiales educativos o atención para colegios.
                </p>
              </div>

              <div className="relative min-h-80 overflow-hidden bg-gray-950 lg:min-h-full">
                <img
                  src={contactHeroImage}
                  alt="Atención de consultas educativas Book Express"
                  className="h-full min-h-80 w-full object-cover transition duration-700 hover:scale-105"
                />

                <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
          >
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-wide text-red-700">
                Formulario de consulta
              </p>

              <h2 className="mt-2 text-3xl font-black text-gray-950">
                Envíanos tu solicitud
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Completa tus datos y describe brevemente lo que necesitas.
                Puedes indicar editorial, grado, nivel, área o nombre del
                material.
              </p>
            </div>

            {successMessage && (
              <div className="mb-5 flex gap-3 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700 ring-1 ring-green-100">
                <FaCheckCircle className="mt-0.5 shrink-0" />
                <p>{successMessage}</p>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Nombre completo *"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Ej. María Pérez"
                />

                <FormField
                  label="Celular / WhatsApp *"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ej. 999999999"
                  type="tel"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Correo electrónico"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Opcional"
                  type="email"
                />

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">
                    Tipo de consulta
                  </label>

                  <select
                    name="inquiry_type"
                    value={form.inquiry_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  >
                    {INQUIRY_TYPES.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                        className="bg-white text-gray-900"
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">
                  Mensaje *
                </label>

                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Ej. Deseo consultar por un libro para 4° de primaria o información para un colegio."
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FaRegCommentDots />
                {sending ? "Enviando consulta..." : "Enviar consulta"}
              </button>
            </form>
          </motion.div>

          <motion.aside
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="space-y-5"
          >
            <div className="rounded-3xl bg-gray-950 p-6 text-white shadow-xl">
              <p className="text-sm font-black uppercase tracking-wide text-red-400">
                Canales de atención
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-300">
                También puedes comunicarte directamente con Book Express por
                nuestros canales oficiales.
              </p>

              <div className="mt-5 space-y-3">
                {contactItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.title}
                      whileHover={{ x: 4 }}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-red-500/40 hover:bg-white/10"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-700/20 text-red-300">
                          <Icon />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-wide text-red-300">
                            {item.title}
                          </p>

                          <p className="mt-1 wrap-break-words text-sm font-black leading-5 text-white">
                            {item.value}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <a
                href="https://wa.me/51934971161"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-700"
              >
                <FaWhatsapp />
                Escribir por WhatsApp
              </a>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-black uppercase tracking-wide text-red-700">
                Recomendación
              </p>

              <h3 className="mt-2 text-xl font-black text-gray-950">
                Detalla tu consulta
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Para ayudarte mejor, incluye el nombre del libro, editorial,
                nivel, grado o tipo de material que necesitas.
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-700 focus:ring-2 focus:ring-red-100"
      />
    </div>
  );
}