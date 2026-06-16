import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Filter,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Route,
  Search,
  Truck,
  User,
  DollarSign,
} from "lucide-react";
import orderService from "../../services/orderService";
import hubService from "../../services/hubService";
import { ROUTE_STATUS } from "../../constants/ROUTE_STATUS";
import formatDateTime from "../../components/utils/formatDateTime";
import formatAddressv2 from "../../components/utils/formatAddressv2";

const ORDER_STATUS = {
  AT_HUB: {
    label: "Chờ shipper nhận",
    tone: "text-slate-700 bg-slate-100 border-slate-200",
  },
  PICKING: {
    label: "Shipper đã nhận",
    tone: "text-blue-700 bg-blue-50 border-blue-200",
  },
  DELIVERING: {
    label: "Đang giao",
    tone: "text-amber-700 bg-amber-50 border-amber-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  RETURNING: {
    label: "Trả hub",
    tone: "text-red-700 bg-red-50 border-red-200",
  },
  CANCELLED: {
    label: "Đã hủy",
    tone: "text-slate-600 bg-slate-100 border-slate-200",
  },
};

const FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "ACTIVE", label: "Đang xử lý" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "RETURNING", label: "Trả hub" },
  { key: "FAILED", label: "Có thất bại" },
];

const currency = (value) =>
  value == null ? "0đ" : `${Number(value).toLocaleString("vi-VN")}đ`;

function Badge({ config, fallback }) {
  const cfg = config || {
    label: fallback || "Không rõ",
    tone: "text-slate-600 bg-slate-100 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cfg.tone}`}
    >
      {cfg.label}
    </span>
  );
}

function uniqueOrders(...groups) {
  const map = new Map();
  groups.flat().forEach((order) => {
    if (order?.id) map.set(order.id, order);
  });
  return Array.from(map.values());
}

function normalizeOrder(order) {
  return {
    id: order.id,
    routeId: order.routeId,
    status: order.status,
    shipperId: order.shipperId,
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    receiverAddress: order.receiverAddress,
    receiverWard: order.receiverWard,
    receiverDistrict: order.receiverDistrict,
    productName: order.productName,
    weight: order.weight,
    paymentMethod: order.paymentMethod,
    finalAmountToCollect: order.finalAmountToCollect,
    proofImageUrl: order.proofImageUrl,
    failReason: order.failReason,
    failCount: order.failCount || 0,
    updatedAt: order.updatedAt,
    createdAt: order.createdAt,
  };
}

function buildRoutes(orders, routeInfoMap) {
  const grouped = new Map();

  orders
    .filter((order) => order.routeId)
    .forEach((order) => {
      if (!grouped.has(order.routeId)) {
        grouped.set(order.routeId, {
          id: order.routeId,
          routeInfo: routeInfoMap[order.routeId] || null,
          orders: [],
        });
      }
      grouped.get(order.routeId).orders.push(order);
    });

  return Array.from(grouped.values())
    .map((route) => {
      const ordersInRoute = route.orders;
      const completed = ordersInRoute.filter((o) => o.status === "COMPLETED");
      const returning = ordersInRoute.filter((o) => o.status === "RETURNING");
      const delivering = ordersInRoute.filter((o) => o.status === "DELIVERING");
      const picking = ordersInRoute.filter((o) => o.status === "PICKING");
      const failed = ordersInRoute.filter((o) => (o.failCount || 0) > 0);
      const totalCod = ordersInRoute.reduce(
        (sum, o) => sum + Number(o.finalAmountToCollect || 0),
        0,
      );
      const routeStatus =
        route.routeInfo?.status ||
        (ordersInRoute.length > 0 && completed.length === ordersInRoute.length
          ? "COMPLETED"
          : delivering.length > 0
            ? "IN_PROGRESS"
            : picking.length > 0
              ? "ACCEPTED"
              : "PENDING");

      return {
        ...route,
        status: routeStatus,
        shipperId:
          route.routeInfo?.shipperId ||
          ordersInRoute.find((o) => o.shipperId)?.shipperId,
        totalOrders: route.routeInfo?.totalOrders || ordersInRoute.length,
        createdAt: route.routeInfo?.createdAt || ordersInRoute[0]?.createdAt,
        completedAt: route.routeInfo?.completedAt,
        totalCod,
        counts: {
          completed: completed.length,
          returning: returning.length,
          delivering: delivering.length,
          picking: picking.length,
          failed: failed.length,
        },
      };
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
      <div className="truncate font-bold text-slate-900 text-xs sm:text-sm">
        {value}
      </div>
      <div className="mt-0.5 truncate text-slate-400 text-[10px] sm:text-xs">
        {label}
      </div>
    </div>
  );
}

function ProofLink({ url }) {
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-300">
        <ImageIcon size={13} />
        Chưa có
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 whitespace-nowrap"
    >
      <Camera size={13} />
      Xem ảnh
    </a>
  );
}

function OrderRow({ order }) {
  return (
    <tr className="align-top transition hover:bg-slate-50/50">
      <td className="px-4 py-3 font-mono text-xs font-extrabold text-red-700 whitespace-nowrap">
        {order.id}
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-800 text-sm">
          {order.receiverName || "Không rõ"}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {order.receiverPhone || "Không có SĐT"}
        </div>
        <div className="mt-1 max-w-xs text-xs text-slate-400 flex items-center gap-1 truncate">
          <MapPin size={10} className="shrink-0" />
          <span className="truncate">{formatAddressv2(order)}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <Badge config={ORDER_STATUS[order.status]} fallback={order.status} />
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`font-bold ${(order.failCount || 0) > 0 ? "text-red-600" : "text-slate-400"}`}
        >
          {order.failCount || 0}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">
        {order.failReason || <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3">
        <ProofLink url={order.proofImageUrl} />
      </td>
      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
        {currency(order.finalAmountToCollect)}
      </td>
    </tr>
  );
}

function OrderMobileCard({ order }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs font-extrabold text-red-700">
            {order.id}
          </div>
          <div className="mt-1 font-semibold text-slate-900 text-sm">
            {order.receiverName || "Không rõ"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {order.receiverPhone || "Không có SĐT"}
          </div>
        </div>
        <Badge config={ORDER_STATUS[order.status]} fallback={order.status} />
      </div>

      <div className="mt-3 space-y-2 text-xs text-slate-500">
        <div className="flex gap-2">
          <Package size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{order.productName || "Không có tên hàng"}</span>
        </div>
        <div className="flex gap-2">
          <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{formatAddressv2(order) || "Không có địa chỉ"}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <MiniStat label="Thu hộ" value={currency(order.finalAmountToCollect)} />
        <MiniStat label="Fail" value={order.failCount || 0} />
        <MiniStat
          label="Ngày cập nhật"
          value={formatDateTime(order.updatedAt).split(" ")[0]}
        />
      </div>

      {(order.failReason || order.proofImageUrl) && (
        <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">
          {order.failReason && (
            <div className="mb-2 flex gap-2 text-red-700">
              <RotateCcw size={13} className="mt-0.5 shrink-0" />
              <span>{order.failReason}</span>
            </div>
          )}
          <ProofLink url={order.proofImageUrl} />
        </div>
      )}
    </div>
  );
}

function RouteAccordionCard({ route }) {
  const [expanded, setExpanded] = useState(false);
  const progress =
    route.totalOrders > 0
      ? Math.round((route.counts.completed / route.totalOrders) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div
        className="px-4 py-4 sm:px-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <Route size={18} className="text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-mono text-sm font-extrabold text-red-700 truncate max-w-[150px] sm:max-w-none">
                {route.id}
              </span>
              <Badge
                config={ROUTE_STATUS[route.status]}
                fallback={route.status}
              />
              {route.counts.failed > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 whitespace-nowrap">
                  {route.counts.failed} đơn lỗi
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User size={11} className="text-slate-400" />
                {route.shipperId || "Chưa nhận"}
              </span>
              <span className="text-slate-300">|</span>
              <span>{formatDateTime(route.createdAt)}</span>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-emerald-600">
                {route.counts.completed}/{route.totalOrders} hoàn thành
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-base font-extrabold text-slate-900">
              {route.totalCod.toLocaleString("vi-VN")}đ
            </div>
            <div className="text-xs text-slate-400">tổng COD</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-slate-500 w-8 text-right">
              {progress}%
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* Expanded Header stats */}
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat
              label="Tổng đơn hàng"
              value={`${route.totalOrders} đơn`}
            />
            <MiniStat
              label="Đang giao"
              value={`${route.counts.delivering} đơn`}
            />
            <MiniStat label="Trả hub" value={`${route.counts.returning} đơn`} />
            <MiniStat label="Tổng COD tuyến" value={currency(route.totalCod)} />
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Người nhận</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Lỗi</th>
                  <th className="px-4 py-3">Lý do thất bại</th>
                  <th className="px-4 py-3">Minh chứng</th>
                  <th className="px-4 py-3 text-right">Thu hộ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {route.orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="space-y-3 p-3 lg:hidden bg-slate-50/20">
            {route.orders.map((order) => (
              <OrderMobileCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RouteMonitoring() {
  const [hub, setHub] = useState(null);
  const [orders, setOrders] = useState([]);
  const [routeInfoMap, setRouteInfoMap] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const hubId = hub?.id || hub?.hubId;

  const fetchData = async () => {
    if (!hubId) return;

    try {
      setError("");
      setRefreshing(true);

      const [inventoryRes, deliveryRes] = await Promise.all([
        orderService.getInventoryAtHub(hubId, { page: 0, size: 500 }),
        orderService.getDeliveryOrdersByHub(hubId).catch(() => ({ data: [] })),
      ]);

      const inventory = inventoryRes?.data?.content || [];
      const delivery = deliveryRes?.data || [];
      const normalized = uniqueOrders(inventory, delivery).map(normalizeOrder);
      const routeIds = [
        ...new Set(normalized.map((o) => o.routeId).filter(Boolean)),
      ];

      const routeEntries = await Promise.all(
        routeIds.map(async (routeId) => {
          try {
            const res = await orderService.getRouteInfo(routeId);
            return [routeId, res.data ?? res];
          } catch {
            return [routeId, null];
          }
        }),
      );

      const nextRouteInfoMap = Object.fromEntries(routeEntries);
      setOrders(normalized);
      setRouteInfoMap(nextRouteInfoMap);
    } catch (e) {
      setError(
        e?.response?.data?.message || "Không thể tải dữ liệu tuyến giao",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchHub = async () => {
      try {
        const res = await hubService.getMyHub();
        setHub(res.data ?? res);
      } catch {
        setError("Không lấy được thông tin hub");
        setLoading(false);
      }
    };

    fetchHub();
  }, []);

  useEffect(() => {
    fetchData();
  }, [hubId]);

  const routes = useMemo(
    () => buildRoutes(orders, routeInfoMap),
    [orders, routeInfoMap],
  );

  const filteredRoutes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return routes.filter((route) => {
      const matchesSearch =
        !keyword ||
        route.id.toLowerCase().includes(keyword) ||
        (route.shipperId || "").toLowerCase().includes(keyword) ||
        route.orders.some(
          (order) =>
            order.id.toLowerCase().includes(keyword) ||
            (order.receiverName || "").toLowerCase().includes(keyword) ||
            (order.receiverPhone || "").toLowerCase().includes(keyword),
        );

      const matchesFilter =
        filter === "ALL" ||
        (filter === "ACTIVE" && route.status !== "COMPLETED") ||
        (filter === "COMPLETED" && route.status === "COMPLETED") ||
        (filter === "RETURNING" && route.counts.returning > 0) ||
        (filter === "FAILED" && route.counts.failed > 0);

      return matchesSearch && matchesFilter;
    });
  }, [routes, search, filter]);

  const stats = useMemo(
    () => ({
      total: routes.length,
      active: routes.filter((route) => route.status !== "COMPLETED").length,
      completed: routes.filter((route) => route.status === "COMPLETED").length,
      totalCod: routes.reduce((sum, route) => sum + route.totalCod, 0),
    }),
    [routes],
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Theo dõi tuyến giao
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
            <MapPin size={14} className="text-red-500 shrink-0" />
            {hub?.name || hubId || "Đang tải hub..."}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={!hubId || refreshing}
          className="text-xs px-2.5 sm:px-3 py-1.5 flex gap-1 items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            size={13}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 mb-6">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          {
            label: "Tổng số tuyến",
            value: stats.total,
            icon: <Route size={17} />,
            accent: "bg-slate-50 text-slate-600 border-slate-100",
          },
          {
            label: "Tuyến đang xử lý",
            value: stats.active,
            icon: <Truck size={17} />,
            accent: "bg-amber-50 text-amber-600 border-amber-100",
          },
          {
            label: "Tuyến hoàn thành",
            value: stats.completed,
            icon: <CheckCircle2 size={17} />,
            accent: "bg-emerald-50 text-emerald-600 border-emerald-100",
          },
          {
            label: "Tổng COD thu hộ",
            value: currency(stats.totalCod),
            icon: <DollarSign size={17} />,
            accent: "bg-blue-50 text-blue-600 border-blue-100",
          },
        ].map((s, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 sm:py-4"
          >
            <div className={`inline-flex p-2 rounded-lg mb-2 ${s.accent}`}>
              {s.icon}
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-slate-900 break-words">
              {s.value}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex flex-col gap-3 mb-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 w-full lg:max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tuyến, shipper, mã đơn, người nhận..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <Filter size={13} className="text-slate-400 shrink-0" />
          {FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                ${
                  filter === item.key
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* List content */}
      {loading ? (
        <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm">
          <Loader2 size={28} className="animate-spin text-red-400" />
          <span className="text-sm">Đang tải tuyến giao...</span>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm">
          <Package size={36} strokeWidth={1.5} />
          <span className="text-sm">Chưa có tuyến giao nào phù hợp</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRoutes.map((route) => (
            <RouteAccordionCard key={route.id} route={route} />
          ))}
        </div>
      )}
    </>
  );
}
