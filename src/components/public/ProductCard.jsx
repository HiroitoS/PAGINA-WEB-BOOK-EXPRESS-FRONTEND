import { Link } from "react-router";
import { motion } from "motion/react";
import { FaArrowRight, FaCheckCircle, FaRegImage } from "react-icons/fa";
import { formatPrice } from "../../utils/formatters";
import {
  getLatestPrice,
  getProductArea,
  getProductCover,
  getProductGrade,
  getProductName,
  getProductProvider,
  getProductSlug,
  getProductType,
  isProductAvailable,
} from "../../utils/productSanitizer";

export default function ProductCard({ product }) {
  const name = getProductName(product);
  const provider = getProductProvider(product);
  const slug = getProductSlug(product);
  const cover = getProductCover(product);
  const grade = getProductGrade(product);
  const area = getProductArea(product);
  const productType = getProductType(product);
  const latestPrice = getLatestPrice(product);
  const available = isProductAvailable(product);

  const classification = [grade, area].filter(Boolean).join(" · ");
  const productUrl = slug ? `/catalogo/${slug}` : "#";

  return (
    <motion.article
      variants={{
        hidden: {
          opacity: 0,
          y: 10,
        },
        visible: {
          opacity: 1,
          y: 0,
        },
      }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl"
    >
      <Link to={productUrl} className="block">
        <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gray-100">
          {cover ? (
            <img
              src={cover}
              alt={name}
              className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <PlaceholderCover />
          )}

          {available && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 shadow-sm ring-1 ring-green-100">
              <FaCheckCircle className="text-[9px]" />
              Disponible
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
            {provider || "Editorial"}
          </span>

          {productType && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-600">
              {productType}
            </span>
          )}
        </div>

        <Link to={productUrl} title={name}>
          <h2 className="line-clamp-3 min-h-15 text-sm font-black leading-5 text-gray-950 transition group-hover:text-red-700">
            {name}
          </h2>
        </Link>

        {classification ? (
          <p className="mt-2 line-clamp-1 text-xs font-medium text-gray-500">
            {classification}
          </p>
        ) : (
          <p className="mt-2 text-xs font-medium text-gray-400">
            Información en la ficha
          </p>
        )}

        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Precio
          </p>

          {latestPrice?.show_price && latestPrice?.price ? (
            <p className="mt-0.5 text-lg font-black text-gray-950">
              {formatPrice(latestPrice.price)}
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-black text-gray-950">
              Consultar precio
            </p>
          )}
        </div>

        <div className="mt-auto pt-3">
          {slug ? (
            <Link
              to={productUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2 text-sm font-black text-white transition hover:bg-red-800"
            >
              Ver ficha
              <FaArrowRight className="text-xs" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-gray-300 px-3 py-2 text-sm font-bold text-gray-500"
            >
              Sin ficha
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function PlaceholderCover() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-gray-100 via-white to-gray-200">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100">
          <FaRegImage />
        </div>

        <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-red-700">
          Portada pendiente
        </p>
      </div>
    </div>
  );
}