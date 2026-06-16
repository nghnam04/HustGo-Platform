export const STATUS_MAP = {
  PENDING: {
    label: "Chờ xử lý",
    color: "text-slate-700 bg-amber-50 border-amber-200",
  },
  CREATED: {
    label: "Đã tạo",
    color: "text-slate-700 bg-blue-50 border-blue-200",
  },
  COLLECTED: {
    label: "Đã nhận",
    color: "text-slate-700 bg-cyan-50 border-cyan-200",
  },
  IN_TRANSIT: {
    label: "Trung chuyển",
    color: "text-slate-700 bg-amber-50 border-amber-200",
  },
  AT_HUB: {
    label: "Tại Hub",
    color: "text-slate-700 bg-purple-50 border-purple-200",
  },
  PICKING: {
    label: "Shipper đang lấy",
    color: "text-slate-700 bg-indigo-50 border-indigo-200",
  },
  DELIVERING: {
    label: "Đang giao",
    color: "text-slate-700 bg-emerald-50 border-emerald-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "text-slate-700 bg-green-50 border-green-200",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "text-slate-700 bg-red-50 border-red-200",
  },
};
