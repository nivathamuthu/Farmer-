import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage, formatINR, imageSrc } from "../../api/axios";
import StatusBanner from "../../components/StatusBanner";
import { useCart } from "../../context/CartContext";

export default function ProductDetails() {
  const { id } = useParams();
  const { cart, refresh } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    setNotice("");
    setImageOk(true);
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        setProduct(data);
        setError("");
      })
      .catch((err) => {
        setProduct(null);
        setError(errorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function addToCart(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      await api.post("/cart/items", { product_id: product.id, quantity: Number(quantity) });
      await refresh();
      setNotice("Added to cart.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function changeQuantity(next) {
    const held = cart.items.find((item) => item.product_id === product?.id)?.quantity || 0;
    const stock = Math.max(0, (product?.stock_quantity || 0) - held);
    if (stock < 1) return;
    const value = Math.min(stock, Math.max(1, next));
    setQuantity(value);
  }

  if (loading) return <p className="mx-auto max-w-6xl px-5 py-10 text-sm text-ink/60">Loading product...</p>;
  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <StatusBanner message={error || "Product not found"} />
        <Link to="/" className="mt-4 inline-block text-sm text-leaf underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const held = cart.items.find((item) => item.product_id === product.id)?.quantity || 0;
  const left = Math.max(0, product.stock_quantity - held);
  const outOfStock = left < 1;
  const atMax = Number(quantity) >= left;

  return (
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <Link to="/" className="text-sm font-medium text-leaf">
        ← Back to shop
      </Link>
      <div className="mt-5 grid items-stretch gap-6 md:grid-cols-[1.05fr_0.95fr]">
        <div className="product-frame">
          {product.image_url && imageOk ? (
            <img src={imageSrc(product.image_url)} alt={product.name} onError={() => setImageOk(false)} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#3d4a34]">No photo yet</div>
          )}
        </div>
        <div className="panel p-6 sm:p-8">
          <p className="inline-flex rounded-full bg-moss px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-leaf">
            {product.category}
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-2 text-ink/70">Grown by {product.farmer_name}</p>
          <p className="mt-5 font-serif text-3xl">{formatINR(product.price)}</p>
          <p className="mt-4 max-w-prose leading-relaxed text-ink/80">{product.description}</p>
          <p className={`mt-4 text-sm ${outOfStock ? "text-clay" : "text-ink/60"}`}>
            {outOfStock ? "No stock" : `${left} available · cash on delivery`}
          </p>
          <form onSubmit={addToCart} className="mt-6 space-y-4">
            <div>
              <label htmlFor="qty">Quantity</label>
              <div className="mt-1 flex w-fit items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost h-10 w-10 px-0"
                  disabled={outOfStock || Number(quantity) <= 1}
                  onClick={() => changeQuantity(Number(quantity) - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  id="qty"
                  type="number"
                  min="1"
                  max={left || 1}
                  value={quantity}
                  disabled={outOfStock}
                  onChange={(event) => changeQuantity(Number(event.target.value))}
                  className="w-16 text-center"
                />
                <button
                  type="button"
                  className="btn-ghost h-10 w-10 px-0"
                  disabled={outOfStock || atMax}
                  onClick={() => changeQuantity(Number(quantity) + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
            <button className="btn-primary w-full py-3" type="submit" disabled={saving || outOfStock}>
              {saving ? "Adding..." : "Add to cart"}
            </button>
          </form>
          <div className="mt-4 space-y-3">
            <StatusBanner message={error} />
            <StatusBanner message={notice} tone="ok" />
          </div>
        </div>
      </div>
    </section>
  );
}
