import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], grand_total: 0 });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await api.get("/cart");
    setCart(data);
    setReady(true);
    return data;
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const value = useMemo(() => ({ cart, count, ready, refresh, setCart }), [cart, count, ready, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
