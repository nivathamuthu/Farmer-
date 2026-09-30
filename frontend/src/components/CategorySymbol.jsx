const paths = {
  vegetables: "M12 21c4-1 7-4.5 7-9 0-3-2-6-4-7-1 2-2 3-3 3s-2-1-3-3c-2 1-4 4-4 7 0 4.5 3 8 7 9zM12 8v4",
  fruits: "M12 20c4 0 7-3 7-7 0-5-4-8-7-9-3 1-7 4-7 9 0 4 3 7 7 7zM12 4c1-2 3-3 5-3",
  grains: "M12 21V9M8 17c-2-1-3-3-3-5 2 0 3 1 3 3M16 17c2-1 3-3 3-5-2 0-3 1-3 3M9 13c-2-1-3-3-3-4 2 0 3 1 3 2M15 13c2-1 3-3 3-4-2 0-3 1-3 2",
  dairy: "M8 3h8l-1 4v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7L8 3zM8 8h8",
  spices: "M12 3l1.6 4.2L18 9l-3.2 2.6L16 16l-4-2.4L8 16l1.2-4.4L6 9l4.4-1.8L12 3z",
  "flower seeds": "M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M4.9 6.5l2.2 1.6M16.9 15.9l2.2 1.6M4.9 17.5l2.2-1.6M16.9 8.1l2.2-1.6",
  "fruit seeds": "M8 14c0-4 2-7 4-9 2 2 4 5 4 9a4 4 0 0 1-8 0zM12 14v5",
};

export default function CategorySymbol({ category, className = "h-5 w-5" }) {
  const key = (category || "").toLowerCase();
  const d = paths[key] || "M4 8h16l-1 11H5L4 8zM8 8V6a4 4 0 0 1 8 0v2";

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
