export default function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-4 sm:px-5 sm:py-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${accent}`}>{icon}</div>
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
        {value ?? "—"}
      </div>
      <div className="text-sm font-medium text-slate-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
