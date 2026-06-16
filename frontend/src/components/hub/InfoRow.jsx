export default function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="text-slate-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-slate-800 break-words">
          {value || "—"}
        </div>
      </div>
    </div>
  );
}
