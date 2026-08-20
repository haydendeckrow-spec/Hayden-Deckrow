export function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block font-semibold text-slate-800">
      {children}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
      {...props}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
      {...props}
    />
  );
}

export function Select(props) {
  return (
    <select
      className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none bg-white"
      {...props}
    />
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-red-800 font-medium">{children}</p>;
}
