import { useEffect, useState, useMemo } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Route,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
  ArrowRightLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import orderService from "../../services/orderService";
import hubService from "../../services/hubService";
import RevenueChart from "../../components/common/RevenueChart";
import { MONEY_FMT } from "../../constants/MONEY_FMT";
import StatCard from "../../components/dashboard/StatCard";
import formatDate from "../../components/utils/formatDate";

const QUICK_LINKS = [
  {
    key: "receive",
    label: "Nhận đơn từ khách",
    icon: Package,
    path: "/hub/receive-orders",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    key: "transfer-receiving",
    label: "Nhập kho trung chuyển",
    icon: Layers,
    path: "/hub/transfer-receiving",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    key: "transfer-create",
    label: "Tạo chuyến trung chuyển",
    icon: ArrowRightLeft,
    path: "/hub/transfer-create",
    color: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
  {
    key: "inventory",
    label: "Tồn kho Hub",
    icon: Layers,
    path: "/hub/inventory",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    key: "route-assignment",
    label: "Phân tuyến",
    icon: Route,
    path: "/hub/route-assignment",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    key: "route-monitoring",
    label: "Theo dõi tuyến",
    icon: Activity,
    path: "/hub/route-monitoring",
    color: "bg-red-50 text-red-600 border-red-100",
  },
];

const ORDER_STATUS_CARDS = [
  {
    key: "COLLECTED",
    label: "Vừa nhận từ khách",
    icon: CheckCircle2,
    accent: "bg-sky-50 text-sky-600",
  },
  {
    key: "IN_TRANSIT",
    label: "Đang trung chuyển",
    icon: TrendingUp,
    accent: "bg-amber-50 text-amber-600",
  },
  {
    key: "AT_HUB",
    label: "Tại Hub",
    icon: Layers,
    accent: "bg-blue-50 text-blue-600",
  },
  {
    key: "PICKING",
    label: "Shipper đang lấy",
    icon: Truck,
    accent: "bg-purple-50 text-purple-600",
  },
  {
    key: "DELIVERING",
    label: "Đang giao",
    icon: Activity,
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "COMPLETED",
    label: "Hoàn thành",
    icon: CheckCircle2,
    accent: "bg-green-50 text-green-600",
  },
  {
    key: "RETURNING",
    label: "Đang hoàn hàng",
    icon: AlertTriangle,
    accent: "bg-orange-50 text-orange-600",
  },
];

function StatusBadge({ status }) {
  const configs = {
    COLLECTED: { label: "Đã nhận", color: "bg-cyan-50 text-cyan-600" },
    IN_TRANSIT: { label: "Trung chuyển", color: "bg-amber-50 text-amber-600" },
    AT_HUB: { label: "Tại Hub", color: "bg-blue-50 text-blue-600" },
    PICKING: { label: "Đang lấy", color: "bg-purple-50 text-purple-600" },
    DELIVERING: { label: "Đang giao", color: "bg-emerald-50 text-emerald-600" },
    COMPLETED: { label: "Hoàn thành", color: "bg-green-50 text-green-600" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-600" },
    RETURNING: { label: "Hoàn hàng", color: "bg-orange-50 text-orange-600" },
  };
  const config = configs[status] || {
    label: status,
    color: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export default function HubDashboard() {
  const [hubId, setHubId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState("all");
  const [chartView, setChartView] = useState("day");
  const [chartMonth, setChartMonth] = useState(new Date().getMonth() + 1);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [hubRevenue, setHubRevenue] = useState(null);
  const [monthlyChartData, setMonthlyChartData] = useState([]);

  const chartData = useMemo(() => {
    if (chartView === "month") {
      return monthlyChartData.map((m) => ({
        label: `${m.month}`,
        hubRevenue: Number(m.hubRevenue || 0),
        codAmount: Number(m.codAmount || 0),
      }));
    }
    return dailyRevenue;
  }, [monthlyChartData, dailyRevenue, chartView]);

  const fetchHub = async () => {
    const res = await hubService.getMyHub();
    const hub = res.data;

    const id = hub?.id || hub?.hubId || hub?.code;
    setHubId(id);
    return id;
  };

  const fetchAll = async (currentHubId) => {
    if (!currentHubId) return;

    try {
      setRefreshing(true);
      const [invRes, deliveryRes] = await Promise.all([
        orderService.getInventoryAtHub(currentHubId, { page: 0, size: 500 }),
        orderService.getDeliveryOrdersByHub(currentHubId),
      ]);
      const inventoryOrders = invRes.data?.content || [];
      const deliveryOrders = deliveryRes.data || [];
      setOrders([...inventoryOrders, ...deliveryOrders]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const id = await fetchHub();
      await fetchAll(id);
    };

    init();
  }, []);

  useEffect(() => {
    if (!hubId) return;
    orderService
      .getHubRevenueByFilter(hubId, filterDate)
      .then((res) => setHubRevenue(res.data))
      .catch(() => setHubRevenue(null));
  }, [hubId, filterDate]);

  useEffect(() => {
    if (!hubId || chartView === "month") return;
    orderService
      .getDailyRevenueByHub(hubId, chartMonth, chartYear)
      .then((res) => setDailyRevenue(res.data || []))
      .catch(() => setDailyRevenue([]));
  }, [hubId, chartMonth, chartYear, chartView]);

  useEffect(() => {
    if (!hubId || chartView === "day") return;
    orderService
      .getMonthlyRevenueForChart(hubId)
      .then((res) => setMonthlyChartData(res.data || []))
      .catch(() => setMonthlyChartData([]));
  }, [hubId, chartView]);

  const stats = {
    AT_HUB: orders.filter((o) => o.status === "AT_HUB").length,
    COLLECTED: orders.filter((o) => o.status === "COLLECTED").length,
    IN_TRANSIT: orders.filter((o) => o.status === "IN_TRANSIT").length,
    PICKING: orders.filter((o) => o.status === "PICKING").length,
    DELIVERING: orders.filter((o) => o.status === "DELIVERING").length,
    COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
    RETURNING: orders.filter((o) => o.status === "RETURNING").length,
    total: orders.length,
  };

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  return (
    <div className="flex-1 flex flex-col p-1 sm:p-2 md:p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tổng quan hoạt động ·{" "}
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>

        <button
          onClick={() => fetchAll(hubId)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
            <StatCard
              label="Tổng đơn hàng"
              value={stats.total}
              icon={<Package size={18} />}
              accent="bg-slate-100 text-slate-600"
            />
            {ORDER_STATUS_CARDS.map((status) => {
              const Icon = status.icon;
              return (
                <StatCard
                  key={status.key}
                  label={status.label}
                  value={stats[status.key]}
                  icon={<Icon size={18} />}
                  accent={status.accent}
                />
              );
            })}
          </div>

          {/* Revenue summary */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 md:px-5 py-3 sm:py-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-bold text-slate-700">
                  Doanh thu Hub
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {`${hubRevenue?.orderCount || 0} đơn đã giao · ${hubRevenue?.routeCount || 0} tuyến hoàn thành`}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {[
                  { key: "today", label: "Hôm nay" },
                  { key: "week", label: "7 ngày" },
                  { key: "month", label: "Tháng" },
                  { key: "all", label: "Tất cả" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterDate(f.key)}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                      ${
                        filterDate === f.key
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 break-words">
              {MONEY_FMT.format(hubRevenue?.hubRevenue || 0)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-emerald-600">
                Doanh thu Hub: {MONEY_FMT.format(hubRevenue?.hubRevenue || 0)}
              </span>
              <span className="text-orange-500">
                COD cần hoàn: {MONEY_FMT.format(hubRevenue?.codAmount || 0)}
              </span>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 md:px-5 py-3 sm:py-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="text-sm font-bold text-slate-700">
                Biểu đồ doanh thu
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {chartView === "day" && (
                  <>
                    <button
                      onClick={() => {
                        const prev = new Date(chartYear, chartMonth - 2, 1);
                        setChartMonth(prev.getMonth() + 1);
                        setChartYear(prev.getFullYear());
                      }}
                      className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                    >
                      ‹
                    </button>
                    <span className="text-xs font-semibold text-slate-600 min-w-[80px] text-center">
                      {chartMonth}/{chartYear}
                    </span>
                    <button
                      onClick={() => {
                        const next = new Date(chartYear, chartMonth, 1);
                        setChartMonth(next.getMonth() + 1);
                        setChartYear(next.getFullYear());
                      }}
                      className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                    >
                      ›
                    </button>
                  </>
                )}
                {[
                  { key: "day", label: "Ngày" },
                  { key: "month", label: "Tháng" },
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setChartView(v.key)}
                    className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                      chartView === v.key
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <RevenueChart data={chartData} view={chartView} />
          </div>

          {/* Quick links */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Tác vụ nhanh
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.key}
                    to={link.path}
                    className={`flex flex-col items-center gap-2 px-2 sm:px-3 py-3 sm:py-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${link.color}`}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-semibold text-center">
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-50 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-800">
                Đơn hàng gần đây
              </h2>
              <Link
                to="/hub/inventory"
                className="text-xs text-red-600 font-semibold flex items-center gap-1 hover:underline"
              >
                Xem tất cả <ChevronRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-5 py-3 text-left">Mã đơn</th>
                    <th className="px-5 py-3 text-left">Người gửi</th>
                    <th className="px-5 py-3 text-left">Người nhận</th>
                    <th className="px-5 py-3 text-left">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Thời gian</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-mono text-xs text-red-700 font-bold">
                        {o.id}
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-medium">
                        {o.senderName || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-medium">
                        {o.receiverName || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate-400">
                        <span className="flex items-center gap-1 justify-end">
                          <Clock size={11} />
                          {formatDate(o.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
