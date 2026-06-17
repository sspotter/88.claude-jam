import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function NotFound() {
  const error = useRouteError();

  const is404 =
    isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] px-6 text-center gap-6">
      <div className="w-20 h-20 rounded-full overflow-hidden border border-stone-200 shadow-md">
        <img src="/logo.jpeg" alt="Jamhawi" className="w-full h-full object-cover" />
      </div>

      <h1 className="text-7xl font-serif text-[var(--color-primary)] font-bold">
        {is404 ? "404" : "Oops"}
      </h1>

      <p className="text-stone-500 text-lg max-w-sm">
        {is404
          ? "This page doesn't exist."
          : "Something went wrong. Please try again."}
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          to="/"
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-full font-medium hover:bg-[var(--color-accent)] transition-colors"
        >
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-stone-100 text-stone-700 rounded-full font-medium hover:bg-stone-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
