import { useEffect, useState, useMemo } from "react";
import {
  Package,
  Truck,
  Boxes,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
  Building2,
  Activity,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import orderService from "../../services/orderService";
import hubService from "../../services/hubService";
import authService from "../../services/authService";
import parseDatev2 from "../../components/utils/parseDatev2";
import StatCardv2 from "../../components/dashboard/StatCardv2";
import HubRevenueTooltip from "../../components/dashboard/HubRevenueTooltip";
import { MONEY_FMT } from "../../constants/MONEY_FMT";
import { DATE_FMT } from "../../constants/DATE_FMT";

function StatusBadge({ status }) {
  const configs = {
    PENDING: { label: "Chờ xử lý", color: "bg-slate-100 text-slate-600" },
    CREATED: { label: "Đã tạo", color: "bg-blue-50 text-blue-600" },
    COLLECTED: { label: "Đã nhận từ khách", color: "bg-cyan-50 text-cyan-600" },
    IN_TRANSIT: {
      label: "Đang trung chuyển",
      color: "bg-amber-50 text-amber-600",
    },
    AT_HUB: { label: "Tại Hub", color: "bg-purple-50 text-purple-600" },
    PICKING: {
      label: "Shipper đang lấy",
      color: "bg-indigo-50 text-indigo-600",
    },
    DELIVERING: { label: "Đang giao", color: "bg-emerald-50 text-emerald-600" },
    COMPLETED: { label: "Hoàn thành", color: "bg-green-50 text-green-600" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-600" },
    RETURNING: {
      label: "Đang hoàn hàng",
      color: "bg-orange-50 text-orange-600",
    },
  };
  const config = configs[status] || {
    label: status,
    color: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded ${config.color}`}
    >
      {config.label}
    </span>
  );
}

const STATUS_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#14b8a6",
  "#10b981",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [users, setUsers] = useState([]);

  const [filterType, setFilterType] = useState("month");
  const [chartMonth, setChartMonth] = useState(new Date().getMonth() + 1);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [hubRevenues, setHubRevenues] = useState([]);
  const [dailyRevenues, setDailyRevenues] = useState({});
  const [hubChartMonths, setHubChartMonths] = useState({});
  const [hubChartViews, setHubChartViews] = useState({});
  const [hubMonthlyData, setHubMonthlyData] = useState({});
  const [hubMonthlyChartData, setHubMonthlyChartData] = useState({});

  const [revenueFilter, setRevenueFilter] = useState("all");

  const [systemRevenueData, setSystemRevenueData] = useState(null);
  const [systemRevenueChart, setSystemRevenueChart] = useState([]);

  const [statusChartWidth, setStatusChartWidth] = useState(0);

  const [hubChartWidths, setHubChartWidths] = useState({});

  useEffect(() => {
    const updateWidth = () => {
      const statusCount = 11;
      if (window.innerWidth >= 1024) {
        setStatusChartWidth(0);
      } else {
        const minWidth = Math.max(statusCount * 60, 400);
        setStatusChartWidth(minWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!hubRevenues?.length) return;
    const calculateHubWidths = () => {
      if (window.innerWidth >= 1024) {
        setHubChartWidths({});
      } else {
        const widths = {};
        hubRevenues.forEach((hub) => {
          widths[hub.hubId] = 500;
        });
        setHubChartWidths(widths);
      }
    };
    calculateHubWidths();
  }, [hubRevenues]);

  const fetchAll = async () => {
    try {
      setRefreshing(true);

      const ordersRes = await orderService.getAllOrders({
        page: 0,
        size: 2000,
      });
      const ordersData = ordersRes.data?.content || ordersRes.data || [];
      setOrders(ordersData);

      const hubsRes = await hubService.getAllHubs({ pageNo: 0, pageSize: 100 });
      const hubsData =
        hubsRes.data?.content ||
        hubsRes.content ||
        hubsRes.data ||
        hubsRes ||
        [];
      setHubs(hubsData);

      const usersRes = await authService.getAllUsers({
        pageNo: 0,
        pageSize: 2000,
      });
      const usersData =
        usersRes.data?.content ||
        usersRes.content ||
        usersRes.data ||
        usersRes ||
        [];
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchSystemRevenue = async () => {
      try {
        const revRes =
          await orderService.getSystemRevenueByFilter(revenueFilter);
        setSystemRevenueData(revRes.data);
      } catch (e) {
        console.error("Error fetching system revenue:", e);
        setSystemRevenueData(null);
      }
    };
    fetchSystemRevenue();
  }, [revenueFilter]);

  useEffect(() => {
    const fetchSystemChart = async () => {
      try {
        const chartRes = await orderService.getSystemRevenueChart();
        setSystemRevenueChart(chartRes.data || []);
      } catch (e) {
        console.error("Error fetching system revenue chart:", e);
        setSystemRevenueChart([]);
      }
    };
    fetchSystemChart();
  }, []);

  useEffect(() => {
    const fetchHubRevenues = async () => {
      if (!hubs.length) return;

      let fetchMonth = chartMonth;
      let fetchYear = chartYear;

      if (
        revenueFilter === "today" ||
        revenueFilter === "week" ||
        revenueFilter === "all"
      ) {
        const now = new Date();
        fetchMonth = now.getMonth() + 1;
        fetchYear = now.getFullYear();
      }

      try {
        const revenues = [];
        const dailyData = {};
        const monthlyData = {};

        for (const hub of hubs) {
          try {
            const res = await orderService.getMonthlyRevenueByHub(
              hub.id,
              fetchMonth,
              fetchYear,
            );
            const data = res.data;
            if (data) {
              monthlyData[hub.id] = {
                hubRevenue: data.hubRevenue || 0,
                codAmount: data.codAmount || 0,
                orderCount: data.orderCount || 0,
              };

              if (data.hubRevenue > 0) {
                revenues.push({
                  hubId: hub.id,
                  hubName: hub.name || hub.code || `Hub ${hub.id}`,
                  hubRevenue: data.hubRevenue || 0,
                  orderCount: data.orderCount || 0,
                  codAmount: data.codAmount || 0,
                });

                try {
                  const dailyRes = await orderService.getDailyRevenueByHub(
                    hub.id,
                    fetchMonth,
                    fetchYear,
                  );
                  dailyData[hub.id] = (dailyRes.data || []).map((d) => ({
                    label: d.date
                      ? d.date.split("-").slice(1).join("/")
                      : d.dayOfMonth
                        ? `${d.dayOfMonth}/${d.month}`
                        : "",
                    hubRevenue: Number(d.hubRevenue || 0),
                    codAmount: Number(d.codAmount || 0),
                  }));
                } catch (e) {
                  dailyData[hub.id] = [];
                }
              }
            }
          } catch (e) {}
        }

        setHubRevenues(revenues.sort((a, b) => b.hubRevenue - a.hubRevenue));
        setDailyRevenues(dailyData);
        setHubMonthlyData(monthlyData);
      } catch (error) {
        console.error("Lỗi fetching hub revenues:", error);
      }
    };

    fetchHubRevenues();
  }, [hubs, chartMonth, chartYear, revenueFilter]);

  useEffect(() => {
    const fetchMonthlyCharts = async () => {
      if (!hubs.length) return;
      const chartData = {};
      for (const hub of hubs) {
        try {
          const res = await orderService.getMonthlyRevenueForChart(hub.id);
          chartData[hub.id] = (res.data || []).map((m) => ({
            label: `${m.month}/${m.year}`,
            hubRevenue: Number(m.hubRevenue || 0),
            codAmount: Number(m.codAmount || 0),
          }));
        } catch (e) {
          chartData[hub.id] = [];
        }
      }
      setHubMonthlyChartData(chartData);
    };
    fetchMonthlyCharts();
  }, [hubs]);

  const fetchHubDailyRevenue = async (hubId, month, year) => {
    try {
      const dailyRes = await orderService.getDailyRevenueByHub(
        hubId,
        month,
        year,
      );
      const data = (dailyRes.data || []).map((d) => ({
        label: d.date
          ? d.date.split("-").slice(1).join("/")
          : d.dayOfMonth
            ? `${d.dayOfMonth}/${d.month}`
            : "",
        hubRevenue: Number(d.hubRevenue || 0),
        codAmount: Number(d.codAmount || 0),
      }));
      setDailyRevenues((prev) => ({ ...prev, [hubId]: data }));
    } catch (e) {
      setDailyRevenues((prev) => ({ ...prev, [hubId]: [] }));
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];

    const now = new Date();
    const today = DATE_FMT.format(now);

    return orders.filter((o) => {
      const date = parseDatev2(o.updatedAt || o.createdAt);
      if (!date) return false;

      const dateStr = DATE_FMT.format(date);

      switch (filterType) {
        case "today":
          return dateStr === today;
        case "week":
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return date >= weekAgo;
        case "month":
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        default:
          return true;
      }
    });
  }, [orders, filterType]);

  const systemRevenue = useMemo(() => {
    if (!orders.length) return { totalRevenue: 0, codAmount: 0, orderCount: 0 };

    const now = new Date();
    const today = DATE_FMT.format(now);

    let filtered = orders;

    switch (revenueFilter) {
      case "today":
        filtered = orders.filter((o) => {
          const date = parseDatev2(o.updatedAt || o.createdAt);
          if (!date) return false;
          return DATE_FMT.format(date) === today;
        });
        break;
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = orders.filter((o) => {
          const date = parseDatev2(o.updatedAt || o.createdAt);
          if (!date) return false;
          return date >= weekAgo;
        });
        break;
      case "month":
        filtered = orders.filter((o) => {
          const date = parseDatev2(o.updatedAt || o.createdAt);
          if (!date) return false;
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        });
        break;
      case "all":
      default:
        filtered = orders;
        break;
    }

    const completedOrders = filtered.filter((o) => o.status === "COMPLETED");
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + (o.totalPrice || 0),
      0,
    );
    const codAmount = completedOrders.reduce(
      (sum, o) => sum + Number(o.codAmount || o.totalPrice * 0.1 || 0),
      0,
    );
    const orderCount = completedOrders.length;

    return { totalRevenue, codAmount, orderCount };
  }, [orders, revenueFilter]);

  const statusToField = {
    PENDING: "pending",
    CREATED: "created",
    COLLECTED: "collected",
    IN_TRANSIT: "inTransit",
    AT_HUB: "atHub",
    PICKING: "picking",
    DELIVERING: "delivering",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    RETURNING: "returning",
  };

  const orderStats = useMemo(() => {
    const stats = {
      total: orders.length,
      pending: 0,
      created: 0,
      collected: 0,
      inTransit: 0,
      atHub: 0,
      picking: 0,
      delivering: 0,
      completed: 0,
      cancelled: 0,
      returning: 0,
    };

    orders.forEach((o) => {
      const status = o.status;
      const field = statusToField[status];
      if (field && stats.hasOwnProperty(field)) {
        stats[field]++;
      }
    });

    stats.totalRevenue = orders
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    stats.filteredTotal = filteredOrders.length;
    stats.filteredRevenue = filteredOrders
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    const today = DATE_FMT.format(new Date());
    stats.todayOrders = orders.filter((o) => {
      const date = parseDatev2(o.createdAt);
      return date && DATE_FMT.format(date) === today;
    }).length;

    return stats;
  }, [orders, filteredOrders]);

  // Hub statistics
  const hubStats = useMemo(() => {
    if (!hubs.length) return { total: 0, active: 0, inactive: 0 };

    const active = hubs.filter(
      (h) => h.active !== false && h.isActive !== false,
    ).length;
    return {
      total: hubs.length,
      active,
      inactive: hubs.length - active,
    };
  }, [hubs]);

  // User statistics
  const userStats = useMemo(() => {
    if (!users.length)
      return { total: 0, customer: 0, shipper: 0, hubAdmin: 0, superAdmin: 0 };

    const counts = { customer: 0, shipper: 0, hubAdmin: 0, superAdmin: 0 };
    users.forEach((u) => {
      let roles = u.roles || u.role || u.authority || [];
      if (typeof roles === "string") roles = [roles];
      if (!Array.isArray(roles)) roles = roles ? [roles] : [];

      roles.forEach((role) => {
        const roleStr =
          typeof role === "string" ? role : role.name || role.authority || "";
        if (!roleStr) return;

        let r = roleStr.replace("ROLE_", "").toLowerCase();
        r = r.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (counts.hasOwnProperty(r)) {
          counts[r]++;
        }
      });
    });

    return { total: users.length, ...counts };
  }, [users]);

  // Status distribution for chart
  const statusChartData = useMemo(() => {
    const statusToField = {
      PENDING: "pending",
      CREATED: "created",
      COLLECTED: "collected",
      IN_TRANSIT: "inTransit",
      AT_HUB: "atHub",
      PICKING: "picking",
      DELIVERING: "delivering",
      COMPLETED: "completed",
      CANCELLED: "cancelled",
      RETURNING: "returning",
    };
    const statusLabels = {
      PENDING: "Chờ xử lý",
      CREATED: "Đã tạo",
      COLLECTED: "Đã nhận",
      IN_TRANSIT: "Trung chuyển",
      AT_HUB: "Tại Hub",
      PICKING: "Đang lấy",
      DELIVERING: "Đang giao",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
      RETURNING: "Hoàn hàng",
    };

    return Object.entries(statusLabels).map(([key, label], index) => ({
      name: label,
      value: orderStats[statusToField[key]] || 0,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    }));
  }, [orderStats]);

  const hubPieData = useMemo(() => {
    const total = hubRevenues.reduce((sum, h) => sum + h.hubRevenue, 0);
    return hubRevenues.map((hub) => ({
      name: hub.hubName,
      value: hub.hubRevenue,
      orderCount: hub.orderCount,
      percentage: total > 0 ? ((hub.hubRevenue / total) * 100).toFixed(1) : 0,
    }));
  }, [hubRevenues]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 md:p-5 lg:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            <span className="hidden md:inline">Tổng quan hoạt động · </span>
            <span className="md:hidden block">Tổng quan hoạt động</span>
            <span className="block md:inline">
              {" "}
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          <span>Làm mới</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : (
        <>
          {/* STATS ORDERS */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package size={16} /> Quản lý đơn hàng
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
              <StatCardv2
                label="Tổng đơn"
                value={orderStats.total}
                icon={<Package size={18} />}
                accent="bg-slate-100 text-slate-600"
              />
              <StatCardv2
                label="Hôm nay"
                value={orderStats.todayOrders}
                icon={<Clock size={18} />}
                accent="bg-blue-50 text-blue-600"
              />
              <StatCardv2
                label="Chờ xử lý"
                value={orderStats.pending}
                icon={<Clock size={18} />}
                accent="bg-orange-50 text-orange-600"
              />
              <StatCardv2
                label="Đã tạo"
                value={orderStats.created}
                icon={<Package size={18} />}
                accent="bg-indigo-50 text-indigo-600"
              />
              <StatCardv2
                label="Đã nhận"
                value={orderStats.collected}
                icon={<Boxes size={18} />}
                accent="bg-cyan-50 text-cyan-600"
              />
              <StatCardv2
                label="Trung chuyển"
                value={orderStats.intransit}
                icon={<TrendingUp size={18} />}
                accent="bg-teal-50 text-teal-600"
              />
              <StatCardv2
                label="Tại Hub"
                value={orderStats.atHub}
                icon={<Building2 size={18} />}
                accent="bg-purple-50 text-purple-600"
              />
              <StatCardv2
                label="Đang lấy"
                value={orderStats.picking}
                icon={<Truck size={18} />}
                accent="bg-violet-50 text-violet-600"
              />
              <StatCardv2
                label="Đang giao"
                value={orderStats.delivering}
                icon={<Truck size={18} />}
                accent="bg-amber-50 text-amber-600"
              />
              <StatCardv2
                label="Hoàn thành"
                value={orderStats.completed}
                icon={<CheckCircle2 size={18} />}
                accent="bg-emerald-50 text-emerald-600"
              />
              <StatCardv2
                label="Đã hủy"
                value={orderStats.cancelled}
                icon={<AlertTriangle size={18} />}
                accent="bg-red-50 text-red-600"
              />
              <StatCardv2
                label="Hoàn hàng"
                value={orderStats.returning}
                icon={<RefreshCw size={18} />}
                accent="bg-amber-100 text-amber-700"
              />
            </div>
          </div>

          {/* STATS USERS */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users size={16} /> Quản lý người dùng
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
              <StatCardv2
                label="Tổng user"
                value={userStats.total}
                icon={<Users size={18} />}
                accent="bg-slate-100 text-slate-600"
              />
              <StatCardv2
                label="Khách hàng"
                value={userStats.customer}
                icon={<UserCheck size={18} />}
                accent="bg-blue-50 text-blue-600"
              />
              <StatCardv2
                label="Shipper"
                value={userStats.shipper}
                icon={<Truck size={18} />}
                accent="bg-amber-50 text-amber-600"
              />
              <StatCardv2
                label="Hub Admin"
                value={userStats.hubAdmin}
                icon={<Building2 size={18} />}
                accent="bg-purple-50 text-purple-600"
              />
            </div>
          </div>

          {/* STATS HUBS */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Boxes size={16} /> Quản lý Hub
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              <StatCardv2
                label="Tổng Hub"
                value={hubStats.total}
                icon={<Boxes size={18} />}
                accent="bg-slate-100 text-slate-600"
              />
              <StatCardv2
                label="Hoạt động"
                value={hubStats.active}
                icon={<Activity size={18} />}
                accent="bg-emerald-50 text-emerald-600"
              />
              <StatCardv2
                label="Ngừng hoạt động"
                value={hubStats.inactive}
                icon={<AlertTriangle size={18} />}
                accent="bg-red-50 text-red-600"
              />
            </div>
          </div>

          {/* REVENUE SECTION */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 md:px-5 py-3 sm:py-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
              <div>
                <div className="text-sm font-bold text-slate-700">
                  Doanh thu hệ thống
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {revenueFilter === "all"
                    ? "Tất cả đơn hoàn thành"
                    : revenueFilter === "today"
                      ? "Hôm nay"
                      : revenueFilter === "week"
                        ? "7 ngày qua"
                        : "Tháng " + chartMonth + "/" + chartYear}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {[
                  { key: "today", label: "Hôm nay" },
                  { key: "week", label: "7 ngày" },
                  { key: "month", label: "Tháng" },
                  { key: "all", label: "Tất cả" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setRevenueFilter(f.key)}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                      ${
                        revenueFilter === f.key
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">
                  Tổng doanh thu
                </div>
                <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-emerald-600">
                  {MONEY_FMT.format(
                    Number(systemRevenueData?.totalRevenue || 0),
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">COD cần hoàn</div>
                <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-orange-500">
                  {MONEY_FMT.format(Number(systemRevenueData?.codAmount || 0))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">
                  Số đơn hoàn thành
                </div>
                <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-700">
                  {(systemRevenueData?.totalOrders || 0).toLocaleString(
                    "vi-VN",
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="gap-4 sm:gap-6 mb-4 sm:mb-6 flex flex-col">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-slate-700">
                  Phân bố trạng thái đơn hàng
                </div>
                <Link
                  to="/admin/orders"
                  className="text-xs text-red-600 font-semibold flex items-center gap-1 hover:underline"
                >
                  Xem chi tiết <ChevronRight size={13} />
                </Link>
              </div>
              <div className="relative">
                <div
                  id="status-chart-container"
                  className="h-64 overflow-x-auto lg:overflow-visible smooth-scroll"
                >
                  <div className="min-w-[400px] w-full md:w-full h-full px-2">
                    <ResponsiveContainer
                      width={statusChartWidth === 0 ? "100%" : statusChartWidth}
                      height="100%"
                    >
                      <BarChart
                        data={statusChartData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f0f0f0"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          name="Số đơn"
                          radius={[2, 2, 0, 0]}
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Hub Revenue Pie Chart */}
            {hubPieData.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-slate-700">
                    Tỷ trọng doanh thu Hub
                  </div>
                </div>
                <div className="h-64 overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hubPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        labelLine={true}
                      >
                        {hubPieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => MONEY_FMT.format(value)}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: "11px", flexWrap: "wrap" }}
                        formatter={(value, entry) => (
                          <span className="text-xs text-slate-600">
                            {value}: {entry.payload.percentage}%
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Bar charts từng Hub */}
            {hubRevenues.map((hub) => {
              const hubMonth =
                (hubChartMonths[hub.hubId] || {}).month || chartMonth;
              const hubYear =
                (hubChartMonths[hub.hubId] || {}).year || chartYear;
              const hubView = hubChartViews[hub.hubId] || "day";
              const dailyData = dailyRevenues[hub.hubId] || [];
              const monthlyInfo = hubMonthlyData[hub.hubId] || {};
              const monthlyChartData = hubMonthlyChartData[hub.hubId] || [];

              let chartData;
              if (hubView === "month") {
                chartData = monthlyChartData;
              } else {
                chartData = dailyData;
              }

              const monthTotal = monthlyChartData.reduce(
                (sum, d) => ({
                  hubRevenue: sum.hubRevenue + d.hubRevenue,
                  codAmount: sum.codAmount + d.codAmount,
                }),
                { hubRevenue: 0, codAmount: 0 },
              );

              const handlePrevMonth = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const prev = new Date(hubYear, hubMonth - 2, 1);
                const newMonth = prev.getMonth() + 1;
                const newYear = prev.getFullYear();
                setHubChartMonths((prev) => ({
                  ...prev,
                  [hub.hubId]: { month: newMonth, year: newYear },
                }));
                fetchHubDailyRevenue(hub.hubId, newMonth, newYear);
              };

              const handleNextMonth = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const next = new Date(hubYear, hubMonth, 1);
                const newMonth = next.getMonth() + 1;
                const newYear = next.getFullYear();
                setHubChartMonths((prev) => ({
                  ...prev,
                  [hub.hubId]: { month: newMonth, year: newYear },
                }));
                fetchHubDailyRevenue(hub.hubId, newMonth, newYear);
              };

              const handleChangeView = (view) => {
                setHubChartViews((prev) => ({
                  ...prev,
                  [hub.hubId]: view,
                }));
              };

              const displayRevenue =
                hubView === "month"
                  ? monthTotal.hubRevenue
                  : monthlyInfo.hubRevenue || hub.hubRevenue;

              return (
                <div
                  key={hub.hubId}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-4 md:p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold text-slate-700">
                      Doanh thu {hub.hubName}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevMonth}
                        className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                      >
                        ‹
                      </button>
                      <span className="text-xs font-semibold text-slate-600 min-w-[80px] text-center">
                        {hubMonth}/{hubYear}
                      </span>
                      <button
                        onClick={handleNextMonth}
                        className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                      >
                        ›
                      </button>
                      {/* Ngày/Tháng buttons */}
                      {[
                        { key: "day", label: "Ngày" },
                        { key: "month", label: "Tháng" },
                      ].map((v) => (
                        <button
                          key={v.key}
                          onClick={() => handleChangeView(v.key)}
                          className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                            hubView === v.key
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    {monthlyInfo.orderCount || hub.orderCount || 0} đơn ·{" "}
                    {MONEY_FMT.format(displayRevenue)}
                  </div>
                  {chartData.length > 0 ? (
                    <div className="h-48 overflow-x-auto lg:overflow-visible">
                      <div
                        className="h-full"
                        style={{ minWidth: hubChartWidths[hub.hubId] || 0 }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) =>
                                v >= 1000000
                                  ? `${(v / 1000000).toFixed(1)}Tr`
                                  : v >= 1000
                                    ? `${(v / 1000).toFixed(0)}K`
                                    : v
                              }
                              width={55}
                            />
                            <Tooltip content={<HubRevenueTooltip />} />
                            <Bar
                              dataKey="hubRevenue"
                              name="Doanh thu"
                              fill="#10b981"
                              radius={[2, 2, 0, 0]}
                              maxBarSize={hubView === "month" ? 40 : 15}
                            />
                            <Bar
                              dataKey="codAmount"
                              name="COD hoàn"
                              fill="#f97316"
                              radius={[2, 2, 0, 0]}
                              maxBarSize={hubView === "month" ? 40 : 15}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                      Chưa có dữ liệu
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 md:px-5 py-3 sm:py-4 mb-4 sm:mb-6">
            <div className="text-sm font-bold text-slate-700 mb-3">
              Tác vụ nhanh
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Link
                to="/admin/orders"
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all"
              >
                <Package size={22} className="text-red-500" />
                <span className="text-xs font-semibold text-center">
                  Đơn hàng
                </span>
              </Link>
              <Link
                to="/admin/hubs"
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all"
              >
                <Boxes size={22} className="text-red-500" />
                <span className="text-xs font-semibold text-center">Hub</span>
              </Link>
              <Link
                to="/admin/users"
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all"
              >
                <Users size={22} className="text-red-500" />
                <span className="text-xs font-semibold text-center">
                  Người dùng
                </span>
              </Link>
              <Link
                to="/admin/feedbacks"
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all"
              >
                <MessageSquare size={22} className="text-red-500" />
                <span className="text-xs font-semibold text-center">
                  Phản hồi
                </span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
