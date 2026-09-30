import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../../api/axios";
import StatusBanner from "../../components/StatusBanner";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (isAuthenticated) return <Navigate to="/admin/products" replace />;

  async function submit(event) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/admin/products");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center px-4 py-12">
      <form
        onSubmit={submit}
        className="farm-login-card relative z-10 w-full max-w-md space-y-4 rounded-[1.75rem] p-7"
      >
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#3d6a32]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 21V10" strokeLinecap="round" />
            <path d="M12 13c-3-1-5-4-5-7 3 0 5 2 5 5" strokeLinecap="round" />
            <path d="M12 11c3-.5 5-3 6-6-3 .2-5 2-6 5" strokeLinecap="round" />
          </svg>
          Seed desk
        </p>
        <h1 className="font-serif text-4xl text-[#1c2a16]">Admin login</h1>
        <p className="text-sm text-[#3d4a34]">Manage products, stock, and which produce customers can see.</p>
        <StatusBanner message={error} />
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </div>
        <button className="btn w-full bg-[#3d6a32] text-white hover:bg-[#2f5226]" type="submit" disabled={saving}>
          {saving ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
