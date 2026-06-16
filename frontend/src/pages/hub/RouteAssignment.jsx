import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Route,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  MapPin,
  X,
  Map as MapIcon,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import orderService from "../../services/orderService";
import routingService from "../../services/routingService";
import hubService from "../../services/hubService";
import trackingService from "../../services/trackingService";
import normalizeRouteCoordinates from "../../components/utils/normalizeRouteCoordinates";
import formatAddress from "../../components/utils/formatAddress";
import decodePolyline from "../../components/utils/decodePolyline";

const PAY_BADGE = {
  COD: "text-orange-700 bg-orange-50 border-orange-200",
  ONLINE_PAYMENT: "text-sky-700 bg-sky-50 border-sky-200",
};

const getOrderAddress = (order) =>
  order
    ? formatAddress(
        order.address ?? order.receiverAddress,
        order.ward ?? order.receiverWard,
        order.district ?? order.receiverDistrict,
      )
    : "";

const getRouteGeometry = (previewData) => {
  if (!previewData) return null;

  const geometryPaths = [
    previewData.route?.geometry,
    previewData.routes?.[0]?.geometry,
    previewData.routeGeometry,
    previewData.geometry,
    previewData.route?.shape,
    previewData.routes?.[0]?.shape,
  ];

  for (const geometry of geometryPaths) {
    if (!geometry) continue;

    if (typeof geometry === "string") {
      const decoded5 = decodePolyline(geometry, 5);
      if (decoded5.length > 0 && Math.abs(decoded5[0][0]) <= 90) {
        return decoded5;
      }
      const decoded6 = decodePolyline(geometry, 6);
      return decoded6;
    }

    if (Array.isArray(geometry)) {
      const decoded = normalizeRouteCoordinates(geometry);
      if (decoded.length > 0) return decoded;
    }

    if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
      const decoded = normalizeRouteCoordinates(geometry.coordinates);
      if (decoded.length > 0) return decoded;
    }
  }

  return null;
};

export default function RouteAssignment() {
  const [hub, setHub] = useState(null);

  const hubId = hub?.id || hub?.hubId;
  const HUB_LAT = hub?.lat;
  const HUB_LNG = hub?.lng;
  const hubName = hub?.name || "Hub xuất phát";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [nearbyShippers, setNearbyShippers] = useState(null);

  const previewMapRef = useRef(null);
  const previewMapInstance = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchHub = async () => {
      try {
        const res = await hubService.getMyHub();
        const data = res.data ?? res;
        setHub(data);
      } catch {
        showToast("Không lấy được thông tin hub", "error");
      }
    };
    fetchHub();
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!hubId) return;

    try {
      setLoading(true);
      const res = await orderService.getInventoryAtHub(hubId, {
        status: "AT_HUB",
        page: 0,
        size: 500,
      });
      setOrders(
        (res.data.content || [])
          .filter((o) => !o.routeId)
          .map((o) => ({
            id: o.id,
            receiver: o.receiverName,
            phone: o.receiverPhone,
            productName: o.productName,
            imageUrl: o.imageUrl,
            address: o.receiverAddress,
            ward: o.receiverWard,
            district: o.receiverDistrict,
            lat: o.receiverLat,
            lng: o.receiverLng,
            weight: o.weight,
            payment: o.paymentMethod,
            finalAmount: o.finalAmountToCollect,
          })),
      );
    } finally {
      setLoading(false);
    }
  }, [hubId]);

  useEffect(() => {
    if (hubId) fetchOrders();
  }, [hubId, fetchOrders]);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const keyword = search.toLowerCase();
        return (
          o.id.toLowerCase().includes(keyword) ||
          (o.receiver || "").toLowerCase().includes(keyword) ||
          (o.address || "").toLowerCase().includes(keyword) ||
          (o.ward || "").toLowerCase().includes(keyword) ||
          (o.district || "").toLowerCase().includes(keyword)
        );
      }),
    [orders, search],
  );

  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const selectedOrders = selected
    .map((id) => orders.find((o) => o.id === id))
    .filter(Boolean);

  const previewPointMap = useMemo(
    () => new Map(selectedOrders.map((o) => [o.id, o])),
    [selectedOrders],
  );

  useLayoutEffect(() => {
    if (!showPreviewModal || !preview || !previewMapRef.current) return;
    if (previewMapInstance.current) {
      previewMapInstance.current.remove();
      previewMapInstance.current = null;
    }

    const map = L.map(previewMapRef.current, {
      zoomControl: false,
      minZoom: 8,
      maxZoom: 16,
      maxBounds: [
        [8.5, 102],
        [23.5, 110],
      ],
      maxBoundsViscosity: 1.0,
    });
    previewMapInstance.current = map;
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

    const allPoints = [];

    // Hub marker
    if (HUB_LAT && HUB_LNG) {
      const hubIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
                 <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='white'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22' fill='white'/></svg>
               </div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const hubAddress = formatAddress(hub?.address, hub?.ward, hub?.district);
      L.marker([HUB_LAT, HUB_LNG], { icon: hubIcon })
        .addTo(map)
        .bindPopup(`<b>🏠 ${hubName}</b><br/>${hubAddress || "Hub bắt đầu"}`);
      allPoints.push([HUB_LAT, HUB_LNG]);
    }

    // Delivery point markers
    const sequence = (preview.optimizedSequence || []).filter(
      (point) =>
        point.id !== hubId && !(point.lat === HUB_LAT && point.lng === HUB_LNG),
    );
    const lineCoords = HUB_LAT && HUB_LNG ? [[HUB_LAT, HUB_LNG]] : [];

    sequence.forEach((point, idx) => {
      if (!point.lat || !point.lng) return;
      const num = idx + 1;
      const markerIcon = L.divIcon({
        html: `<div style="width:30px;height:30px;background:#dc2626;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:12px;font-family:monospace;">${num}</div>`,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const orderInfo = previewPointMap.get(point.id);
      const pointAddress = getOrderAddress(orderInfo);
      L.marker([point.lat, point.lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(
          `<b>#${num} ${point.label || point.id}</b><br/>${pointAddress || "Địa chỉ không xác định"}`,
        );
      lineCoords.push([point.lat, point.lng]);
      allPoints.push([point.lat, point.lng]);
    });

    const routeGeometry = getRouteGeometry(preview);
    if (routeGeometry && routeGeometry.length > 1) {
      L.polyline(routeGeometry, {
        color: "#16a34a",
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
    } else if (lineCoords.length > 1) {
      L.polyline(lineCoords, {
        color: "#dc2626",
        weight: 3,
        opacity: 0.75,
        dashArray: "8, 6",
      }).addTo(map);
    }

    // Shipper markers
    if (nearbyShippers && Array.isArray(nearbyShippers)) {
      nearbyShippers.forEach((shipper) => {
        if (!shipper.lat || !shipper.lng) return;
        const shipperIcon = L.divIcon({
          html: `<div style="width:24px;height:24px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
                  <svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='white'><path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M22 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>
                </div>`,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([shipper.lat, shipper.lng], { icon: shipperIcon })
          .addTo(map)
          .bindPopup(
            `<b>🚚 Shipper</b><br/>${shipper.shipperId || "ID không xác định"}`,
          );
        allPoints.push([shipper.lat, shipper.lng]);
      });
    }

    // Fit map to all markers
    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32] });
    }

    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 600);

    return () => {
      tileLayer.off("load");
      map.off("moveend");
      map.off("zoomend");
      if (previewMapInstance.current) {
        previewMapInstance.current.remove();
        previewMapInstance.current = null;
      }
    };
  }, [
    showPreviewModal,
    preview,
    HUB_LAT,
    HUB_LNG,
    hubId,
    hubName,
    hub,
    previewPointMap,
    nearbyShippers,
  ]);

  const totalWeight = selectedOrders.reduce((s, o) => s + (o.weight || 0), 0);
  const totalAmount = selectedOrders.reduce(
    (s, o) => s + (o.finalAmount || 0),
    0,
  );

  // Check for missing coordinates
  const ordersWithoutCoordinates = useMemo(() => {
    return selectedOrders.filter((o) => !o.lat || !o.lng);
  }, [selectedOrders]);

  const isValid = selected.length >= 5 && selected.length <= 10;

  const handlePreview = async () => {
    if (!isValid || !hub) return;

    try {
      setPreviewing(true);

      const deliveryPoints = selectedOrders
        .filter((o) => o.lat && o.lng)
        .map((o) => ({ id: o.id, lat: o.lat, lng: o.lng, label: o.receiver }));

      const res = await routingService.routePreview({
        startPoint: {
          id: hubId,
          lat: HUB_LAT,
          lng: HUB_LNG,
          label: hub?.name || "Hub",
        },
        deliveryPoints,
      });

      setPreview(res.data ?? res);
      setShowPreviewModal(true);
    } catch {
      showToast("Không thể tải preview tuyến đường", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleAssign = async () => {
    if (!isValid || !hubId) return;

    if (ordersWithoutCoordinates.length > 0) {
      showToast(
        `${ordersWithoutCoordinates.length} đơn không có tọa độ giao hàng. Vui lòng bỏ chọn chúng hoặc cập nhật địa chỉ.`,
        "error",
      );
      return;
    }

    try {
      setAssigning(true);

      await orderService.assignOrdersToRoute(hubId, {
        orderIds: selected,
      });

      if (HUB_LAT && HUB_LNG) {
        try {
          const shipperRes = await trackingService.getNearbyShippers({
            lat: HUB_LAT,
            lng: HUB_LNG,
            radiusKm: 5,
          });
          setNearbyShippers(shipperRes.data ?? shipperRes);
        } catch (err) {
          console.error("Lỗi fetch shipper ở gần:", err);
        }
      }

      showToast(
        `Đã gán ${selected.length} đơn vào tuyến mới. Hệ thống đang tính toán đường đi tự động.`,
        "success",
      );

      setSelected([]);
      setPreview(null);
      fetchOrders();
    } catch (e) {
      const errorMsg = e?.response?.data?.message || "Gán tuyến thất bại";
      showToast(errorMsg, "error");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex justify-center bg-slate-50">
        <div className="w-full max-w-7xl px-2 sm:px-3 md:px-5 pt-20 sm:pt-24 pb-6">
          {toast && (
            <div
              className={`fixed top-3 left-3 right-3 sm:left-auto sm:top-5 sm:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {toast.msg}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Phân tuyến giao hàng
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Chọn 5–10 đơn tồn kho để tạo một tuyến giao cho Shipper
              </p>
            </div>
            <button
              onClick={fetchOrders}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 shrink-0"
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>

          {/* Quick actions */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const availableOrders = filtered.map((o) => o.id);
                const shuffled = [...availableOrders].sort(
                  () => Math.random() - 0.5,
                );
                const random5 = shuffled.slice(0, 5);
                setSelected(random5);
              }}
              disabled={filtered.length < 5}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Chọn ngẫu nhiên 5 đơn"
            >
              <Shuffle size={14} /> Ngẫu nhiên 5
            </button>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-red-200 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <X size={14} /> Bỏ chọn ({selected.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Order list */}
            <div className="xl:col-span-2 space-y-4">
              {/* Search */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    placeholder="Tìm mã đơn hoặc người nhận…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs text-slate-400 self-end sm:self-auto">
                  {filtered.length} đơn chờ phân tuyến
                </span>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-red-400" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-2">
                    <Package size={28} strokeWidth={1.5} />
                    <span className="text-sm">
                      Không có đơn nào chờ phân tuyến
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                          <th className="w-10 px-3 py-3" />
                          <th className="px-3 py-3 text-left whitespace-nowrap">
                            Mã đơn
                          </th>
                          <th className="px-3 py-3 text-left whitespace-nowrap">
                            Sản phẩm
                          </th>
                          <th className="px-3 py-3 text-left">
                            Người nhận / Địa chỉ
                          </th>
                          <th className="px-3 py-3 text-right whitespace-nowrap">
                            Khối lượng
                          </th>
                          <th className="px-3 py-3 text-right whitespace-nowrap">
                            Thu hộ
                          </th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">
                            Thanh toán
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filtered.map((o) => (
                          <tr
                            key={o.id}
                            onClick={() => toggleSelect(o.id)}
                            className={`cursor-pointer hover:bg-red-50/40 transition-colors
                        ${
                          selected.includes(o.id)
                            ? "bg-red-50/60 border-l-2 border-l-red-400"
                            : ""
                        }`}
                          >
                            <td className="px-3 py-3">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                          ${
                            selected.includes(o.id)
                              ? "bg-red-600 border-red-600"
                              : "border-slate-300"
                          }`}
                              >
                                {selected.includes(o.id) && (
                                  <CheckCircle2
                                    size={12}
                                    className="text-white"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-red-700 font-bold whitespace-nowrap">
                              <div className="flex flex-col leading-tight">
                                <span>{o.id.slice(0, 12)}</span>
                                <span>{o.id.slice(12) || ""}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 min-w-[180px]">
                                {o.imageUrl ? (
                                  <img
                                    src={o.imageUrl}
                                    alt={o.productName || "Sản phẩm"}
                                    className="h-10 w-10 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 flex items-center justify-center shrink-0">
                                    <Package size={16} />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-800 truncate">
                                    {o.productName || "—"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="font-medium text-slate-800 text-sm">
                                {o.receiver}
                              </div>
                              <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-1">
                                <div className="flex items-center gap-1">
                                  <MapPin size={10} />
                                  <span>{o.address}</span>
                                </div>
                                <span className="text-slate-400 ml-4">
                                  {o.ward}
                                  {o.ward && o.district ? ", " : ""}
                                  {o.district}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600 font-medium whitespace-nowrap">
                              {o.weight}kg
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                              {Number(o.finalAmount).toLocaleString("vi-VN")}đ
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-md border ${
                                  PAY_BADGE[o.payment] ||
                                  "text-slate-600 bg-slate-100 border-slate-200"
                                }`}
                              >
                                {o.payment === "COD" ? "COD" : "Online"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment panel */}
            <div className="space-y-4">
              {/* Counter */}
              <div
                className={`rounded-xl border p-5 transition-colors
            ${
              isValid
                ? "bg-red-50 border-red-200"
                : "bg-white border-slate-100 shadow-sm"
            }`}
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Đơn đã chọn
                </div>
                <div
                  className={`text-5xl font-extrabold tracking-tight mb-1 ${
                    isValid ? "text-red-600" : "text-slate-300"
                  }`}
                >
                  {selected.length}
                </div>
                <div className="text-sm text-slate-500 mb-4">
                  / 5–10 đơn hợp lệ
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-4">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isValid ? "bg-red-500" : "bg-slate-300"
                    }`}
                    style={{
                      width: `${Math.min((selected.length / 10) * 100, 100)}%`,
                    }}
                  />
                </div>

                {selected.length > 0 && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Tổng khối lượng</span>
                      <span className="font-semibold">
                        {totalWeight.toFixed(1)} kg
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tổng thu hộ</span>
                      <span className="font-semibold">
                        {totalAmount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handlePreview}
                disabled={!isValid || previewing || !hub}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-900 text-sm font-bold text-slate-900 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {previewing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <MapIcon size={15} />
                )}
                Xem trước tuyến đường
              </button>

              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
                <button
                  onClick={handleAssign}
                  disabled={!isValid || assigning || !hubId}
                  className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {assigning ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Route size={15} />
                  )}
                  Tạo tuyến mới
                </button>

                {!isValid && selected.length > 0 && (
                  <div className="space-y-2">
                    {selected.length < 5 || selected.length > 10 ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={11} />
                        {selected.length < 5
                          ? `Cần thêm ${5 - selected.length} đơn nữa`
                          : `Quá 10 đơn (bỏ ${selected.length - 10})`}
                      </p>
                    ) : null}
                    {ordersWithoutCoordinates.length > 0 && (
                      <p className="text-xs text-orange-500 flex items-center gap-1">
                        <AlertCircle size={11} />
                        {ordersWithoutCoordinates.length} đơn thiếu tọa độ giao
                        hàng
                      </p>
                    )}
                  </div>
                )}
              </div>

              {selected.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Danh sách đã chọn
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {selected.map((id, i) => (
                      <div key={id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-red-700 font-semibold truncate">
                            {id}
                          </div>
                          <div className="text-slate-400 truncate">
                            {(() => {
                              const o = orders.find((x) => x.id === id);
                              return o
                                ? `${o.receiver} · ${o.address}${o.ward ? ", " + o.ward : ""}${o.district ? ", " + o.district : ""}`
                                : "";
                            })()}
                          </div>
                          <div className="text-slate-400 truncate">
                            {(() => {
                              const o = orders.find((x) => x.id === id);
                              return o?.phone || "";
                            })()}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleSelect(id)}
                          className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Modal */}
          {showPreviewModal && preview && (
            <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center px-2 py-3 sm:px-4 sm:py-6 overflow-hidden mt-10">
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-3rem)] lg:h-[min(760px,calc(100vh-3rem))] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex flex-col gap-2 px-3 py-2.5 pr-10 border-b border-slate-100 sm:gap-3 sm:px-6 sm:py-4 sm:pr-12 lg:flex-row lg:items-center lg:justify-between">
                  <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <MapIcon size={18} className="text-red-500" />
                    Tuyến đường tối ưu
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 order-2 sm:order-none">
                      <button
                        onClick={() => previewMapInstance.current?.zoomIn()}
                        className="p-1 rounded hover:bg-slate-200 text-slate-600 w-7 h-7 flex items-center justify-center"
                        title="Phóng to"
                      >
                        <span className="text-base leading-none font-bold">
                          +
                        </span>
                      </button>
                      <button
                        onClick={() => previewMapInstance.current?.zoomOut()}
                        className="p-1 rounded hover:bg-slate-200 text-slate-600 w-7 h-7 flex items-center justify-center"
                        title="Thu nhỏ"
                      >
                        <span className="text-base leading-none font-bold">
                          −
                        </span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs flex-1 min-w-0 sm:flex-none sm:flex sm:items-center sm:gap-5 sm:text-sm">
                      <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center sm:px-4 sm:py-2">
                        <div className="text-[10px] leading-tight text-slate-400 mb-0.5 sm:text-xs">
                          Tổng quãng đường
                        </div>
                        <div className="text-sm sm:text-lg font-extrabold text-slate-800">
                          {(preview.totalDistanceMeters / 1000).toFixed(1)} km
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center sm:px-4 sm:py-2">
                        <div className="text-[10px] leading-tight text-slate-400 mb-0.5 sm:text-xs">
                          Thời gian dự kiến
                        </div>
                        <div className="text-sm sm:text-lg font-extrabold text-slate-800">
                          {Math.round(preview.totalDurationSeconds / 60)} phút
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:right-4 sm:top-4"
                >
                  <X size={18} />
                </button>

                {/* Modal Body: Map + Route List */}
                <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
                  {/* Map */}
                  <div
                    className="h-[38vh] min-h-20 w-full shrink-0 sm:h-[44vh] sm:min-h-70 md:h-[42vh] lg:h-auto lg:min-h-0 lg:flex-1"
                    ref={previewMapRef}
                  />

                  {/* Route List */}
                  <div className="min-h-0 w-full flex-1 overflow-y-auto border-t border-slate-100 lg:w-72 lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0">
                    <div className="px-4 pt-4 pb-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                        Thứ tự giao hàng
                      </div>

                      {/* Hub start */}
                      <div className="flex items-center gap-3 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl mb-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="white"
                          >
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline
                              points="9 22 9 12 15 12 15 22"
                              fill="white"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-emerald-800 truncate">
                            {hub?.name || "Hub xuất phát"}
                          </div>
                          <div className="text-xs text-emerald-600">
                            Điểm bắt đầu
                          </div>
                        </div>
                      </div>

                      {(preview.optimizedSequence || [])
                        .filter(
                          (point) =>
                            point.id !== hubId &&
                            !(point.lat === HUB_LAT && point.lng === HUB_LNG),
                        )
                        .map((point, i) => (
                          <React.Fragment key={point.id}>
                            <div className="flex justify-center py-0.5">
                              <div className="w-px h-4 bg-slate-200" />
                            </div>
                            <div className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                                {i + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-xs text-red-700 font-bold truncate">
                                  {point.id}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {point.label}
                                </div>
                              </div>
                              <MapPin
                                size={12}
                                className="text-slate-300 shrink-0"
                              />
                            </div>
                          </React.Fragment>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      Hub xuất phát
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Điểm giao hàng
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-0.5 w-6 bg-emerald-500" />
                      Tuyến đường
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="w-full px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors sm:w-auto"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
