import { useEffect, useMemo, useState } from "react";
import api, { errorMessage, formatINR } from "../../api/axios";
import StatusBanner from "../../components/StatusBanner";

const STATUS_OPTIONS = [
  { value: "ON_PROGRESS", label: "On progress" },
  { value: "DELIVERED", label: "Delivered" },
];

const STATUS_LABELS = {
  PLACED: "Placed",
  ON_PROGRESS: "On progress",
  DELIVERED: "Delivered",
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PLACED", label: "Placed" },
  { value: "ON_PROGRESS", label: "On progress" },
  { value: "DELIVERED", label: "Delivered" },
];

function placedOn(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function Customers() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    api
      .get("/admin/orders")
      .then(({ data }) => {
        setOrders(data);
        setError("");
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const counts = { ALL: orders.length, PLACED: 0, ON_PROGRESS: 0, DELIVERED: 0 };

    for (const order of orders) {
      const status = order.status || "PLACED";
      if (status in counts) {
        counts[status] += 1;
      }
    }

    return counts;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((order) => (order.status || "PLACED") === statusFilter);
  }, [orders, statusFilter]);

  async function setStatus(order, status) {
    setBusyId(order.id);
    setError("");
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/status`, { status });
      setOrders((current) => current.map((item) => (item.id === data.id ? data : item)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-serif text-4xl">Customers</h1>
      <p className="mt-1 text-sm text-ink/70">Name, phone, and delivery address from each checkout.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FILTER_OPTIONS.map((filter) => {
          const count = filter.value === "ALL" ? summary.ALL : summary[filter.value] || 0;
          const active = statusFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={active ? "panel border border-leaf/30 bg-leaf/10 p-4 text-left" : "panel p-4 text-left"}
            >
              <div className="text-xs uppercase tracking-[0.18em] text-ink/60">{filter.label}</div>
              <div className="mt-2 font-serif text-3xl text-ink">{count}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <StatusBanner message={error} />
      </div>
      {loading ? <p className="mt-6 text-sm">Loading customers...</p> : null}
      {!loading && !error && visibleOrders.length === 0 ? (
        <p className="panel mt-6 p-6">No customer orders match this filter.</p>
      ) : null}
      <div className="mt-6 space-y-4">
        {visibleOrders.map((order) => (
          <article key={order.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">{order.customer_name}</h2>
                <p className="mt-1 text-sm text-ink/70">{order.phone}</p>
                <p className="mt-1 max-w-xl whitespace-pre-line text-sm text-ink/80">{order.address}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">Order #{order.id}</p>
                <p className="text-ink/60">{placedOn(order.created_at)}</p>
                <p className="mt-1 font-medium">{STATUS_LABELS[order.status] || order.status}</p>
                <p className="mt-1 font-serif text-2xl">{formatINR(order.total_amount)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={order.status === option.value ? "btn-primary" : "btn-ghost"}
                  disabled={busyId === order.id}
                  onClick={() => setStatus(order, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <ul className="mt-4 divide-y divide-sand/80 border-t border-sand/80 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {item.product_name}
                    <span className="text-ink/60"> × {item.quantity}</span>
                  </span>
                  <span>{formatINR(item.line_total)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
