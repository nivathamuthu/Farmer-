export default function StatusBanner({ message, tone = "error" }) {
  if (!message) return null;
  const styles = tone === "error" ? "bg-red-50 text-red-800 border-red-200" : "bg-moss text-leaf border-leaf/20";
  return <p className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>{message}</p>;
}
