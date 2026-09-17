import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  FaBookOpen,
  FaChalkboardTeacher,
  FaGraduationCap,
  FaRegHandshake,
  FaSchool,
  FaShieldAlt,
} from "react-icons/fa";
import { IoLibraryOutline } from "react-icons/io5";

import homeImage1 from "../../assets/image/home/book-express-home-1.jpg";
import homeImage2 from "../../assets/image/home/book-express-home-2.jpg";
import homeImage3 from "../../assets/image/home/book-express-home-3.jpg";
import homeImage4 from "../../assets/image/home/book-express-home-4.jpg";
import homeImage5 from "../../assets/image/home/book-express-home-5.jpg";
import homeImage6 from "../../assets/image/home/book-express-home-6.jpg";

import logoBruno from "../../assets/image/editorials/logo-bruno.png";
import logoEdebe from "../../assets/image/editorials/logo-edebe.png";
import logoInformatik from "../../assets/image/editorials/logo-informatik.png";
import logoInstitutoApoyo from "../../assets/image/editorials/logo-instituto-apoyo.png";
import logoKhalamos from "../../assets/image/editorials/logo-khalamos.png";
import logoNorma from "../../assets/image/editorials/logo-norma.png";
import logoSantillana from "../../assets/image/editorials/logo-santillana.png";
import logoThema from "../../assets/image/editorials/logo-thema.png";

const SLIDE_DURATION = 5200;

const carouselImages = [
  {
    src: homeImage1,
    alt: "Materiales educativos organizados por Book Express",
    eyebrow: "Textos escolares",
    title: "Materiales para cada etapa escolar.",
  },
  {
    src: homeImage2,
    alt: "Libros escolares para familias y colegios",
    eyebrow: "Atención educativa",
    title: "Orientación para familias y colegios.",
  },
  {
    src: homeImage3,
    alt: "Distribución de libros y materiales educativos",
    eyebrow: "Distribución escolar",
    title: "Libros organizados para campaña.",
  },
  {
    src: homeImage4,
    alt: "Materiales educativos para campaña escolar",
    eyebrow: "Catálogo por editorial",
    title: "Encuentra materiales con mayor claridad.",
  },
  {
    src: homeImage5,
    alt: "Plan lector y textos escolares Book Express",
    eyebrow: "Plan lector",
    title: "Obras para fortalecer la lectura.",
  },
  {
    src: homeImage6,
    alt: "Atención educativa para colegios y familias",
    eyebrow: "Book Express",
    title: "Servicio cercano y confiable.",
  },
];

const services = [
  {
    title: "Textos escolares",
    description:
      "Materiales educativos organizados para padres, docentes e instituciones educativas.",
    icon: FaBookOpen,
  },
  {
    title: "Plan lector",
    description:
      "Obras y recursos para fortalecer la lectura en cada etapa escolar.",
    icon: IoLibraryOutline,
  },
  {
    title: "Materiales educativos",
    description:
      "Soluciones para acompañar la enseñanza y el aprendizaje durante el año escolar.",
    icon: FaGraduationCap,
  },
  {
    title: "Atención personalizada",
    description:
      "Orientación cercana para ayudarte a encontrar el material educativo que necesitas.",
    icon: FaRegHandshake,
  },
];

const trustItems = [
  {
    title: "Catálogo por editoriales",
    description:
      "Organizamos los materiales para que padres y colegios encuentren información clara.",
    icon: FaBookOpen,
  },
  {
    title: "Atención confiable",
    description:
      "Acompañamos la consulta antes de coordinar disponibilidad, precio o entrega.",
    icon: FaShieldAlt,
  },
  {
    title: "Para familias y colegios",
    description:
      "Una plataforma pensada para padres, docentes, directivos e instituciones educativas.",
    icon: FaSchool,
  },
];

const editorials = [
  {
    name: "Bruño",
    logo: logoBruno,
  },
  {
    name: "Santillana",
    logo: logoSantillana,
  },
  {
    name: "Norma",
    logo: logoNorma,
  },
  {
    name: "Edebé",
    logo: logoEdebe,
  },
  {
    name: "Khalamos",
    logo: logoKhalamos,
  },
  {
    name: "Thema",
    logo: logoThema,
  },
  {
    name: "Informatik",
    logo: logoInformatik,
  },
  {
    name: "Instituto Apoyo",
    logo: logoInstitutoApoyo,
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

export default function HomePage() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImage = carouselImages[activeImageIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveImageIndex((currentIndex) =>
        currentIndex === carouselImages.length - 1 ? 0 : currentIndex + 1
      );
    }, SLIDE_DURATION);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function selectCarouselImage(index) {
    setActiveImageIndex(index);
  }

  return (
    <div className="bg-gray-950 text-white">
      <section className="relative overflow-hidden bg-linear-to-br from-gray-950 via-gray-900 to-black">
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center lg:py-24">
          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.55 }}
            variants={fadeUp}
          >
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Distribuidora de libros y materiales educativos
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
              Materiales educativos para acompañar cada etapa escolar.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">
              En Book Express conectamos a familias y colegios con textos
              escolares, plan lector y materiales educativos de editoriales
              reconocidas, brindando orientación cercana y atención confiable.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/catalogo"
                className="inline-flex items-center justify-center rounded-xl bg-red-700 px-6 py-3 font-bold text-white shadow-lg shadow-red-950/40 transition hover:-translate-y-0.5 hover:bg-red-800"
              >
                Ver catálogo
              </Link>

              <Link
                to="/contacto"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-bold text-white shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Solicitar información
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.55, delay: 0.15 }}
            variants={fadeUp}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-full bg-red-700/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-900 md:aspect-16/11 lg:aspect-5/4">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImage.src}
                    src={activeImage.src}
                    alt={activeImage.alt}
                    initial={{ opacity: 0, scale: 1.06, x: 34 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98, x: -34 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full w-full object-cover"
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-linear-to-r from-black/40 via-transparent to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />

                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                  <motion.div
                    key={activeImage.src}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: SLIDE_DURATION / 1000,
                      ease: "linear",
                    }}
                    className="h-full bg-red-500"
                  />
                </div>

                <div className="absolute bottom-5 left-5 right-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeImage.title}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.45 }}
                        className="max-w-sm border-l-4 border-red-500 pl-4"
                      >
                        <p className="text-xs font-black uppercase tracking-wide text-red-300 drop-shadow">
                          {activeImage.eyebrow}
                        </p>

                        <h2 className="mt-2 text-xl font-black leading-tight text-white drop-shadow-lg md:text-2xl">
                          {activeImage.title}
                        </h2>
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 backdrop-blur">
                      {carouselImages.map((item, index) => (
                        <button
                          key={item.src}
                          type="button"
                          onClick={() => selectCarouselImage(index)}
                          aria-label={`Mostrar imagen ${index + 1}`}
                          className={
                            index === activeImageIndex
                              ? "h-2.5 w-8 rounded-full bg-red-500 transition"
                              : "h-2.5 w-2.5 rounded-full bg-white/45 transition hover:bg-white"
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-gray-950 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            variants={fadeUp}
            className="max-w-2xl"
          >
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Confianza Book Express
            </p>

            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
              Una distribuidora educativa cercana, ordenada y confiable
            </h2>

            <p className="mt-4 leading-7 text-gray-300">
              Nuestro objetivo es que padres, docentes y colegios encuentren
              información clara sobre materiales educativos y puedan recibir
              orientación antes de coordinar su compra.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {trustItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur transition hover:border-red-500/40 hover:bg-white/10 hover:shadow-2xl"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-700/15 text-2xl text-red-400">
                    <Icon />
                  </div>

                  <h3 className="text-lg font-black text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-300">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-black py-16">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            variants={fadeUp}
            className="max-w-2xl"
          >
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Servicios
            </p>

            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
              Soluciones educativas para padres, colegios y docentes
            </h2>

            <p className="mt-4 leading-7 text-gray-300">
              Organizamos nuestra información para que encuentres libros,
              materiales y opciones de atención de manera clara.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => {
              const Icon = service.icon;

              return (
                <motion.div
                  key={service.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur transition hover:border-red-500/40 hover:bg-white/10 hover:shadow-2xl"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-700/15 text-2xl text-red-400 transition group-hover:bg-red-700 group-hover:text-white">
                    <Icon />
                  </div>

                  <h3 className="text-lg font-black text-white">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-300">
                    {service.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gray-950 py-20 text-white">
        <div className="absolute -left-20 bottom-0 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />
        <div className="absolute -right-16 top-0 h-80 w-80 rounded-full bg-red-700/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              variants={fadeUp}
            >
              <p className="text-sm font-black uppercase tracking-wide text-red-400">
                Editoriales
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                Un catálogo claro por editoriales educativas.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-8 text-gray-300">
                Organizamos los materiales para que padres, docentes y colegios
                puedan consultar libros, series y recursos educativos con mayor
                facilidad.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/catalogo"
                  className="rounded-xl bg-red-700 px-6 py-3 font-bold text-white shadow-lg shadow-red-950/40 transition hover:-translate-y-0.5 hover:bg-red-800"
                >
                  Explorar catálogo
                </Link>

                <Link
                  to="/plan-lector"
                  className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Ver plan lector
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.12 }}
              variants={fadeUp}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-full bg-red-700/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
                <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-red-700/10" />

                <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {editorials.map((editorial, index) => (
                    <motion.div
                      key={editorial.name}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: index * 0.05 }}
                      whileHover={{
                        y: -6,
                        scale: 1.03,
                      }}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white p-5 shadow-xl transition hover:border-red-300"
                    >
                      <div className="absolute inset-0 bg-linear-to-br from-white via-white to-red-50" />
                      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-red-500/10 blur-2xl transition group-hover:bg-red-500/25" />

                      <div className="relative flex h-28 items-center justify-center md:h-32">
                        <img
                          src={editorial.logo}
                          alt={`Logo ${editorial.name}`}
                          className="max-h-24 max-w-full object-contain transition duration-300 group-hover:scale-110 md:max-h-28"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-16 text-white">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-red-700/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            variants={fadeUp}
          >
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Atención rápida
            </p>

            <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">
              ¿Buscas un libro o material específico?
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-gray-300">
              Ingresa al catálogo, selecciona el producto y solicita información.
              Nuestro equipo podrá ayudarte con disponibilidad, precio y
              coordinación.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.12 }}
            variants={fadeUp}
            className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur"
          >
            <div className="rounded-3xl bg-white p-6 text-gray-950 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl text-red-700">
                <FaChalkboardTeacher />
              </div>

              <p className="text-sm font-bold text-red-700">
                Atención comercial
              </p>

              <h3 className="mt-3 text-2xl font-black">
                Te orientamos antes de tu compra
              </h3>

              <p className="mt-4 text-sm leading-6 text-gray-600">
                Puedes solicitar información desde la ficha de cada producto o
                comunicarte con Book Express para recibir orientación.
              </p>

              <Link
                to="/contacto"
                className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
              >
                Solicitar información
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}