import { FaWhatsapp } from "react-icons/fa";

function buildWhatsappUrl(phoneNumber, message) {
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhoneNumber}?text=${encodedMessage}`;
}

export default function WhatsappFloatingButton() {
  const phoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER?.trim();

  if (!phoneNumber) {
    return null;
  }

  const message =
    "Hola Book Express, deseo recibir información sobre libros y materiales educativos.";

  const whatsappUrl = buildWhatsappUrl(phoneNumber, message);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir a Book Express por WhatsApp"
      title="Escribir por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-4xl text-white shadow-2xl shadow-green-950/30 ring-4 ring-white transition hover:-translate-y-1 hover:scale-105 hover:bg-green-700"
    >
      <FaWhatsapp />
    </a>
  );
}
