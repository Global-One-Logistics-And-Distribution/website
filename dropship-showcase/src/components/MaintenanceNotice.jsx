import { Link } from "react-router-dom";
import { Wrench, RefreshCcw } from "lucide-react";

export default function MaintenanceNotice({ title, message, homeLabel = "Back to Home" }) {
  return (
    <section className="container-pad py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{message}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900"
          >
            {homeLabel}
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    </section>
  );
}
