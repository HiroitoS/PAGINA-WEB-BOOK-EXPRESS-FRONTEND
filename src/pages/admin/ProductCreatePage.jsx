import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaBook,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaImage,
  FaInfoCircle,
  FaLayerGroup,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import {
  createAdminProduct,
  getAdminAreas,
  getAdminGrades,
  getAdminLevels,
  getAdminProductTypes,
  getAdminProviders,
  getAdminSeries,
} from "../../api/adminApi";
import { getDisplayName, getResults } from "../../utils/formatters";

function normalizeNullableId(value) {
  return value ? Number(value) : "";
}

function appendIfHasValue(formData, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    formData.append(key, value);
  }
}

function getFriendlyError(error) {
  const backendData = error?.response?.data;

  if (!backendData) {
    return "No se pudo crear el producto. Revisa los campos e intenta nuevamente.";
  }

  if (backendData?.name) {
    return "El nombre del producto no es válido o ya existe.";
  }

  if (backendData?.provider) {
    return "Selecciona una editorial válida.";
  }

  if (backendData?.cover_image) {
    return "La portada seleccionada no es válida. Usa una imagen JPG, PNG o WEBP.";
  }

  if (backendData?.detail) {
    return String(backendData.detail);
  }

  return "No se pudo crear el producto. Revisa los datos ingresados.";
}

export default function ProductCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    code: "",
    provider: "",
    level: "",
    grade: "",
    area: "",
    series: "",
    product_type: "",
    description: "",
    is_active: true,
    is_featured: false,
  });

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [providers, setProviders] = useState([]);
  const [levels, setLevels] = useState([]);
  const [grades, setGrades] = useState([]);
  const [areas, setAreas] = useState([]);
  const [series, setSeries] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setSuccessMessage("");

    if (!file) {
      setCoverImage(null);
      setCoverPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCoverImage(null);
      setCoverPreview("");
      setError("Selecciona una imagen válida para la portada.");
      return;
    }

    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeCoverImage() {
    setCoverImage(null);
    setCoverPreview("");

    const fileInput = document.getElementById("cover-image-input");

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Ingresa el nombre del producto.");
      return;
    }

    if (!form.provider) {
      setError("Selecciona la editorial del producto.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    const payload = new FormData();

    appendIfHasValue(payload, "name", form.name.trim());
    appendIfHasValue(payload, "sku", form.sku.trim());
    appendIfHasValue(payload, "code", form.code.trim());
    appendIfHasValue(payload, "provider", normalizeNullableId(form.provider));
    appendIfHasValue(payload, "level", normalizeNullableId(form.level));
    appendIfHasValue(payload, "grade", normalizeNullableId(form.grade));
    appendIfHasValue(payload, "area", normalizeNullableId(form.area));
    appendIfHasValue(payload, "series", normalizeNullableId(form.series));
    appendIfHasValue(
      payload,
      "product_type",
      normalizeNullableId(form.product_type)
    );
    appendIfHasValue(payload, "description", form.description.trim());

    payload.append("is_active", form.is_active ? "true" : "false");
    payload.append("is_featured", form.is_featured ? "true" : "false");

    if (coverImage) {
      payload.append("cover_image", coverImage);
    }

    try {
      await createAdminProduct(payload);
      setSuccessMessage("Producto creado correctamente.");

      setTimeout(() => {
        navigate("/admin/productos");
      }, 700);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchFilters() {
      setLoadingFilters(true);

      try {
        const [
          providersData,
          levelsData,
          gradesData,
          areasData,
          seriesData,
          productTypesData,
        ] = await Promise.all([
          getAdminProviders(),
          getAdminLevels(),
          getAdminGrades(),
          getAdminAreas(),
          getAdminSeries(),
          getAdminProductTypes(),
        ]);

        if (!ignore) {
          setProviders(getResults(providersData));
          setLevels(getResults(levelsData));
          setGrades(getResults(gradesData));
          setAreas(getResults(areasData));
          setSeries(getResults(seriesData));
          setProductTypes(getResults(productTypesData));
        }
      } catch {
        if (!ignore) {
          setError("No se pudieron cargar las opciones del formulario.");
        }
      } finally {
        if (!ignore) {
          setLoadingFilters(false);
        }
      }
    }

    fetchFilters();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Catálogo administrativo
            </p>

            <h1 className="mt-2 text-3xl font-black">Crear producto</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Registra un nuevo producto para el catálogo web de Book Express.
              Luego podrás agregar precios por campaña desde la edición del
              producto.
            </p>
          </div>

          <Link
            to="/admin/productos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            <FaArrowLeft className="text-xs" />
            Volver a productos
          </Link>
        </div>
      </motion.section>

      {loadingFilters && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-600 shadow-sm">
          Cargando opciones del formulario...
        </div>
      )}

      {error && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          <FaCheckCircle className="mt-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={FaBook}
            label="Información principal"
            title="Datos básicos del producto"
            description="Registra el nombre, código e identificación interna del producto."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextField
                label="Nombre del producto *"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ejemplo: Matemática 3 años"
              />
            </div>

            <TextField
              label="SKU"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="SKU interno o del proveedor"
            />

            <TextField
              label="Código / ISBN"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="Código, ISBN, EAN o código de barras"
              helper="Si usas lector de código de barras, ubica el cursor aquí y escanea."
            />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={FaImage}
            label="Portada"
            title="Imagen principal del producto"
            description="Puedes cargar una portada ahora o completarla después."
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <label
                htmlFor="cover-image-input"
                className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition hover:border-red-200 hover:bg-red-50"
              >
                <FaCloudUploadAlt className="text-4xl text-red-700" />

                <p className="mt-3 text-sm font-black text-gray-950">
                  Seleccionar portada
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Formatos recomendados: JPG, PNG o WEBP
                </p>

                <input
                  id="cover-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-black text-gray-950">
                Vista previa de portada
              </p>

              {!coverPreview && (
                <div className="mt-4 flex min-h-44 items-center justify-center rounded-2xl bg-white text-center text-sm text-gray-500 ring-1 ring-gray-100">
                  Aún no seleccionaste una imagen.
                </div>
              )}

              {coverPreview && (
                <div className="mt-4 flex items-start gap-4">
                  <img
                    src={coverPreview}
                    alt="Vista previa de portada"
                    className="h-44 w-32 rounded-2xl object-cover shadow-sm ring-1 ring-gray-200"
                  />

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Imagen seleccionada
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Esta imagen se usará como portada principal en el catálogo.
                    </p>

                    <button
                      type="button"
                      onClick={removeCoverImage}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                    >
                      <FaTimes className="text-xs" />
                      Quitar imagen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={FaLayerGroup}
            label="Clasificación"
            title="Organización del catálogo"
            description="Clasifica el producto para que sea fácil de encontrar en la web pública."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <SelectField
              label="Editorial *"
              name="provider"
              value={form.provider}
              onChange={handleChange}
              options={providers}
              disabled={loadingFilters}
            />

            <SelectField
              label="Nivel"
              name="level"
              value={form.level}
              onChange={handleChange}
              options={levels}
              disabled={loadingFilters}
            />

            <SelectField
              label="Grado"
              name="grade"
              value={form.grade}
              onChange={handleChange}
              options={grades}
              disabled={loadingFilters}
            />

            <SelectField
              label="Área"
              name="area"
              value={form.area}
              onChange={handleChange}
              options={areas}
              disabled={loadingFilters}
            />

            <SelectField
              label="Serie"
              name="series"
              value={form.series}
              onChange={handleChange}
              options={series}
              disabled={loadingFilters}
            />

            <SelectField
              label="Tipo de producto"
              name="product_type"
              value={form.product_type}
              onChange={handleChange}
              options={productTypes}
              disabled={loadingFilters}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={FaInfoCircle}
            label="Detalle comercial"
            title="Descripción y estado"
            description="Agrega información útil para la ficha del producto y define su publicación."
          />

          <div className="mt-5">
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Descripción
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
              placeholder="Describe el producto, contenido, componentes o información comercial importante."
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <CheckCard
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              title="Producto activo"
              description="Si está activo, podrá mostrarse en el catálogo público."
            />

            <CheckCard
              name="is_featured"
              checked={form.is_featured}
              onChange={handleChange}
              title="Producto destacado"
              description="Preparado para futuras secciones de productos recomendados."
            />
          </div>
        </section>

        <div className="sticky bottom-0 z-10 -mx-2 rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-xl shadow-gray-950/10 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/admin/productos"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving || loadingFilters}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FaSave />
              {saving ? "Guardando..." : "Crear producto"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ icon: Icon, label, title, description }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
        <Icon />
        {label}
      </div>

      <h2 className="mt-2 text-xl font-black text-gray-950">{title}</h2>

      <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function TextField({ label, name, value, onChange, placeholder, helper }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
        placeholder={placeholder}
      />

      {helper && (
        <p className="mt-1 text-xs leading-5 text-gray-500">{helper}</p>
      )}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, disabled }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
      >
        <option value="">Sin asignar</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {getDisplayName(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckCard({ name, checked, onChange, title, description }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4"
      />

      <span>
        <span className="block text-sm font-black text-gray-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}