import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import api, { errorMessage, formatINR } from "../../api/axios";
import StatusBanner from "../../components/StatusBanner";
import { useCart } from "../../context/CartContext";

const emptyForm = { customer_name: "", phone: "", address: "" };

export default function Checkout() {
  const { cart, ready, refresh } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const onlyItemId = Number(params.get("item")) || null;
  const items = onlyItemId ? cart.items.filter((item) => item.product_id === onlyItemId) : cart.items;
  const total = items.reduce((sum, item) => sum + Number(item.line_total), 0);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!ready) {
    return <p className="mx-auto max-w-5xl px-4 py-10 text-sm">Loading cart...</p>;
  }

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  function validate(values) {
    const next = {};
    if (!values.customer_name.trim()) next.customer_name = "Name is required.";
    if (!/^\d{10}$/.test(values.phone.trim())) next.phone = "Enter a 10-digit phone number.";
    if (!values.address.trim()) next.address = "Address is required.";
    return next;
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/orders/checkout", {
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        ...(onlyItemId ? { product_id: onlyItemId } : {}),
      });
      await refresh();
      navigate("/order-success", { state: { order: data } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
        <h1 className="font-serif text-4xl">Order now</h1>
        <p className="text-sm text-ink/70">Cash on delivery. The total is confirmed by the server when the order is placed.</p>
        <StatusBanner message={error} />
        <div>
          <label htmlFor="customer_name">Name</label>
          <input id="customer_name" name="customer_name" value={form.customer_name} onChange={update} />
          {errors.customer_name ? <p className="mt-1 text-sm text-clay">{errors.customer_name}</p> : null}
        </div>
        <div>
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" inputMode="numeric" value={form.phone} onChange={update} placeholder="10 digits" />
          {errors.phone ? <p className="mt-1 text-sm text-clay">{errors.phone}</p> : null}
        </div>
        <div>
          <label htmlFor="address">Address</label>
          <textarea id="address" name="address" rows="4" value={form.address} onChange={update} />
          {errors.address ? <p className="mt-1 text-sm text-clay">{errors.address}</p> : null}
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Ordering..." : "Order now"}
        </button>
      </form>
      <aside className="panel h-fit p-6">
        <h2 className="font-serif text-2xl">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.product_id} className="flex justify-between gap-3">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatINR(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-sand pt-4 text-lg">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </p>
        <Link to="/cart" className="mt-4 inline-block text-sm underline">
          Edit cart
        </Link>
      </aside>
    </section>
  );
}
