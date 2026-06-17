import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  AlertTriangle,
  DollarSign,
  Play,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  Phone,
  CreditCard,
  Image,
  X,
  Maximize2,
  Minimize2,
  Map,
} from "lucide-react";
import orderService from "../../services/orderService";
import routingService from "../../services/routingService";
import useAuth from "../../hooks/useAuth";
import getRouteGeometry from "../../components/utils/getRouteGeometry";
import formatAddress from "../../components/utils/formatAddress";
import DeliveryModal from "../../components/shipper/DeliveryModal";
import ReturnModal from "../../components/shipper/ReturnModal";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: undefined,
  iconUrl: undefined,
  shadowUrl: undefined,
});

const getOptimizedSequence = (previewData) => {
  if (!previewData) return null;
  const seq =
    previewData.optimizedSequence || previewData.route?.optimizedSequence;
  if (Array.isArray(seq) && seq.length > 1) {
    return seq
      .slice(1)
      .map((p) => p.id)
      .filter(Boolean);
  }
  return null;
};

function makeOrderIcon(index) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="#dc2626" stroke="white" stroke-width="2"/>
    <text x="14" y="19" text-anchor="middle" font-size="12" font-weight="bold" fill="white">${index + 1}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const shipperIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="16" fill="#2563eb" stroke="white" stroke-width="2"/>
    <text x="17" y="22" text-anchor="middle" font-size="20">🛵</text>
  </svg>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const STATUS_CFG = {
  PICKING: {
    label: "Chờ lấy hàng",
    color: "text-purple-700 bg-purple-50 border-purple-200",
  },
  DELIVERING: {
    label: "Đang giao",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  RETURNING: {
    label: "Hoàn đơn",
    color: "text-red-700 bg-red-50 border-red-200",
  },
};

export default function ActiveDelivery() {
  const { user, gpsStatus } = useAuth();
  const shipperId = user?.id || user?.userId || "";

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [selectedModal, setSelectedModal] = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const [starting, setStarting] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [gpsPaused, setGpsPaused] = useState(
    () => sessionStorage.getItem("gps_paused") === "true",
  );
  const [showMap, setShowMap] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [shipperPos, setShipperPos] = useState(null);
  const [liveRouteGeometry, setLiveRouteGeometry] = useState(null);
  const [optimizedOrderIds, setOptimizedOrderIds] = useState(null);
  const gpsRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const shipperMarkerRef = useRef(null);

  // Hàm tính lại tuyến đường tối ưu
  const recalculateOptimalRoute = async () => {
    if (!showMap || routes.length === 0) return;

    const pendingOrders = routes
      .flatMap((r) => r.orders)
      .filter(
        (o) =>
          (o.status === "PICKING" || o.status === "DELIVERING") &&
          o.receiverLat &&
          o.receiverLng,
      );

    if (pendingOrders.length === 0 || !shipperId) {
      setOptimizedOrderIds(null);
      setLiveRouteGeometry(null);
      return;
    }

    // Lấy vị trí shipper
    const startLat = shipperPos?.lat ?? pendingOrders[0]?.receiverLat ?? 21.0;
    const startLng = shipperPos?.lng ?? pendingOrders[0]?.receiverLng ?? 105.85;

    // Gán ID để routing-service trả về đúng thứ tự theo order ID
    const deliveryPoints = pendingOrders.map((o, i) => ({
      id: o.id,
      lat: o.receiverLat,
      lng: o.receiverLng,
      label:
        formatAddress(o.receiverAddress, o.receiverWard, o.receiverDistrict) ||
        `#${i + 1}`,
    }));

    try {
      const res = await routingService.routePreview({
        startPoint: {
          id: shipperId,
          lat: startLat,
          lng: startLng,
          label: "Vị trí của bạn",
        },
        deliveryPoints,
      });

      const geometry = getRouteGeometry(res.data);
      if (geometry && geometry.length > 0) {
        setLiveRouteGeometry(geometry);
      }

      // Lưu thứ tự tối ưu để hiển thị đơn theo lộ trình
      const orderSeq = getOptimizedSequence(res.data);
      if (orderSeq && orderSeq.length > 0) {
        setOptimizedOrderIds(orderSeq);
      }
    } catch (e) {}
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMyOrders = async () => {
    if (!shipperId) return;
    try {
      setLoading(true);

      const [pickRes, delivRes, retRes, compRes] = await Promise.all([
        orderService
          .getMyShipperOrders({ status: "PICKING" })
          .catch(() => ({ data: [] })),
        orderService
          .getMyShipperOrders({ status: "DELIVERING" })
          .catch(() => ({ data: [] })),
        orderService
          .getMyShipperOrders({ status: "RETURNING" })
          .catch(() => ({ data: [] })),
        orderService
          .getMyShipperOrders({ status: "COMPLETED" })
          .catch(() => ({ data: [] })),
      ]);

      const allOrders = [
        ...(Array.isArray(pickRes.data)
          ? pickRes.data
          : pickRes.data?.content || []),
        ...(Array.isArray(delivRes.data)
          ? delivRes.data
          : delivRes.data?.content || []),
        ...(Array.isArray(retRes.data)
          ? retRes.data
          : retRes.data?.content || []),
        ...(Array.isArray(compRes.data)
          ? compRes.data
          : compRes.data?.content || []),
      ];

      const routeMap = {};
      for (const o of allOrders) {
        if (!o.routeId) continue;
        if (!routeMap[o.routeId])
          routeMap[o.routeId] = {
            routeId: o.routeId,
            hubId: o.currentHubId,
            orders: [],
            routeGeometry: o.routeGeometry || null,
            totalOrders: o.routeTotalOrders ?? null,
          };
        routeMap[o.routeId].orders.push({ ...o, failCount: o.failCount ?? 0 });
      }

      // tuyến DELIVERING -> PICKING ->...
      const sorted = Object.values(routeMap).sort((a, b) => {
        const aHasDelivering = a.orders.some((o) => o.status === "DELIVERING");
        const bHasDelivering = b.orders.some((o) => o.status === "DELIVERING");
        if (aHasDelivering && !bHasDelivering) return -1;
        if (!aHasDelivering && bHasDelivering) return 1;

        const aHasPicking = a.orders.some((o) => o.status === "PICKING");
        const bHasPicking = b.orders.some((o) => o.status === "PICKING");
        if (aHasPicking && !bHasPicking) return -1;
        if (!aHasPicking && bHasPicking) return 1;

        return 0;
      });
      setRoutes(sorted);
      if (sorted.length > 0 && !expandedRoute)
        setExpandedRoute(sorted[0].routeId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
  }, [shipperId]);

  // Lắng nghe GPS toggle từ Navbar
  useEffect(() => {
    const handler = (e) => {
      const paused = e.detail.paused;
      setGpsPaused(paused);
      if (paused) {
        setShipperPos(null);
      }
    };
    window.addEventListener("gps_toggle", handler);
    return () => window.removeEventListener("gps_toggle", handler);
  }, []);

  // GPS: push vị trí shipper lên server và tính lại tuyến tối ưu khi vị trí thay đổi
  useEffect(() => {
    const pendingOrders = routes
      .flatMap((r) => r.orders)
      .filter(
        (o) =>
          (o.status === "PICKING" || o.status === "DELIVERING") &&
          o.receiverLat &&
          o.receiverLng,
      );
    if (pendingOrders.length === 0) {
      clearInterval(gpsRef.current);
      setLiveRouteGeometry(null);
      return;
    }

    const hasDelivering = routes.some((r) =>
      r.orders.some((o) => o.status === "DELIVERING" || o.status === "PICKING"),
    );
    if (!hasDelivering || gpsPaused || !shipperId || gpsStatus !== "granted") {
      clearInterval(gpsRef.current);
      return;
    }

    const recalcRoute = async (lat, lng) => {
      if (!lat || !lng) return;
      const refPos = { lat, lng };
      const getDist = (o) => {
        const dLat = o.receiverLat - refPos.lat;
        const dLng = o.receiverLng - refPos.lng;
        return dLat * dLat + dLng * dLng;
      };
      const sortedByDist = [...pendingOrders].sort(
        (a, b) => getDist(a) - getDist(b),
      );
      try {
        const res = await routingService.routePreview({
          startPoint: { id: shipperId, lat, lng, label: "Vị trí của bạn" },
          deliveryPoints: sortedByDist.map((o, i) => ({
            id: o.id,
            lat: o.receiverLat,
            lng: o.receiverLng,
            label:
              formatAddress(
                o.receiverAddress,
                o.receiverWard,
                o.receiverDistrict,
              ) || `#${i + 1}`,
          })),
        });
        const geometry = getRouteGeometry(res.data);
        if (geometry && geometry.length > 0) {
          setLiveRouteGeometry(geometry);
        }
        const orderSeq = getOptimizedSequence(res.data);
        if (orderSeq && orderSeq.length > 0) {
          setOptimizedOrderIds(orderSeq);
        }
      } catch (e) {}
    };

    const tick = () => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const newPos = { lat, lng };

          setShipperPos(newPos);
          recalcRoute(lat, lng);
        },
        (err) => {
          const defaultLat = pendingOrders[0]?.receiverLat ?? 21.0;
          const defaultLng = pendingOrders[0]?.receiverLng ?? 105.85;
          setShipperPos({ lat: defaultLat, lng: defaultLng });
          recalcRoute(defaultLat, defaultLng);
        },
        { enableHighAccuracy: false, timeout: 5000 },
      );
    };

    tick(); // chạy ngay lần đầu
    gpsRef.current = setInterval(tick, 10000);
    return () => clearInterval(gpsRef.current);
  }, [routes, gpsPaused, shipperId, gpsStatus]);

  // Trigger route ngay khi mở bản đồ hoặc khi routes thay đổi
  useEffect(() => {
    if (!showMap) return;
    recalculateOptimalRoute();
  }, [showMap, routes]);

  useEffect(() => {
    if (!showMap || routes.length === 0) {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        shipperMarkerRef.current = null;
      }
      return;
    }

    const container = mapRef.current;
    if (!container) return;

    const map = L.map(container, {
      zoomControl: false,
      minZoom: 8,
      maxZoom: 16,
      maxBounds: [
        [8.5, 102],
        [23.5, 110],
      ],
      maxBoundsViscosity: 1.0,
    });
    mapInstance.current = map;
    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
      },
    );
    tileLayer.addTo(map);

    tileLayer.on("load", () => map.invalidateSize());
    map.on("moveend", () => map.invalidateSize());
    map.on("zoomend", () => map.invalidateSize());

    map._lastFitBounds = false;

    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 600);
    setTimeout(() => map.invalidateSize(), 1000);

    return () => {
      tileLayer.off("load");
      map.off("moveend");
      map.off("zoomend");
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        shipperMarkerRef.current = null;
      }
    };
  }, [showMap, routes, optimizedOrderIds]);

  // Cập nhật markers và polyline khi các state thay đổi
  useEffect(() => {
    if (!mapInstance.current || routes.length === 0) return;

    const activeRoute =
      routes.find((r) =>
        r.orders.some(
          (o) => o.status === "DELIVERING" || o.status === "PICKING",
        ),
      ) || routes[0];

    const pendingOrders = activeRoute.orders.filter(
      (o) =>
        (o.status === "PICKING" || o.status === "DELIVERING") &&
        o.receiverLat &&
        o.receiverLng,
    );

    const map = mapInstance.current;
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    if (
      !gpsPaused &&
      shipperPos &&
      liveRouteGeometry &&
      liveRouteGeometry.length > 0
    ) {
      // Chèn Shipper vào đầu route geometry
      const fullRoute = [
        [shipperPos.lat, shipperPos.lng],
        ...liveRouteGeometry,
      ];
      L.polyline(fullRoute, {
        color: "#16a34a",
        weight: 4,
        opacity: 0.85,
      }).addTo(map);
    }

    // Sắp xếp đơn theo khoảng cách từ shipper
    // Khi tắt GPS: dùng đơn đầu tiên làm tham chiếu để giữ thứ tự ổn định
    const refPos = shipperPos ?? {
      lat: pendingOrders[0]?.receiverLat ?? 21.0,
      lng: pendingOrders[0]?.receiverLng ?? 105.85,
    };
    const getDist = (o) => {
      const dLat = o.receiverLat - refPos.lat;
      const dLng = o.receiverLng - refPos.lng;
      return dLat * dLat + dLng * dLng;
    };
    const sortedPending = [...pendingOrders].sort(
      (a, b) => getDist(a) - getDist(b),
    );

    // Dùng optimizedOrderIds đã được set từ first useEffect để hiển thị markers đúng thứ tự
    const toStr = (v) => String(v ?? "");
    const sortedForDisplay =
      optimizedOrderIds && optimizedOrderIds.length > 0
        ? [...pendingOrders].sort((a, b) => {
            const aIdx = optimizedOrderIds.indexOf(toStr(a.id));
            const bIdx = optimizedOrderIds.indexOf(toStr(b.id));
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          })
        : sortedPending;

    sortedForDisplay.forEach((o, idx) => {
      L.marker([o.receiverLat, o.receiverLng], { icon: makeOrderIcon(idx) })
        .addTo(map)
        .bindPopup(
          `<b>#${idx + 1} ${o.id}</b><br/>${formatAddress(o.receiverAddress, o.receiverWard, o.receiverDistrict)}<br/><span style="font-size:11px">☎ ${o.receiverPhone || ""}</span>`,
        );
    });

    // Shipper marker
    if (!gpsPaused && shipperPos) {
      shipperMarkerRef.current = L.marker([shipperPos.lat, shipperPos.lng], {
        icon: shipperIcon,
      })
        .addTo(map)
        .bindPopup(`<b>📍 Vị trí của bạn</b>`);
    }

    // Fit bounds chỉ khi map mới được tạo
    if (!map._lastFitBounds) {
      const allPoints = [
        ...sortedPending.map((o) => [o.receiverLat, o.receiverLng]),
        ...(!gpsPaused && shipperPos ? [[shipperPos.lat, shipperPos.lng]] : []),
      ];
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(
          allPoints.map((p) => L.latLng(p[0], p[1])),
        );
        map.fitBounds(bounds, { padding: [50, 50] });
        map._lastFitBounds = true;
      }
    }
  }, [
    showMap,
    liveRouteGeometry,
    shipperPos,
    gpsPaused,
    routes,
    optimizedOrderIds,
  ]);

  useEffect(() => {
    if (!mapInstance.current) return;
    setTimeout(() => {
      mapInstance.current.invalidateSize({ animate: false });
    }, 50);
  }, [mapExpanded, showMap]);

  const handleStartDelivery = async (routeId) => {
    try {
      setStarting(routeId);
      await orderService.shipperStartDelivery(routeId);
      showToast("Bắt đầu giao hàng! GPS đang hoạt động.", "success");
      fetchMyOrders();
    } catch (e) {
      showToast(e?.response?.data?.message || "Thất bại", "error");
    } finally {
      setStarting(null);
    }
  };

  const handleReturnToHub = async (orderId, hubId) => {
    try {
      await orderService.returnOrderToHub(orderId, { hubId });
      showToast(`Đã trả đơn ${orderId} về hub`, "success");
      fetchMyOrders().then(() => recalculateOptimalRoute());
    } catch (e) {
      showToast(e?.response?.data?.message || "Thất bại", "error");
    }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {selectedModal && (
        <DeliveryModal
          order={selectedModal}
          onClose={() => setSelectedModal(null)}
          onSuccess={(id) => {
            showToast(`Giao thành công đơn ${id}`, "success");
            fetchMyOrders().then(() => recalculateOptimalRoute());
          }}
          onFail={(id) => {
            showToast(`Ghi nhận thất bại đơn ${id}`, "error");
            setSelectedModal(null);
            fetchMyOrders().then(() => recalculateOptimalRoute());
          }}
          onRefresh={fetchMyOrders}
        />
      )}

      {returnModal && (
        <ReturnModal
          order={returnModal}
          onClose={() => setReturnModal(null)}
          onConfirm={handleReturnToHub}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Tuyến đang giao
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Shipper:{" "}
              <span className="font-mono text-xs">
                {shipperId || "Chưa xác định"}
              </span>
            </p>
          </div>

          <div className="shrink-0 flex items-start">
            <button
              onClick={fetchMyOrders}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2">
          {routes.some((r) =>
            r.orders.some(
              (o) => o.status === "PICKING" || o.status === "DELIVERING",
            ),
          ) && (
            <button
              onClick={() => setShowMap((p) => !p)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors
                ${showMap ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}
            >
              <Map size={13} />
              Bản đồ
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      {showMap &&
        routes.some((r) =>
          r.orders.some(
            (o) => o.status === "PICKING" || o.status === "DELIVERING",
          ),
        ) && (
          <div
            style={{ zIndex: 10 }}
            className={`mb-6 rounded-xl border border-slate-200 overflow-hidden transition-all relative ${mapExpanded ? "h-[70vh] sm:h-[500px]" : "h-[52vh] sm:h-[320px]"}`}
          >
            <div className="bg-slate-50 px-3 py-2 sm:px-4 flex items-center justify-between border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-600">
                Bản đồ tuyến giao
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => mapInstance.current?.zoomIn()}
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 w-7 h-7 flex items-center justify-center"
                  title="Phóng to"
                >
                  <span className="text-base leading-none font-bold">+</span>
                </button>
                <button
                  onClick={() => mapInstance.current?.zoomOut()}
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 w-7 h-7 flex items-center justify-center"
                  title="Thu nhỏ"
                >
                  <span className="text-base leading-none font-bold">−</span>
                </button>
                <button
                  onClick={() => setMapExpanded((p) => !p)}
                  className="ml-1 p-1 rounded hover:bg-slate-200 text-slate-400"
                >
                  {mapExpanded ? (
                    <Minimize2 size={13} />
                  ) : (
                    <Maximize2 size={13} />
                  )}
                </button>
              </div>
            </div>
            <div ref={mapRef} className="w-full h-full" />
          </div>
        )}

      {!shipperId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          Không xác định được Shipper ID. Vui lòng đăng nhập lại.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
          <Truck size={36} strokeWidth={1.5} />
          <span className="text-sm text-slate-400">
            Không có tuyến nào đang hoạt động
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => {
            const isExpanded = expandedRoute === route.routeId;
            const hasPickingAll = route.orders.every(
              (o) => o.status === "PICKING",
            );
            // Chỉ được giao 1 tuyến DELIVERING 1 lúc
            const hasOtherRouteDelivering = routes.some(
              (r) =>
                r.routeId !== route.routeId &&
                r.orders.some((o) => o.status === "DELIVERING"),
            );
            const completed = route.orders.filter(
              (o) => o.status === "COMPLETED",
            ).length;
            const returningOrders = route.orders.filter(
              (o) => o.status === "RETURNING",
            );
            const totalOrders = route.totalOrders ?? route.orders.length;
            const remaining = totalOrders - completed;
            const progress =
              totalOrders > 0
                ? Math.round(
                    ((completed + returningOrders.length) / totalOrders) * 100,
                  )
                : 0;

            return (
              <div
                key={route.routeId}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
              >
                {/* Route header */}
                <div
                  className="px-4 py-4 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 cursor-pointer hover:bg-slate-50/60"
                  onClick={() =>
                    setExpandedRoute(isExpanded ? null : route.routeId)
                  }
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-[18px] leading-none">🏍️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-extrabold text-slate-900">
                        {route.routeId}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <div className="flex-1 min-w-24 bg-slate-200 rounded-full h-1.5 max-w-[160px]">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          Còn {totalOrders - completed - returningOrders.length}{" "}
                          / {totalOrders} đơn
                        </span>
                      </div>
                    </div>
                  </div>

                  {hasPickingAll && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDelivery(route.routeId);
                      }}
                      disabled={
                        starting === route.routeId || hasOtherRouteDelivering
                      }
                      title={
                        hasOtherRouteDelivering
                          ? "Có tuyến khác đang giao. Hoàn thành tuyến đang giao trước."
                          : ""
                      }
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {starting === route.routeId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Play size={13} />
                      )}
                      Bắt đầu giao
                    </button>
                  )}

                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-50">
                    {(() => {
                      const remaining = route.orders.filter(
                        (o) =>
                          o.status !== "COMPLETED" && o.status !== "RETURNING",
                      );
                      const completed = route.orders.filter(
                        (o) => o.status === "COMPLETED",
                      );

                      // Sắp xếp theo thứ tự từ optimizedOrderIds
                      const toStrList = (v) => String(v ?? "");
                      const sorted = [...remaining].sort((a, b) => {
                        if (
                          !optimizedOrderIds ||
                          optimizedOrderIds.length === 0
                        )
                          return 0;
                        const aIdx = optimizedOrderIds.indexOf(toStrList(a.id));
                        const bIdx = optimizedOrderIds.indexOf(toStrList(b.id));
                        if (aIdx === -1 && bIdx === -1) return 0;
                        if (aIdx === -1) return 1;
                        if (bIdx === -1) return -1;
                        return aIdx - bIdx;
                      });
                      const ordered = [
                        ...sorted,
                        ...completed,
                        ...returningOrders,
                      ];
                      return ordered.map((o, idx) => {
                        const cfg = STATUS_CFG[o.status] ?? {
                          label: o.status,
                          color: "text-slate-600 bg-slate-100 border-slate-200",
                        };
                        const canAct =
                          o.status === "DELIVERING" && (o.failCount ?? 0) < 2;
                        const canRet =
                          o.status === "DELIVERING" || o.status === "RETURNING";
                        const isDone =
                          o.status === "COMPLETED" || o.status === "RETURNING";
                        // Tính số thứ tự: đơn còn lại = index từ mảng sorted (đã sắp xếp theo khoảng cách), đơn hoàn thành = 0
                        const orderNum = isDone
                          ? 0
                          : sorted.findIndex((x) => x.id === o.id) + 1;

                        return (
                          <div
                            key={o.id}
                            className={`px-4 py-4 sm:px-5 border-b border-slate-50 last:border-0 ${isDone ? "opacity-60" : ""}`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5
                              ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                              >
                                {isDone ? <CheckCircle2 size={14} /> : orderNum}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-extrabold text-red-700">
                                    {o.id}
                                  </span>
                                  <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${cfg.color}`}
                                  >
                                    {cfg.label}
                                  </span>
                                  {o.failCount > 0 && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md border text-orange-700 bg-orange-50 border-orange-200">
                                      Thất bại {o.failCount}/2
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1.5 text-xs text-slate-500 flex items-start gap-1">
                                  <MapPin
                                    size={11}
                                    className="text-red-400 shrink-0 mt-0.5"
                                  />
                                  <span>
                                    {formatAddress(
                                      o.receiverAddress,
                                      o.receiverWard,
                                      o.receiverDistrict,
                                    )}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Phone size={10} />
                                    {o.receiverPhone || "—"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <DollarSign size={10} />
                                    {Number(
                                      o.finalAmountToCollect || 0,
                                    ).toLocaleString("vi-VN")}
                                    đ
                                  </span>
                                  <span
                                    className={`flex items-center gap-1 font-semibold
                                  ${o.paymentMethod === "COD" ? "text-orange-600" : "text-sky-600"}`}
                                  >
                                    <CreditCard size={10} />
                                    {o.paymentMethod === "COD"
                                      ? "COD"
                                      : "Online"}
                                  </span>
                                </div>
                              </div>

                              {!isDone && (
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-1.5 sm:shrink-0">
                                  {canAct && (
                                    <button
                                      onClick={() => setSelectedModal(o)}
                                      className="px-3 py-2 sm:py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle2 size={12} /> Cập nhật
                                    </button>
                                  )}
                                  {canRet && (
                                    <button
                                      onClick={() => setReturnModal(o)}
                                      className="px-3 py-2 sm:py-1.5 border border-slate-200 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1"
                                    >
                                      <RotateCcw size={12} /> Trả hub
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
