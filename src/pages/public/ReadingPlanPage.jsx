import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowRight,
  FaBookOpen,
  FaChalkboardTeacher,
  FaCheckCircle,
} from "react-icons/fa";

import readingPlanHeroImage from "../../assets/image/reading-plan/book-express-plan-lector-hero.png";

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

const benefits = [
  {
    title: "Lectura escolar",
    description: "Obras y materiales para fortalecer el hábito lector.",
    icon: FaBookOpen,
  },
  {
    title: "Apoyo docente",
    description: "Orientación para revisar propuestas de lectura.",
    icon: FaChalkboardTeacher,
  },
  {
    title: "Consulta organizada",
    description: "Acceso rápido a productos de plan lector.",
    icon: FaCheckCircle,
  },
];

export default function ReadingPlanPage() {
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
                  Plan lector Book Express
                </p>

                <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Obras y materiales para fortalecer la lectura escolar.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                  Acompañamos a colegios, docentes y familias en la búsqueda de
                  materiales de lectura para el año escolar.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/catalogo?productType=plan-lector"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-6 py-3 font-bold text-white shadow-lg shadow-red-950/40 transition hover:-translate-y-0.5 hover:bg-red-800"
                  >
                    Ver obras de plan lector
                    <FaArrowRight />
                  </Link>

                  <Link
                    to="/contacto"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-bold text-white shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    Solicitar orientación
                  </Link>
                </div>
              </div>

              <HeroImageBlock
                image={readingPlanHeroImage}
                eyebrow="Lectura escolar"
                title="Recursos para acompañar el hábito lector."
                alt="Plan lector para colegios, docentes y familias"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col justify-center p-6 md:p-8">
              <p className="text-sm font-black uppercase tracking-wide text-red-700">
                Lectura y aprendizaje
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950 md:text-4xl">
                Una línea enfocada en colegios, docentes y familias.
              </h2>

              <p className="mt-4 text-sm leading-7 text-gray-600">
                El plan lector ayuda a organizar materiales de lectura escolar y
                facilita la consulta de obras disponibles desde el catálogo.
              </p>
            </div>

            <div className="grid gap-4 bg-gray-950 p-5 md:grid-cols-3 md:p-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;

                return (
                  <motion.article
                    key={benefit.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    whileHover={{ y: -6 }}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl transition hover:border-red-500/40 hover:bg-white/10"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-700/20 text-lg text-red-300 ring-1 ring-red-500/30">
                      <Icon />
                    </div>

                    <h3 className="mt-5 text-lg font-black text-white">
                      {benefit.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-gray-300">
                      {benefit.description}
                    </p>
                  </motion.article>
                );
              })}
            </div>
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