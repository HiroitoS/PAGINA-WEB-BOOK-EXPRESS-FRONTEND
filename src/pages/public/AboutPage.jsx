import { motion } from "motion/react";
import {
  FaBookOpen,
  FaCheckCircle,
  FaHeart,
  FaLightbulb,
  FaMapMarkerAlt,
  FaRegHandshake,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import aboutImage from "../../assets/image/about/book-express-about-1.png";
import missionImage from "../../assets/image/about/book-express-mision.png";
import visionImage from "../../assets/image/about/book-express-vision.png";

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

const values = [
  {
    title: "Honestidad",
    description: "Actuamos con claridad y transparencia en cada atención.",
    icon: FaShieldAlt,
  },
  {
    title: "Cumplimiento",
    description: "Respetamos los compromisos asumidos con responsabilidad.",
    icon: FaCheckCircle,
  },
  {
    title: "Trabajo en equipo",
    description: "Coordinamos esfuerzos para brindar una mejor atención.",
    icon: FaUsers,
  },
  {
    title: "Orientación al cliente",
    description: "Escuchamos cada necesidad para orientar mejor.",
    icon: FaRegHandshake,
  },
  {
    title: "Innovación",
    description: "Mejoramos nuestros procesos y canales de atención.",
    icon: FaLightbulb,
  },
  {
    title: "Excelencia",
    description: "Cuidamos la calidad del servicio en cada experiencia.",
    icon: FaHeart,
  },
];

export default function AboutPage() {
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
                  Nosotros
                </p>

                <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Somos Book Express.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                  Desde 2016, acompañamos a familias, colegios y docentes en la
                  búsqueda de textos escolares, plan lector y materiales
                  educativos con atención cercana, ordenada y confiable.
                </p>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                  Nuestra atención está dirigida a padres de familia, colegios,
                  directivos y docentes que buscan soluciones claras para cada
                  etapa escolar.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <InfoItemDark icon={FaCheckCircle} text="Desde 2016" />
                  <InfoItemDark icon={FaMapMarkerAlt} text="Huancayo, Junín" />
                  <InfoItemDark icon={FaBookOpen} text="Materiales educativos" />
                </div>
              </div>

              <HeroImageBlock
                image={aboutImage}
                eyebrow="Distribuidora educativa"
                title="Libros y materiales para acompañar cada etapa escolar."
                alt="Book Express distribuidora de libros y materiales educativos"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-7">
          <motion.article
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="grid gap-0 lg:grid-cols-2">
              <ImageBlock
                image={missionImage}
                eyebrow="Misión"
                title="Formación, actualización y acompañamiento educativo."
                alt="Misión de Book Express"
              />

              <div className="flex flex-col justify-center p-6 md:p-10">
                <p className="text-sm font-black uppercase tracking-wide text-red-700">
                  Misión
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">
                  Acompañar el desarrollo educativo con aliados estratégicos.
                </h2>

                <p className="mt-5 leading-7 text-gray-600">
                  Generamos acciones formativas, de actualización y
                  profesionalización docente a través de aliados estratégicos,
                  públicos y privados.
                </p>
              </div>
            </div>
          </motion.article>

          <motion.article
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="flex flex-col justify-center p-6 md:p-10">
                <p className="text-sm font-black uppercase tracking-wide text-red-700">
                  Visión
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950">
                  Promover soluciones educativas a medida de cada institución.
                </h2>

                <p className="mt-5 leading-7 text-gray-600">
                  Buscamos ser una empresa de representación comercial experta
                  en introducir y promocionar soluciones educativas adaptadas a
                  las necesidades de cada institución educativa.
                </p>
              </div>

              <ImageBlock
                image={visionImage}
                eyebrow="Visión"
                title="Soluciones educativas para colegios e instituciones."
                alt="Visión de Book Express"
              />
            </div>
          </motion.article>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mt-7 overflow-hidden rounded-3xl bg-gray-950 px-5 py-8 text-white shadow-xl md:px-8"
        >
          <div className="relative">
            <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-red-700/10 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-red-700/15 blur-3xl" />

            <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-red-400">
                  Valores Book Express
                </p>

                <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
                  Principios de atención.
                </h2>
              </div>

              <p className="max-w-xl text-sm leading-6 text-gray-300">
                Cada valor refleja cómo atendemos, orientamos y cumplimos con la
                comunidad educativa.
              </p>
            </div>

            <div className="relative mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((value, index) => (
                <ValueCard key={value.title} value={value} index={index} />
              ))}
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
        className="h-full max-h-112 w-full object-contain"
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

function ImageBlock({ image, eyebrow, title, alt }) {
  return (
    <div className="relative flex min-h-96 items-center justify-center overflow-hidden bg-gray-950">
      <img
        src={image}
        alt={alt}
        className="h-full min-h-96 w-full object-contain"
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

function ValueCard({ value, index }) {
  const Icon = value.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="h-36"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        whileHover={{ rotateY: 180 }}
        whileTap={{ rotateY: 180 }}
        transition={{ duration: 0.55 }}
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-5 text-center shadow-xl transition hover:border-red-500/40 hover:bg-white/10"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-700/20 text-lg text-red-300 ring-1 ring-red-500/30">
            <Icon />
          </div>

          <p className="mt-3 text-base font-black text-white">{value.title}</p>
        </div>

        <div
          className="absolute inset-0 flex flex-col justify-center rounded-3xl border border-red-500/30 bg-linear-to-br from-red-800 via-red-700 to-gray-950 p-5 text-center shadow-xl"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="text-base font-black text-white">{value.title}</p>

          <p className="mt-2 text-sm leading-6 text-red-50">
            {value.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoItemDark({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-700/20 text-red-300">
        <Icon />
      </div>

      <p className="text-sm font-black text-white">{text}</p>
    </div>
  );
}