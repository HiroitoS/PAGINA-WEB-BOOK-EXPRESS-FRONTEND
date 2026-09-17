import { Link } from "react-router";
import { motion } from "motion/react";
import { FaBookOpen, FaGraduationCap } from "react-icons/fa";
import { IoLibraryOutline } from "react-icons/io5";

import servicesHeroImage from "../../assets/image/services/book-express-servicios-hero.png";
import textbooksImage from "../../assets/image/services/book-express-textos-escolares.png";
import readingPlanImage from "../../assets/image/services/book-express-plan-lector.png";
import materialsImage from "../../assets/image/services/book-express-materiales-educativos.png";

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

const serviceLines = [
  {
    title: "Textos escolares",
    eyebrow: "Campaña escolar",
    description:
      "Materiales organizados por editorial, nivel, grado y área para facilitar la consulta de familias, docentes y colegios.",
    icon: FaBookOpen,
    image: textbooksImage,
    alt: "Textos escolares organizados para campaña escolar",
    linkTo: "/catalogo",
    linkLabel: "Ver catálogo",
  },
  {
    title: "Plan lector",
    eyebrow: "Lectura escolar",
    description:
      "Obras y materiales de lectura para fortalecer el hábito lector y acompañar el aprendizaje durante el año escolar.",
    icon: IoLibraryOutline,
    image: readingPlanImage,
    alt: "Obras y materiales para plan lector",
    linkTo: "/plan-lector",
    linkLabel: "Ver plan lector",
  },
  {
    title: "Materiales educativos",
    eyebrow: "Recursos de apoyo",
    description:
      "Recursos complementarios para apoyar la enseñanza, el trabajo docente y las actividades educativas.",
    icon: FaGraduationCap,
    image: materialsImage,
    alt: "Materiales educativos complementarios para estudiantes y docentes",
    linkTo: "/contacto",
    linkLabel: "Solicitar información",
  },
];

const serviceHighlights = [
  "Textos escolares",
  "Plan lector",
  "Materiales educativos",
];

export default function ServicesPage() {
  return (
    <section className="bg-gray-50">
      <div className="bg-gray-950 text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-14 lg:py-16">
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
          >
            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
              <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
                <p className="text-sm font-black uppercase tracking-wide text-red-400">
                  Servicios
                </p>

                <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Soluciones educativas para familias, colegios y docentes.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                  Acompañamos la búsqueda de materiales educativos con una
                  atención clara, cercana y organizada.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {serviceHighlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>

              <HeroImageBlock
                image={servicesHeroImage}
                eyebrow="Book Express"
                title="Atención educativa clara, cercana y profesional."
                alt="Servicios educativos de Book Express"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {serviceLines.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-red-700">
                ¿Necesitas ayuda?
              </p>

              <h2 className="mt-2 text-3xl font-black leading-tight text-gray-950">
                Solicita información sobre nuestros servicios.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                Puedes escribirnos para consultar textos escolares, materiales,
                plan lector o atención para instituciones educativas.
              </p>
            </div>

            <Link
              to="/contacto"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-700 px-6 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-800"
            >
              Contactar ahora
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroImageBlock({ image, eyebrow, title, alt }) {
  return (
    <div className="relative flex min-h-96 items-center justify-center overflow-hidden bg-gray-950">
      <img
        src={image}
        alt={alt}
        className="h-full max-h-112 w-full object-cover transition duration-700 hover:scale-105"
      />

      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />

      <div className="absolute bottom-6 left-6 right-6 max-w-sm border-l-4 border-red-500 pl-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-300">
          {eyebrow}
        </p>

        <p className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">
          {title}
        </p>
      </div>
    </div>
  );
}

function ServiceCard({ service, index }) {
  const Icon = service.icon;

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      whileHover={{ y: -8 }}
      className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:shadow-2xl"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-gray-950">
        <img
          src={service.image}
          alt={service.alt}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent" />

        <div className="absolute bottom-5 left-5 right-5 border-l-4 border-red-500 pl-4">
          <p className="text-xs font-black uppercase tracking-wide text-red-300">
            {service.eyebrow}
          </p>

          <h2 className="mt-2 text-2xl font-black leading-tight text-white">
            {service.title}
          </h2>
        </div>
      </div>

      <div className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl text-red-700">
          <Icon />
        </div>

        <p className="mt-5 min-h-24 text-sm leading-7 text-gray-600">
          {service.description}
        </p>

        <Link
          to={service.linkTo}
          className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
        >
          {service.linkLabel}
        </Link>
      </div>
    </motion.article>
  );
}