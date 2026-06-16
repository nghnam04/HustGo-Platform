import { Truck } from "lucide-react";

const renderStatusBadgev3 = (status) => {
  switch (status) {
    case "DELIVERING":
      return (
        <span className="px-2 py-1 bg-pink-50 border border-pink-200 text-pink-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <Truck size={11} />
          Đang giao
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">
          {status}
        </span>
      );
  }
};

export default renderStatusBadgev3;
