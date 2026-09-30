import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatINR, imageSrc } from "../api/axios";
import CategorySymbol from "./CategorySymbol";

export default function ProductCard({ product }) {
  const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const [imageOk, setImageOk] = useState(Boolean(product.image_url));

  useEffect(() => {
    setImageOk(Boolean(product.image_url));
  }, [product.image_url]);

  return (
    <Link
      to={`/products/${product.id}`}
      className="farm-login-card group flex h-full flex-col overflow-hidden rounded-[1.75rem]"
    >
      <div className="relative shrink-0 overflow-hidden bg-[#e7f0d8]">
        {product.image_url && imageOk ? (
          <img
            src={imageSrc(product.image_url)}
            alt={product.name}
            className="shop-photo transition duration-500 group-hover:scale-105"
            onError={() => setImageOk(false)}
          />
        ) : (
          <div className="shop-photo flex items-center justify-center text-leaf/70">
            <CategorySymbol category={product.category} className="h-16 w-16" />
          </div>
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-paper/95 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-clay">
          {product.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <h2 className="font-serif text-2xl leading-tight">{product.name}</h2>
        <p className="mt-1 text-sm text-ink/70">Grown by {product.farmer_name}</p>
        <div className="mt-4 flex items-end justify-between border-t border-sand/80 pt-3">
          <p className="text-lg font-medium">{formatINR(product.price)}</p>
          <p className={`text-xs ${lowStock ? "text-clay" : "text-ink/60"}`}>
            {product.stock_quantity === 0 ? "Out of stock" : lowStock ? `Only ${product.stock_quantity} left` : `${product.stock_quantity} in stock`}
          </p>
        </div>
      </div>
    </Link>
  );
}
