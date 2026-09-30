import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage, formatINR, imageSrc } from "../../api/axios";
import StatusBanner from "../../components/StatusBanner";
import { useCart } from "../../context/CartContext";

export default function Cart() {
  const { cart, refresh } = useCart();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function changeQuantity(item, quantity) {
    setBusyId(item.product_id);
    setError("");
    try {
      await api.put(`/cart/items/${item.product_id}`, { quantity });
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item) {
    setBusyId(item.product_id);
    setError("");
    try {
      await api.delete(`/cart/items/${item.product_id}`);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-serif text-4xl">Your cart</h1>
      <div className="mt-4">
        <StatusBanner message={error} />
      </div>
      {cart.items.length === 0 ? (
        <div className="panel mt-6 p-8">
          <p>Your cart is empty.</p>
          <Link to="/" className="btn-primary mt-4">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {cart.items.map((item) => {
            const atStock = item.quantity >= item.stock_quantity;
            return (
              <article key={item.product_id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-moss sm:h-28 sm:w-28">
                  {item.image_url ? <img src={imageSrc(item.image_url)} alt="" className="h-full w-full object-cover object-center" /> : null}
                </div>
                <div className="flex-1">
                  <h2 className="font-serif text-2xl">{item.name}</h2>
                  <p className="text-sm text-ink/70">
                    {item.farmer_name} · {formatINR(item.price)} each
                  </p>
                  <p className="text-xs text-ink/60">{item.stock_quantity} in stock</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost h-10 w-10 px-0"
                    disabled={busyId === item.product_id || item.quantity <= 1}
                    onClick={() => changeQuantity(item, item.quantity - 1)}
                    aria-label={`Decrease ${item.name}`}
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    className="btn-ghost h-10 w-10 px-0"
                    disabled={busyId === item.product_id || atStock}
                    onClick={() => changeQuantity(item, item.quantity + 1)}
                    aria-label={`Increase ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatINR(item.line_total)}</p>
                  <div className="mt-2 flex flex-col items-end gap-2">
                    <Link to={`/checkout?item=${item.product_id}`} className="btn-primary">
                      Order now
                    </Link>
                    <button type="button" className="text-sm text-clay underline" onClick={() => remove(item)}>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-ink/60">Grand total</p>
              <p className="font-serif text-3xl">{formatINR(cart.grand_total)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/" className="btn-ghost">
                Continue shopping
              </Link>
              <Link to="/checkout" className="btn-primary">
                Order now
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
