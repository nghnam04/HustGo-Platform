export default function StatCardv2({
  label,
  value,
  icon,
  sub,
  accent,
  onClick,
}) {
  const displayValue =
    value !== undefined && value !== null && value !== "" ? value : 0;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 md:px-5 py-3 sm:py-4 md:py-5 ${
        onClick
          ? "cursor-pointer hover:shadow-md hover:border-red-200 transition-all"
          : ""
      }`}
    >
      <div
        className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${accent}`}
      >
        {icon}
      </div>
      <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
        {typeof displayValue === "number"
          ? displayValue.toLocaleString("vi-VN")
          : displayValue}
      </div>
      <div className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
        {label}
      </div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
