import { Link, useLocation } from "react-router-dom";
import { formatINR } from "../../api/axios";

export default function OrderSuccess() {
  const order = useLocation().state?.order;

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="panel p-8">
        <p className="text-sm uppercase tracking-[0.16em] text-leaf">Order placed</p>
        <h1 className="mt-2 font-serif text-4xl">Thank you{order ? `, ${order.customer_name}` : ""}.</h1>
        <p className="mt-3 text-ink/70">
          {order
            ? `Order #${order.id} is confirmed for cash on delivery. Total ${formatINR(order.total_amount)}.`
            : "Your order was placed. Stock has been reserved and the cart is clear."}
        </p>
        {order ? (
          <ul className="mt-6 space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.product_name} × {item.quantity}
                </span>
                <span>{formatINR(item.line_total)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <Link to="/" className="btn-primary mt-6">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
