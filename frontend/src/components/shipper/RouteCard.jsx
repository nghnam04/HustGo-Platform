import {
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Package,
  Weight,
  Zap,
  Navigation,
} from "lucide-react";
import formatAddress from "../utils/formatAddress";

export default function RouteCard({ route, onAccept, accepting, onPreview }) {
  const totalAmount = route.orders.reduce(
    (s, o) => s + (o.finalAmountToCollect || 0),
    0,
  );
  const totalWeight = route.orders.reduce((s, o) => s + (o.weight || 0), 0);
  const codCount = route.orders.filter((o) => o.paymentMethod === "COD").length;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-200 transition-all">
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-50 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs sm:text-sm font-extrabold text-slate-900">
            {route.routeId}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin size={11} className="text-red-400" />
            {route.hubName}
          </div>
        </div>
        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 whitespace-nowrap">
          <Zap size={11} /> Cần shipper
        </span>
      </div>

      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-slate-50 bg-slate-50/40">
        {[
          {
            label: "Số đơn",
            value: `${route.orders.length} đơn`,
            icon: <Package size={13} className="text-slate-400 shrink-0" />,
          },
          {
            label: "Tổng KL",
            value: `${totalWeight.toFixed(1)} kg`,
            icon: <Weight size={13} className="text-slate-400 shrink-0" />,
          },
          {
            label: "Tổng thu hộ",
            value: `${totalAmount.toLocaleString("vi-VN")}đ`,
            icon: <DollarSign size={13} className="text-slate-400 shrink-0" />,
          },
        ].map((s) => (
          <div key={s.label} className="text-center min-w-0">
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-slate-400 mb-0.5">
              {s.icon}
              <span className="truncate">{s.label}</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 sm:px-5 py-3 max-h-40 overflow-y-auto bg-slate-50/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {route.orders.map((o, i) => (
            <div
              key={o.id}
              className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5 border border-slate-100 shadow-sm"
            >
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-red-700 font-semibold truncate">
                  {o.id}
                </div>
                <div className="text-slate-400 truncate text-[10px] sm:text-xs">
                  {o.receiverPhone || ""}
                </div>
                <div className="text-slate-400 truncate text-[10px] sm:text-xs">
                  {formatAddress(
                    o.receiverAddress,
                    o.receiverWard,
                    o.receiverDistrict,
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-1 py-0.5 rounded border shrink-0 whitespace-nowrap
                ${o.paymentMethod === "COD" ? "text-orange-700 bg-orange-50 border-orange-200" : "text-sky-700 bg-sky-50 border-sky-200"}`}
              >
                {o.paymentMethod === "COD" ? "COD" : "Online"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 sm:px-5 sm:py-4 border-t border-slate-100 flex items-center gap-2">
        <button
          onClick={() => onPreview(route)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shrink-0 whitespace-nowrap"
        >
          <Navigation size={13} /> Xem tuyến
        </button>

        <button
          onClick={() => onAccept(route)}
          disabled={accepting === route.routeId}
          className="flex-1 py-2 sm:py-2.5 bg-red-600 text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {accepting === route.routeId ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          Nhận tuyến này
        </button>
      </div>
    </div>
  );
}
