import { MONEY_FMT } from "../../constants/MONEY_FMT";

export default function HubRevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const hubRevenue =
    payload.find((p) => p.dataKey === "hubRevenue")?.value || 0;
  const codAmount = payload.find((p) => p.dataKey === "codAmount")?.value || 0;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-slate-700 mb-1">{label}</div>
      <div className="text-emerald-600">
        Doanh thu: {MONEY_FMT.format(hubRevenue)}
      </div>
      <div className="text-orange-500">
        COD hoàn: {MONEY_FMT.format(codAmount)}
      </div>
    </div>
  );
}
