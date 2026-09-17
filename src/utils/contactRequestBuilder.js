import {
  getProductName,
  getProductProvider,
} from "./productSanitizer";

function getProductId(product) {
  return product?.id || null;
}

function getProviderId(product) {
  return (
    product?.provider?.id ||
    product?.provider_id ||
    product?.provider ||
    null
  );
}

export function buildWhatsappContactRequestPayload(product) {
  const productName = getProductName(product);
  const providerName = getProductProvider(product);
  const productId = getProductId(product);
  const providerId = getProviderId(product);

  const payload = {
    full_name: "Cliente catálogo web",
    phone: "No registrado",
    email: "",
    message: `Consulta por WhatsApp desde catálogo web. Producto: ${productName}. Editorial: ${providerName}.`,
    inquiry_type: "product",
    source: "catalog",
  };

  if (productId) {
    payload.product = productId;
  }

  if (providerId && typeof providerId !== "object") {
    payload.provider = providerId;
  }

  return payload;
}