import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage, imageSrc } from "../../api/axios";
import StatusBanner from "../../components/StatusBanner";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const empty = {
  name: "",
  category: "",
  farmer_name: "",
  description: "",
  price: "",
  stock_quantity: "0",
  image_url: "",
  is_active: true,
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    api
      .get("/admin/products")
      .then(({ data }) => {
        const product = data.find((item) => item.id === Number(id));
        if (!product) {
          setError("Product not found.");
          return;
        }
        setForm({
          name: product.name,
          category: product.category,
          farmer_name: product.farmer_name,
          description: product.description || "",
          price: String(product.price),
          stock_quantity: String(product.stock_quantity),
          image_url: product.image_url || "",
          is_active: product.is_active,
        });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function validate(values) {
    const next = {};
    if (!values.name.trim() || values.name.trim().length > 150) next.name = "Name is required (max 150 characters).";
    if (!values.category.trim() || values.category.trim().length > 80) next.category = "Category is required (max 80 characters).";
    if (!values.farmer_name.trim() || values.farmer_name.trim().length > 120) {
      next.farmer_name = "Farmer name is required (max 120 characters).";
    }
    const price = Number(values.price);
    if (!(price > 0)) next.price = "Price must be greater than 0.";
    const stock = Number(values.stock_quantity);
    if (!Number.isInteger(stock) || stock < 0) next.stock_quantity = "Stock must be 0 or more.";
    if (imageFile) {
      if (!ACCEPTED_TYPES.includes(imageFile.type)) next.image = "Upload a JPG, PNG, WEBP, or GIF image.";
      else if (imageFile.size > MAX_IMAGE_BYTES) next.image = "Image must be 5 MB or smaller.";
    }
    return next;
  }

  function chooseImage(event) {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : "";
    });
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setError("");
    try {
      let imageUrl = form.image_url.trim() || null;
      if (imageFile) {
        const body = new FormData();
        body.append("file", imageFile);
        const uploaded = await api.post("/admin/uploads", body);
        imageUrl = uploaded.data.image_url;
      }
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        farmer_name: form.farmer_name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
        image_url: imageUrl,
        is_active: form.is_active,
      };
      if (isEdit) await api.put(`/admin/products/${id}`, payload);
      else await api.post("/admin/products", payload);
      navigate("/admin/products");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="mx-auto max-w-3xl px-4 py-10 text-sm">Loading product...</p>;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
        <h1 className="font-serif text-4xl">{isEdit ? "Edit product" : "Add product"}</h1>
        <StatusBanner message={error} />
        {[
          ["name", "Name"],
          ["category", "Category"],
          ["farmer_name", "Farmer name"],
        ].map(([name, label]) => (
          <div key={name}>
            <label htmlFor={name}>{label}</label>
            <input id={name} name={name} value={form[name]} onChange={update} />
            {errors[name] ? <p className="mt-1 text-sm text-clay">{errors[name]}</p> : null}
          </div>
        ))}
        <div>
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows="4" value={form.description} onChange={update} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price">Price (INR)</label>
            <input id="price" name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={update} />
            {errors.price ? <p className="mt-1 text-sm text-clay">{errors.price}</p> : null}
          </div>
          <div>
            <label htmlFor="stock_quantity">Stock</label>
            <input id="stock_quantity" name="stock_quantity" type="number" min="0" step="1" value={form.stock_quantity} onChange={update} />
            {errors.stock_quantity ? <p className="mt-1 text-sm text-clay">{errors.stock_quantity}</p> : null}
          </div>
        </div>
        <div>
          <label htmlFor="image">Product image</label>
          <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} />
          {errors.image ? <p className="mt-1 text-sm text-clay">{errors.image}</p> : null}
          {previewUrl || form.image_url ? (
            <img
              src={previewUrl || imageSrc(form.image_url)}
              alt="Selected product"
              className="mt-3 h-36 w-36 rounded-2xl object-cover"
            />
          ) : (
            <p className="mt-2 text-sm text-ink/60">JPG, PNG, WEBP, or GIF, up to 5 MB.</p>
          )}
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={update} className="h-4 w-4" />
          Active for customers
        </label>
        <div className="flex gap-3">
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save product"}
          </button>
          <Link to="/admin/products" className="btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
