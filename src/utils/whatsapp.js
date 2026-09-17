import {
  getProductArea,
  getProductGrade,
  getProductName,
  getProductProvider,
  getProductSeries,
} from "./productSanitizer";

export function buildProductWhatsappMessage(product) {
  const name = getProductName(product);
  const provider = getProductProvider(product);
  const series = getProductSeries(product);
  const grade = getProductGrade(product);
  const area = getProductArea(product);

  const details = [
    "Hola Book Express, deseo consultar por este producto:",
    "",
    `Producto: ${name}`,
  ];

  if (provider) {
    details.push(`Editorial: ${provider}`);
  }

  if (series) {
    details.push(`Serie: ${series}`);
  }

  if (grade) {
    details.push(`Grado: ${grade}`);
  }

  if (area) {
    details.push(`Área: ${area}`);
  }

  details.push("");
  details.push("Quisiera saber disponibilidad y precio, por favor.");

  return details.join("\n");
}

export function buildWhatsappUrl(product) {
  const phone = import.meta.env.VITE_WHATSAPP_NUMBER;
  const message = buildProductWhatsappMessage(product);

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}