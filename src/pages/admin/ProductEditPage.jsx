import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaBook,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaCoins,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaImage,
  FaInfoCircle,
  FaLayerGroup,
  FaPen,
  FaPlus,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import {
  createAdminPrice,
  getAdminAreas,
  getAdminGrades,
  getAdminLevels,
  getAdminPrices,
  getAdminProductById,
  getAdminProductTypes,
  getAdminProviders,
  getAdminSeries,
  updateAdminPrice,
  updateAdminProduct,
} from "../../api/adminApi";
import { getDisplayName, getResults } from "../../utils/formatters";

function getRelationId(value) {
  if (!value) return "";

  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return String(value.id || "");
}

function getInitialForm(product) {
  return {
    name: product.name || "",
    sku: product.sku || "",
    code: product.code || "",
    provider: getRelationId(product.provider),
    level: getRelationId(product.level),
    grade: getRelationId(product.grade),
    area: getRelationId(product.area),
    series: getRelationId(product.series),
    product_type: getRelationId(product.product_type),
    description: product.description || "",
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
  };
}

function normalizeNullableId(value) {
  return value ? Number(value) : null;
}

function appendFormValue(formData, key, value) {
  if (value === null || value === undefined) {
    formData.append(key, "");
    return;
  }

  formData.append(key, value);
}

function buildBackendMediaUrl(path) {
  if (!path) return "";

  if (String(path).startsWith("http://") || String(path).startsWith("https://")) {
    return path;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const backendBaseUrl = apiBaseUrl.replace("/api", "");

  if (String(path).startsWith("/media/")) {
    return `${backendBaseUrl}${path}`;
  }

  if (String(path).startsWith("media/")) {
    return `${backendBaseUrl}/${path}`;
  }

  return path;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Consultar";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Consultar";
  }

  return `S/ ${number.toFixed(2)}`;
}

function getPriceValue(price) {
  return price.price || price.reference_price || price.precio || "";
}

function getShowPriceValue(price) {
  if (price.show_price === undefined || price.show_price === null) {
    return true;
  }

  return Boolean(price.show_price);
}

function getAvailabilityLabel(value) {
  const labels = {
    available: "Disponible",
    limited: "Stock limitado",
    out_of_stock: "Agotado",
    preorder: "Bajo pedido",
  };

  return labels[value] || value || "-";
}

function getAvailabilityClass(value) {
  if (value === "available") return "bg-green-50 text-green-700 ring-green-100";
  if (value === "limited") return "bg-yellow-50 text-yellow-700 ring-yellow-100";
  if (value === "out_of_stock") return "bg-red-50 text-red-700 ring-red-100";

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function getFriendlyProductError(error) {
  const backendData = error?.response?.data;

  if (!backendData) {
    return "No se pudo actualizar el producto. Revisa los datos e intenta nuevamente.";
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

  return "No se pudo actualizar el producto. Revisa los campos ingresados.";
}

function getFriendlyPriceError(error) {
  const backendData = error?.response?.data;

  if (!backendData) {
    return "No se pudo guardar el precio. Revisa los datos e intenta nuevamente.";
  }

  if (backendData?.year) {
    return "El año del precio no es válido o ya existe un registro para esta campaña.";
  }

  if (backendData?.price) {
    return "El precio ingresado no es válido.";
  }

  if (backendData?.detail) {
    return String(backendData.detail);
  }

  return "No se pudo guardar el precio. Revisa los datos ingresados.";
}

function getEmptyEditPriceForm() {
  return {
    year: "",
    campaign: "",
    price: "",
    show_price: false,
    consult_price: true,
    availability: "available",
    is_active: true,
  };
}

export default function ProductEditPage() {
  const { id } = useParams();
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

  const [priceForm, setPriceForm] = useState({
    year: "2026",
    campaign: "",
    price: "",
    show_price: false,
    consult_price: true,
    availability: "available",
    is_active: true,
  });

  const [editPriceForm, setEditPriceForm] = useState(getEmptyEditPriceForm());

  const [productPrices, setProductPrices] = useState([]);
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [providers, setProviders] = useState([]);
  const [levels, setLevels] = useState([]);
  const [grades, setGrades] = useState([]);
  const [areas, setAreas] = useState([]);
  const [series, setSeries] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [updatingPriceId, setUpdatingPriceId] = useState(null);
  const [editingPriceId, setEditingPriceId] = useState(null);

  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [priceSuccessMessage, setPriceSuccessMessage] = useState("");

  const activePrices = productPrices.filter((price) => price.is_active).length;
  const visiblePrices = productPrices.filter(getShowPriceValue).length;
  const hasCover = Boolean(coverPreview);

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
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCoverImage(null);
      setError("Selecciona una imagen válida para la portada.");
      return;
    }

    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeSelectedCover() {
    setCoverImage(null);
    setCoverPreview("");

    const fileInput = document.getElementById("cover-image-input");

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function handlePriceChange(event) {
    const { name, value, type, checked } = event.target;

    setPriceForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "show_price") {
        next.consult_price = !checked;
      }

      if (name === "consult_price") {
        next.show_price = !checked;
      }

      return next;
    });
  }

  function handleEditPriceChange(event) {
    const { name, value, type, checked } = event.target;

    setEditPriceForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "show_price") {
        next.consult_price = !checked;
      }

      if (name === "consult_price") {
        next.show_price = !checked;
      }

      return next;
    });
  }

  function startEditPrice(price) {
    setEditingPriceId(price.id);
    setPriceError("");
    setPriceSuccessMessage("");

    setEditPriceForm({
      year: String(price.year || ""),
      campaign: price.campaign || "",
      price: getPriceValue(price) ? String(getPriceValue(price)) : "",
      show_price: getShowPriceValue(price),
      consult_price:
        price.consult_price === undefined || price.consult_price === null
          ? !getShowPriceValue(price)
          : Boolean(price.consult_price),
      availability: price.availability || "available",
      is_active: Boolean(price.is_active),
    });
  }

  function cancelEditPrice() {
    setEditingPriceId(null);
    setEditPriceForm(getEmptyEditPriceForm());
  }

  async function loadProductPrices() {
    setLoadingPrices(true);
    setPriceError("");

    try {
      const data = await getAdminPrices({
        product: id,
      });

      setProductPrices(getResults(data));
    } catch {
      setPriceError("No se pudieron cargar los precios del producto.");
    } finally {
      setLoadingPrices(false);
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

    appendFormValue(payload, "name", form.name.trim());
    appendFormValue(payload, "sku", form.sku.trim());
    appendFormValue(payload, "code", form.code.trim());
    appendFormValue(payload, "provider", normalizeNullableId(form.provider));
    appendFormValue(payload, "level", normalizeNullableId(form.level));
    appendFormValue(payload, "grade", normalizeNullableId(form.grade));
    appendFormValue(payload, "area", normalizeNullableId(form.area));
    appendFormValue(payload, "series", normalizeNullableId(form.series));
    appendFormValue(
      payload,
      "product_type",
      normalizeNullableId(form.product_type)
    );
    appendFormValue(payload, "description", form.description.trim());

    payload.append("is_active", form.is_active ? "true" : "false");
    payload.append("is_featured", form.is_featured ? "true" : "false");

    if (coverImage) {
      payload.append("cover_image", coverImage);
    }

    try {
      await updateAdminProduct(id, payload);
      setSuccessMessage("Producto actualizado correctamente.");

      setTimeout(() => {
        navigate("/admin/productos");
      }, 700);
    } catch (err) {
      setError(getFriendlyProductError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePrice(event) {
    event.preventDefault();

    if (!priceForm.year.trim()) {
      setPriceError("Ingresa el año del precio.");
      return;
    }

    if (priceForm.show_price && !priceForm.price) {
      setPriceError("Si marcas mostrar precio, ingresa un monto.");
      return;
    }

    setSavingPrice(true);
    setPriceError("");
    setPriceSuccessMessage("");

    const payload = {
      product: Number(id),
      year: Number(priceForm.year),
      campaign: priceForm.campaign.trim(),
      price: priceForm.price ? Number(priceForm.price) : null,
      show_price: priceForm.show_price,
      consult_price: priceForm.consult_price,
      availability: priceForm.availability,
      is_active: priceForm.is_active,
    };

    try {
      await createAdminPrice(payload);

      setPriceSuccessMessage("Precio registrado correctamente.");

      setPriceForm((prev) => ({
        ...prev,
        campaign: "",
        price: "",
        show_price: false,
        consult_price: true,
        availability: "available",
        is_active: true,
      }));

      await loadProductPrices();
    } catch (err) {
      setPriceError(getFriendlyPriceError(err));
    } finally {
      setSavingPrice(false);
    }
  }

  async function handleUpdatePrice(event) {
    event.preventDefault();

    if (!editPriceForm.year.trim()) {
      setPriceError("Ingresa el año del precio.");
      return;
    }

    if (editPriceForm.show_price && !editPriceForm.price) {
      setPriceError("Si marcas mostrar precio, ingresa un monto.");
      return;
    }

    setUpdatingPriceId(editingPriceId);
    setPriceError("");
    setPriceSuccessMessage("");

    const payload = {
      year: Number(editPriceForm.year),
      campaign: editPriceForm.campaign.trim(),
      price: editPriceForm.price ? Number(editPriceForm.price) : null,
      show_price: editPriceForm.show_price,
      consult_price: editPriceForm.consult_price,
      availability: editPriceForm.availability,
      is_active: editPriceForm.is_active,
    };

    try {
      const updated = await updateAdminPrice(editingPriceId, payload);

      setProductPrices((prev) =>
        prev.map((item) => (item.id === editingPriceId ? updated : item))
      );

      setPriceSuccessMessage("Precio actualizado correctamente.");
      cancelEditPrice();
    } catch (err) {
      setPriceError(getFriendlyPriceError(err));
    } finally {
      setUpdatingPriceId(null);
    }
  }

  async function handleTogglePriceActive(price) {
    const nextValue = !price.is_active;

    setUpdatingPriceId(price.id);
    setPriceError("");
    setPriceSuccessMessage("");

    try {
      const updated = await updateAdminPrice(price.id, {
        is_active: nextValue,
      });

      setProductPrices((prev) =>
        prev.map((item) => (item.id === price.id ? updated : item))
      );

      setPriceSuccessMessage("Estado del precio actualizado.");
    } catch {
      setPriceError("No se pudo actualizar el estado del precio.");
    } finally {
      setUpdatingPriceId(null);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          productData,
          providersData,
          levelsData,
          gradesData,
          areasData,
          seriesData,
          productTypesData,
        ] = await Promise.all([
          getAdminProductById(id),
          getAdminProviders(),
          getAdminLevels(),
          getAdminGrades(),
          getAdminAreas(),
          getAdminSeries(),
          getAdminProductTypes(),
        ]);

        if (!ignore) {
          setForm(getInitialForm(productData));
          setCoverPreview(buildBackendMediaUrl(productData.cover_image));
          setProviders(getResults(providersData));
          setLevels(getResults(levelsData));
          setGrades(getResults(gradesData));
          setAreas(getResults(areasData));
          setSeries(getResults(seriesData));
          setProductTypes(getResults(productTypesData));
        }
      } catch {
        if (!ignore) {
          setError("No se pudo cargar la información del producto.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let ignore = false;

    async function fetchPrices() {
      setLoadingPrices(true);
      setPriceError("");

      try {
        const data = await getAdminPrices({
          product: id,
        });

        if (!ignore) {
          setProductPrices(getResults(data));
        }
      } catch {
        if (!ignore) {
          setPriceError("No se pudieron cargar los precios del producto.");
        }
      } finally {
        if (!ignore) {
          setLoadingPrices(false);
        }
      }
    }

    fetchPrices();

    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-gray-600">Cargando producto...</p>
      </div>
    );
  }

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

            <h1 className="mt-2 text-3xl font-black">Editar producto</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Completa la información del producto, revisa su portada y
              administra precios por campaña.
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

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={FaBook}
          label="Estado del producto"
          value={form.is_active ? "Activo" : "Inactivo"}
          description="Controla si el producto puede mostrarse en catálogo"
          tone={form.is_active ? "green" : "red"}
        />

        <SummaryCard
          icon={FaImage}
          label="Portada"
          value={hasCover ? "Cargada" : "Pendiente"}
          description="La portada mejora la presentación pública"
          tone={hasCover ? "green" : "yellow"}
        />

        <SummaryCard
          icon={FaCoins}
          label="Precios"
          value={productPrices.length}
          description={`${activePrices} activo(s), ${visiblePrices} visible(s)`}
          tone="dark"
        />
      </section>

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
            description="Actualiza el nombre, SKU y código del producto."
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
            description="Puedes reemplazar la portada actual o dejarla pendiente."
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <label
                htmlFor="cover-image-input"
                className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition hover:border-red-200 hover:bg-red-50"
              >
                <FaCloudUploadAlt className="text-4xl text-red-700" />

                <p className="mt-3 text-sm font-black text-gray-950">
                  Seleccionar nueva portada
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
                Portada actual / vista previa
              </p>

              {!coverPreview && (
                <div className="mt-4 flex min-h-44 items-center justify-center rounded-2xl bg-white text-center text-sm text-gray-500 ring-1 ring-gray-100">
                  Este producto aún no tiene portada.
                </div>
              )}

              {coverPreview && (
                <div className="mt-4 flex items-start gap-4">
                  <img
                    src={coverPreview}
                    alt="Portada actual del producto"
                    className="h-44 w-32 rounded-2xl object-cover shadow-sm ring-1 ring-gray-200"
                  />

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {coverImage ? "Nueva imagen seleccionada" : "Portada actual"}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Si seleccionas una nueva imagen y guardas, reemplazará la
                      portada actual del producto.
                    </p>

                    {coverImage && (
                      <button
                        type="button"
                        onClick={removeSelectedCover}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                      >
                        <FaTimes className="text-xs" />
                        Quitar imagen seleccionada
                      </button>
                    )}
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
            description="Mantén la editorial y clasificación para que el producto sea fácil de encontrar."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <SelectField
              label="Editorial *"
              name="provider"
              value={form.provider}
              onChange={handleChange}
              options={providers}
            />

            <SelectField
              label="Nivel"
              name="level"
              value={form.level}
              onChange={handleChange}
              options={levels}
            />

            <SelectField
              label="Grado"
              name="grade"
              value={form.grade}
              onChange={handleChange}
              options={grades}
            />

            <SelectField
              label="Área"
              name="area"
              value={form.area}
              onChange={handleChange}
              options={areas}
            />

            <SelectField
              label="Serie"
              name="series"
              value={form.series}
              onChange={handleChange}
              options={series}
            />

            <SelectField
              label="Tipo de producto"
              name="product_type"
              value={form.product_type}
              onChange={handleChange}
              options={productTypes}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={FaInfoCircle}
            label="Detalle comercial"
            title="Descripción y estado"
            description="Agrega información útil para la ficha pública y define si el producto estará visible."
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
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FaSave />
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>

      <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle
          icon={FaCoins}
          label="Precios"
          title="Precios por campaña"
          description="Registra o actualiza los precios de este producto por año."
        />

        {priceError && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>{priceError}</span>
          </div>
        )}

        {priceSuccessMessage && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            <FaCheckCircle className="mt-0.5 shrink-0" />
            <span>{priceSuccessMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleCreatePrice}
          className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-5"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-red-700 ring-1 ring-gray-200">
              <FaPlus />
            </div>

            <div>
              <h3 className="font-black text-gray-950">Agregar precio</h3>
              <p className="mt-1 text-xs text-gray-500">
                Úsalo para registrar precio 2026, 2027 o campañas futuras.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <TextField
              label="Año *"
              type="number"
              name="year"
              value={priceForm.year}
              onChange={handlePriceChange}
              placeholder="2026"
            />

            <TextField
              label="Campaña"
              name="campaign"
              value={priceForm.campaign}
              onChange={handlePriceChange}
              placeholder="Ejemplo: Campaña escolar 2026"
            />

            <TextField
              label="Precio referencial"
              type="number"
              step="0.01"
              name="price"
              value={priceForm.price}
              onChange={handlePriceChange}
              placeholder="Ejemplo: 85.00"
            />

            <AvailabilityField
              value={priceForm.availability}
              onChange={handlePriceChange}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <CheckCard
              name="show_price"
              checked={priceForm.show_price}
              onChange={handlePriceChange}
              title="Mostrar precio"
              description="La web podrá mostrar el precio referencial."
            />

            <CheckCard
              name="consult_price"
              checked={priceForm.consult_price}
              onChange={handlePriceChange}
              title="Consultar precio"
              description="La web mostrará “Consultar precio”."
            />

            <CheckCard
              name="is_active"
              checked={priceForm.is_active}
              onChange={handlePriceChange}
              title="Precio activo"
              description="Solo los precios activos se consideran vigentes."
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={savingPrice}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FaSave />
              {savingPrice ? "Registrando..." : "Registrar precio"}
            </button>
          </div>
        </form>

        {editingPriceId && (
          <form
            onSubmit={handleUpdatePrice}
            className="mt-6 rounded-3xl border border-yellow-200 bg-yellow-50 p-5"
          >
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-yellow-700 ring-1 ring-yellow-100">
                  <FaPen />
                  Editando precio
                </div>

                <h3 className="mt-2 font-black text-gray-950">
                  Modificar precio seleccionado
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Actualiza año, campaña, monto, visibilidad o disponibilidad.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEditPrice}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
              >
                <FaTimes className="text-xs" />
                Cancelar edición
              </button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Año *"
                type="number"
                name="year"
                value={editPriceForm.year}
                onChange={handleEditPriceChange}
              />

              <TextField
                label="Campaña"
                name="campaign"
                value={editPriceForm.campaign}
                onChange={handleEditPriceChange}
              />

              <TextField
                label="Precio referencial"
                type="number"
                step="0.01"
                name="price"
                value={editPriceForm.price}
                onChange={handleEditPriceChange}
              />

              <AvailabilityField
                value={editPriceForm.availability}
                onChange={handleEditPriceChange}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <CheckCard
                name="show_price"
                checked={editPriceForm.show_price}
                onChange={handleEditPriceChange}
                title="Mostrar precio"
                description="La web podrá mostrar el precio referencial."
              />

              <CheckCard
                name="consult_price"
                checked={editPriceForm.consult_price}
                onChange={handleEditPriceChange}
                title="Consultar precio"
                description="La web mostrará “Consultar precio”."
              />

              <CheckCard
                name="is_active"
                checked={editPriceForm.is_active}
                onChange={handleEditPriceChange}
                title="Precio activo"
                description="Solo los precios activos se consideran vigentes."
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={updatingPriceId === editingPriceId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FaSave />
                {updatingPriceId === editingPriceId
                  ? "Guardando..."
                  : "Guardar precio"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 md:flex-row md:items-center">
            <div>
              <h3 className="font-black text-gray-950">
                Historial de precios del producto
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                {productPrices.length} precio(s) registrado(s).
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill label="Activos" value={activePrices} />
              <StatusPill label="Visibles" value={visiblePrices} tone="blue" />
            </div>
          </div>

          {loadingPrices && (
            <div className="p-8 text-center text-gray-600">
              Cargando precios del producto...
            </div>
          )}

          {!loadingPrices && productPrices.length === 0 && (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
                <FaCoins />
              </div>

              <p className="mt-4 font-black text-gray-950">
                Este producto aún no tiene precios registrados.
              </p>

              <p className="mt-2 text-sm text-gray-600">
                Agrega un precio para 2026, 2027 o futuras campañas.
              </p>
            </div>
          )}

          {!loadingPrices && productPrices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-white">
                  <tr>
                    <TableHead>Año</TableHead>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Visibilidad</TableHead>
                    <TableHead>Disponibilidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {productPrices.map((price) => (
                    <tr key={price.id} className="transition hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                          {price.year}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {price.campaign || "-"}
                      </td>

                      <td className="px-5 py-4 font-black text-gray-950">
                        {formatPrice(getPriceValue(price))}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            getShowPriceValue(price)
                              ? "inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                              : "inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700 ring-1 ring-yellow-100"
                          }
                        >
                          {getShowPriceValue(price) ? <FaEye /> : <FaEyeSlash />}
                          {getShowPriceValue(price)
                            ? "Mostrar precio"
                            : "Consultar precio"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getAvailabilityClass(
                            price.availability
                          )}`}
                        >
                          {getAvailabilityLabel(price.availability)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            price.is_active
                              ? "inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                              : "inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100"
                          }
                        >
                          {price.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex min-w-32 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => startEditPrice(price)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                          >
                            <FaPen className="text-xs" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePriceActive(price)}
                            disabled={updatingPriceId === price.id}
                            className={
                              price.is_active
                                ? "rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                                : "rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-70"
                            }
                          >
                            {updatingPriceId === price.id
                              ? "Actualizando..."
                              : price.is_active
                                ? "Desactivar"
                                : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
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

function SummaryCard({ icon: Icon, label, value, description, tone }) {
  const styles = {
    dark: "border-gray-800 bg-gray-950 text-white",
    green: "border-green-100 bg-green-50 text-green-700",
    yellow: "border-yellow-100 bg-yellow-50 text-yellow-700",
    red: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        styles[tone] || styles.dark
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold opacity-80">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-gray-950 ring-1 ring-white/60">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  type = "text",
  step,
  name,
  value,
  onChange,
  placeholder,
  helper,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        type={type}
        step={step}
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

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
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

function AvailabilityField({ value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        Disponibilidad
      </label>

      <select
        name="availability"
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
      >
        <option value="available">Disponible</option>
        <option value="limited">Stock limitado</option>
        <option value="out_of_stock">Agotado</option>
        <option value="preorder">Bajo pedido</option>
      </select>
    </div>
  );
}

function CheckCard({ name, checked, onChange, title, description }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:bg-gray-100">
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

function StatusPill({ label, value, tone = "green" }) {
  const styles = {
    green: "bg-green-50 text-green-700 ring-green-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        styles[tone] || styles.green
      }`}
    >
      {label}: {value}
    </span>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}