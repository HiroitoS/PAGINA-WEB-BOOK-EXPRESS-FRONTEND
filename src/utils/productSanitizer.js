import { cleanText } from "./formatters";

function isInvalidGrade(value) {
  const text = cleanText(value);

  if (!text) {
    return true;
  }

  const invalidValues = ["68", "0", "-", "null", "undefined", "nan"];

  return invalidValues.includes(text.toLowerCase());
}

function buildBackendMediaUrl(path) {
  const value = cleanText(path);

  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const backendBaseUrl = apiBaseUrl.replace("/api", "");

  if (value.startsWith("/media/")) {
    return `${backendBaseUrl}${value}`;
  }

  if (value.startsWith("media/")) {
    return `${backendBaseUrl}/${value}`;
  }

  return value;
}

export function getProductName(product) {
  return cleanText(product?.name) || "Producto sin nombre";
}

export function getProductProvider(product) {
  const provider = product?.provider;

  const providerName =
    cleanText(product?.provider_name) ||
    cleanText(provider?.name) ||
    cleanText(provider?.nombre) ||
    cleanText(product?.provider_detail?.name) ||
    cleanText(product?.provider_detail?.nombre);

  return providerName || "";
}

export function getProductSlug(product) {
  return cleanText(product?.slug);
}

export function getProductCover(product) {
  return buildBackendMediaUrl(product?.cover_image);
}

export function getProductLevel(product) {
  return cleanText(product?.level_name) || cleanText(product?.level?.name);
}

export function getProductGrade(product) {
  const grade = cleanText(product?.grade_name) || cleanText(product?.grade?.name);

  if (isInvalidGrade(grade)) {
    return "";
  }

  return grade;
}

export function getProductArea(product) {
  return cleanText(product?.area_name) || cleanText(product?.area?.name);
}

export function getProductSeries(product) {
  return cleanText(product?.series_name) || cleanText(product?.series?.name);
}

export function getProductType(product) {
  return cleanText(product?.product_type_name) || cleanText(product?.product_type?.name);
}

export function getProductDescription(product) {
  return cleanText(product?.description);
}

export function getLatestPrice(product) {
  return product?.latest_price || null;
}

export function isProductAvailable(product) {
  const latestPrice = getLatestPrice(product);
  const value = cleanText(latestPrice?.availability).toLowerCase();

  if (!value) {
    return true;
  }

  return !["out_of_stock", "agotado", "no disponible", "inactivo"].includes(value);
}