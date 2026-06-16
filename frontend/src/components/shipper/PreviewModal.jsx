import { AlertCircle, Loader2, MapIcon, MapPin, X } from "lucide-react";
import formatAddress from "../utils/formatAddress";
import React, { useEffect, useRef, useState } from "react";
import decodePolyline from "../utils/decodePolyline";
import routingService from "../../services/routingService";
import L from "leaflet";
import { useLayoutEffect } from "react";

export default function PreviewModal({ route, hubCoords, onClose }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const normalizeRouteCoordinates = (coords) => {
    if (!Array.isArray(coords) || coords.length === 0) return [];
    const first = coords[0];
    if (!Array.isArray(first) || first.length < 2) return [];
    const shouldSwap = Math.abs(first[0]) > 90;
    return coords.map(([a, b]) => (shouldSwap ? [b, a] : [a, b]));
  };

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    const deliveryPoints = route.orders
      .filter((o) => o.receiverLat && o.receiverLng)
      .map((o) => ({
        id: o.id,
        lat: o.receiverLat,
        lng: o.receiverLng,
        label: o.receiverName,
      }));

    if (deliveryPoints.length === 0) {
      setError("Các đơn trong tuyến chưa có tọa độ.");
      setLoading(false);
      return;
    }

    const startLat = hubCoords?.lat ?? 21.0;
    const startLng = hubCoords?.lng ?? 105.85;

    routingService
      .routePreview({
        startPoint: {
          id: route.hubId,
          lat: startLat,
          lng: startLng,
          label: route.hubName,
        },
        deliveryPoints,
      })
      .then((res) => setPreview(res.data ?? res))
      .catch(() => setError("Không thể tải tuyến đường."))
      .finally(() => setLoading(false));
  }, [route, hubCoords, currentPos]);

  useLayoutEffect(() => {
    if (!preview || !mapRef.current) return;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
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

    const allPoints = [];

    // Current Shipper position
    const shipperLat = currentPos?.lat;
    const shipperLng = currentPos?.lng;
    if (shipperLat && shipperLng) {
      const shipperIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:14px">🛵</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([shipperLat, shipperLng], { icon: shipperIcon })
        .addTo(map)
        .bindPopup(`<b>📍 Vị trí hiện tại</b>`);
      allPoints.push([shipperLat, shipperLng]);
    }

    // Hub marker
    const hubLat = hubCoords?.lat;
    const hubLng = hubCoords?.lng;
    if (hubLat && hubLng) {
      const hubIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
                 <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='white'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22' fill='white'/></svg>
               </div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([hubLat, hubLng], { icon: hubIcon })
        .addTo(map)
        .bindPopup(
          `<b>🏠 ${route.hubName}</b><br/>${hubCoords.address || ""}${hubCoords.ward ? ", " + hubCoords.ward : ""}${hubCoords.district ? ", " + hubCoords.district : ""}`,
        );
      allPoints.push([hubLat, hubLng]);
    }

    // Build lineCoords
    const lineCoords = [];
    if (shipperLat && shipperLng && hubLat && hubLng) {
      lineCoords.push([shipperLat, shipperLng], [hubLat, hubLng]);
    } else if (hubLat && hubLng) {
      lineCoords.push([hubLat, hubLng]);
    }

    const orderPointMap = new Map(route.orders.map((o) => [o.id, o]));
    const sequence = (preview.optimizedSequence || []).filter(
      (p) => p.id !== route.hubId && !(p.lat === hubLat && p.lng === hubLng),
    );

    sequence.forEach((point, idx) => {
      if (!point.lat || !point.lng) return;
      const num = idx + 1;
      const markerIcon = L.divIcon({
        html: `<div style="width:30px;height:30px;background:#dc2626;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:12px;font-family:monospace;">${num}</div>`,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const orderInfo = orderPointMap.get(point.id);
      const fullAddress = formatAddress(
        orderInfo?.receiverAddress,
        orderInfo?.receiverWard,
        orderInfo?.receiverDistrict,
      );
      L.marker([point.lat, point.lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(
          `<b>#${num} ${point.label || point.id}</b><br/>${fullAddress || "Địa chỉ không xác định"}`,
        );
      lineCoords.push([point.lat, point.lng]);
      allPoints.push([point.lat, point.lng]);
    });

    // OSRM route geometry
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

    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32] });
    }

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
      }
    };
  }, [preview, route, currentPos, hubCoords]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 gap-3 shrink-0">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <MapIcon size={18} className="text-red-500 shrink-0" />
            Tuyến đường tối ưu
          </h2>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between sm:justify-end">
            <div className="flex items-center gap-1">
              <button
                onClick={() => mapInstance.current?.zoomIn()}
                className="p-1 rounded hover:bg-slate-200 text-slate-600 w-7 h-7 flex items-center justify-center border border-slate-200 sm:border-0"
                title="Phóng to"
              >
                <span className="text-base leading-none font-bold">+</span>
              </button>
              <button
                onClick={() => mapInstance.current?.zoomOut()}
                className="p-1 rounded hover:bg-slate-200 text-slate-600 w-7 h-7 flex items-center justify-center border border-slate-200 sm:border-0"
                title="Thu nhỏ"
              >
                <span className="text-base leading-none font-bold">−</span>
              </button>
            </div>
            {preview && (
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="bg-slate-50 rounded-lg px-2.5 py-1 sm:px-4 sm:py-2 text-center border border-slate-100">
                  <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">
                    Quãng đường
                  </div>
                  <div className="text-sm sm:text-lg font-extrabold text-slate-800">
                    {preview.totalDistanceMeters
                      ? (preview.totalDistanceMeters / 1000).toFixed(1)
                      : "?"}{" "}
                    km
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-2.5 py-1 sm:px-4 sm:py-2 text-center border border-slate-100">
                  <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">
                    Thời gian
                  </div>
                  <div className="text-sm sm:text-lg font-extrabold text-slate-800">
                    {preview.totalDurationSeconds
                      ? Math.round(preview.totalDurationSeconds / 60)
                      : "?"}{" "}
                    phút
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 ml-1 sm:ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              <Loader2 size={28} className="animate-spin text-red-400" />
              <span className="ml-3 text-slate-400">Đang tải tuyến đường…</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px] flex-col gap-3 text-slate-400">
              <AlertCircle size={28} />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Map Container */}
              <div
                className="h-[200px] sm:h-[280px] lg:h-auto lg:flex-1 relative shrink-0"
                ref={mapRef}
              />

              {/* Order List Sequence Container */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-100 overflow-y-auto flex-1 lg:flex-none">
                <div className="p-3 sm:p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                    Thứ tự giao hàng
                  </div>

                  <div className="flex items-center gap-3 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl mb-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="white"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" fill="white" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-emerald-800 truncate">
                        {route.hubName}
                      </div>
                      <div className="text-[10px] text-emerald-600">
                        Điểm bắt đầu
                      </div>
                      <div className="text-[10px] text-emerald-500 truncate">
                        {route.hubAddress}
                        {route.hubWard ? `, ${route.hubWard}` : ""}
                        {route.hubDistrict ? `, ${route.hubDistrict}` : ""}
                      </div>
                    </div>
                  </div>

                  {(preview?.optimizedSequence || [])
                    .filter((p) => p.id !== route.hubId)
                    .map((point, i) => {
                      const orderData = route.orders.find(
                        (o) => o.id === point.id,
                      );
                      return (
                        <React.Fragment key={point.id}>
                          <div className="flex justify-center py-0.5">
                            <div className="w-px h-3 bg-slate-200" />
                          </div>
                          <div className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                            <div className="w-7 h-7 rounded-full bg-red-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                              {i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-xs text-red-700 font-bold truncate">
                                {point.id}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {point.label}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {orderData?.receiverPhone || ""}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {formatAddress(
                                  orderData?.receiverAddress,
                                  orderData?.receiverWard,
                                  orderData?.receiverDistrict,
                                )}
                              </div>
                            </div>
                            <MapPin
                              size={12}
                              className="text-slate-300 shrink-0"
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 sm:px-6 sm:py-3 border-t border-slate-100 bg-slate-50 gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-semibold text-slate-500 justify-center sm:justify-start">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Hub xuất phát</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span>Điểm giao hàng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-5 bg-emerald-500 shrink-0" />
              <span>Tuyến đường</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
