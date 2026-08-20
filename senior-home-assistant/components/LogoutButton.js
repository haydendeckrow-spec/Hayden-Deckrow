export default function LogoutButton() {
  return (
    <form action="/logout" method="POST">
      <button
        type="submit"
        className="rounded-full border-2 border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
      >
        Log out
      </button>
    </form>
  );
}
