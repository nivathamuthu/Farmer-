import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage, formatINR } from "../../api/axios";
import StatusBanner from "../../components/StatusBanner";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [stockDrafts, setStockDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/products");
      setProducts(data);
      setStockDrafts(Object.fromEntries(data.map((product) => [product.id, String(product.stock_quantity)])));
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(product) {
    setError("");
    try {
      await api.patch(`/admin/products/${product.id}/status`, { is_active: !product.is_active });
      setNotice(`${product.name} is now ${product.is_active ? "inactive" : "active"}.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveStock(product) {
    const value = Number(stockDrafts[product.id]);
    if (!Number.isInteger(value) || value < 0) {
      setError("Stock must be a whole number of 0 or more.");
      return;
    }
    setError("");
    try {
      await api.patch(`/admin/products/${product.id}/stock`, { stock_quantity: value });
      setNotice(`Stock updated for ${product.name}.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete ${product.name}? Past orders keep their snapshot.`)) return;
    setError("");
    try {
      await api.delete(`/admin/products/${product.id}`);
      setNotice(`${product.name} deleted.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Products</h1>
          <p className="text-sm text-ink/70">Active products are visible to customers. Inactive ones stay hidden.</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary">
          Add product
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        <StatusBanner message={error} />
        <StatusBanner message={notice} tone="ok" />
      </div>
      {loading ? <p className="mt-6 text-sm">Loading products...</p> : null}
      {!loading && products.length === 0 ? <p className="panel mt-6 p-6">No products yet.</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-y-3 text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-3">Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="bg-card shadow-card">
                <td className="rounded-l-2xl px-3 py-3">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-ink/60">
                    {product.category} · {product.farmer_name}
                  </p>
                </td>
                <td>{formatINR(product.price)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-20"
                      type="number"
                      min="0"
                      value={stockDrafts[product.id] ?? ""}
                      onChange={(event) =>
                        setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))
                      }
                      aria-label={`Stock for ${product.name}`}
                    />
                    <button type="button" className="btn-ghost" onClick={() => saveStock(product)}>
                      Save
                    </button>
                  </div>
                </td>
                <td>
                  <button type="button" className="btn-ghost" onClick={() => toggleStatus(product)}>
                    {product.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="rounded-r-2xl pr-3">
                  <div className="flex justify-end gap-2">
                    <Link to={`/admin/products/${product.id}/edit`} className="btn-ghost">
                      Edit
                    </Link>
                    <button type="button" className="btn-danger" onClick={() => remove(product)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
