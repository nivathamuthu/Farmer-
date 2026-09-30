import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/axios";
import ProductCard from "../../components/ProductCard";
import StatusBanner from "../../components/StatusBanner";

export default function ProductListing() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => {
        const names = [...new Set(data.map((product) => product.category))].sort();
        setCategories(names);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      api
        .get("/products", { params: { search, category } })
        .then(({ data }) => {
          setProducts(data);
          setError("");
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, category]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm uppercase tracking-[0.18em] text-[#d7e8c8]">Farm shop</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-[#f4f0e2] sm:text-5xl">Produce from nearby farms, ready for checkout.</h1>
        <p className="mt-3 text-[#efe6c9]/90">Search by name or filter by category. Only produce the admin has marked active is listed here. Cash on delivery.</p>
      </div>

      <div className="farm-login-card mb-6 grid gap-3 rounded-[1.75rem] p-4 sm:grid-cols-[1fr_220px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tomatoes, rice, ghee..."
          aria-label="Search products"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <StatusBanner message={error} />
      {loading ? <p className="text-sm text-ink/60">Loading produce...</p> : null}
      {!loading && !error && products.length === 0 ? (
        <div className="panel p-8 text-center">
          <h2 className="font-serif text-3xl">Nothing matches</h2>
          <p className="mt-2 text-sm text-ink/70">Try another name or clear the category filter.</p>
        </div>
      ) : null}
      <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
