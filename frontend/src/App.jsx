import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Customers from "./pages/admin/Customers";
import Login from "./pages/admin/Login";
import ProductForm from "./pages/admin/ProductForm";
import ProductList from "./pages/admin/ProductList";
import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import OrderSuccess from "./pages/customer/OrderSuccess";
import ProductDetails from "./pages/customer/ProductDetails";
import ProductListing from "./pages/customer/ProductListing";

export default function App() {
  const path = useLocation().pathname;
  const onFarm = !(path.startsWith("/admin/") && path !== "/admin/login");

  return (
    <div className={onFarm ? "farm-scene min-h-screen" : "min-h-screen"}>
      {onFarm ? <div className="farm-veil" aria-hidden="true" /> : null}
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<ProductListing />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute>
                <ProductList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/new"
            element={
              <ProtectedRoute>
                <ProductForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/:id/edit"
            element={
              <ProtectedRoute>
                <ProductForm />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
