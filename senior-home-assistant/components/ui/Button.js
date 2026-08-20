const VARIANTS = {
  primary: "bg-blue-700 text-white hover:bg-blue-800",
  secondary: "bg-white text-blue-700 border-2 border-blue-700 hover:bg-blue-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
};

export default function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`btn inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
