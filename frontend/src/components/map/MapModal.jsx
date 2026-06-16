import formatAddress from "../utils/formatAddress";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import decodePolyline from "../utils/decodePolyline";
import trackingService from "../../services/trackingService";
import { Phone, X, Navigation } from "lucide-react";

export default function MapModal({ order, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const pollingRef = useRef(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [shipperPos, setShipperPos] = useState(null);
  const [gpsOff, setGpsOff] = useState(false);

  const dest = {
    lat: order.receiverLat,
    lng: order.receiverLng,
    label: formatAddress(
      order.receiverAddress,
      order.receiverWard,
      order.receiverDistrict,
    ),
  };

  // Shipper Marker
  const shipperIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="17" fill="#2563eb" stroke="white" stroke-width="2"/>
    <text x="18" y="23" text-anchor="middle" font-size="20">🛵</text>
  </svg>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  //  Destination Marker
  const destIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#dc2626" stroke="white" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" font-size="16" fill="white">📍</text>
  </svg>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  useEffect(() => {
    if (!mapRef.current) return;

    const container = mapRef.current;
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
      { attribution: "&copy; OpenStreetMap contributors" },
    );
    tileLayer.addTo(map);
    tileLayer.on("load", () => map.invalidateSize());
    map.on("moveend", () => map.invalidateSize());
    map.on("zoomend", () => map.invalidateSize());

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
  }, []);

  const fetchRoute = async (startLat, startLng) => {
    if (!startLat || !startLng || !dest.lat || !dest.lng) return;
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/bicycle/${startLng},${startLat};${dest.lng},${dest.lat}?overview=full&geometries=polyline`,
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const geometry = decodePolyline(data.routes[0].geometry, 5);
        if (geometry && geometry.length > 0) {
          setRouteGeometry(geometry);
        }
      }
    } catch (e) {
      setRouteGeometry([
        [startLat, startLng],
        [dest.lat, dest.lng],
      ]);
    }
  };

  // Lấy vị trí Shipper mỗi 10 giây
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await trackingService.getShipperLocationByOrder(order.id);
        const data = res.data;
        if (!data || data.lat == null || data.lng == null) {
          setShipperPos(null);
          setGpsOff(true);
          return;
        }
        const pos = { lat: data.lat, lng: data.lng };
        setShipperPos(pos);
        setGpsOff(false);
        await fetchRoute(pos.lat, pos.lng);
      } catch (e) {
        setShipperPos(null);
        setGpsOff(true);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 10000);
    return () => clearInterval(pollingRef.current);
  }, [order.id]);

  // Xoá và vẽ lại tuyến đường khi state thay đổi
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    if (gpsOff || !shipperPos) {
      L.marker([dest.lat, dest.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(
          `<b>📍 Điểm nhận hàng</b><br/>${dest.label}<br/><span style="font-size:11px">☎ ${order.receiverPhone || ""}</span>`,
        )
        .openPopup();
      map.setView([dest.lat, dest.lng], 15);
      return;
    }

    // Vẽ polyline
    if (routeGeometry && routeGeometry.length > 0) {
      const fullRoute = [[shipperPos.lat, shipperPos.lng], ...routeGeometry];
      L.polyline(fullRoute, {
        color: "#16a34a",
        weight: 4,
        opacity: 0.85,
      }).addTo(map);
    }

    // Destination marker
    L.marker([dest.lat, dest.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(
        `<b>📍 Điểm nhận hàng</b><br/>${dest.label}<br/><span style="font-size:11px">☎ ${order.receiverPhone || ""}</span>`,
      );

    // Shipper marker
    L.marker([shipperPos.lat, shipperPos.lng], { icon: shipperIcon })
      .addTo(map)
      .bindPopup(`<b>🛵 Shipper</b>`);

    // Fit bounds to show both markers
    const bounds = L.latLngBounds([
      [shipperPos.lat, shipperPos.lng],
      [dest.lat, dest.lng],
    ]);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [shipperPos, routeGeometry, gpsOff, dest]);

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex flex-col sm:flex-row items-start sm:items-center justify-center p-2 sm:p-4 pt-16 sm:pt-20 md:pt-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-xl lg:max-w-2xl overflow-hidden mt-2 sm:mt-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Navigation size={16} className="text-blue-600" />
            <span className="text-sm font-bold text-slate-800">
              Theo dõi hành trình
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Order info */}
        <div className="px-4 py-2 bg-slate-50 flex items-center gap-3 text-xs text-slate-600">
          <span className="font-mono font-bold text-red-700">{order.id}</span>
          <span>·</span>
          <span className="font-medium">{order.receiverName}</span>
          <span>·</span>
          <Phone size={11} />
          <span>{order.receiverPhone}</span>
          {gpsOff && (
            <>
              <span>·</span>
              <span className="text-orange-600 font-semibold flex items-center gap-1">
                ⚠ Tắt định vị
              </span>
            </>
          )}
        </div>

        {/* Map */}
        <div className="relative h-[50vh] sm:h-[60vh] lg:h-[50vh]">
          <div ref={mapRef} className="w-full h-full" />

          {!shipperPos && !gpsOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-[500]">
              <div className="text-center">
                <div className="text-sm text-slate-500 font-medium mb-1">
                  Shipper chưa bật định vị
                </div>
                <div className="text-xs text-slate-400">
                  Vị trí sẽ hiển thị khi shipper mở GPS
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            Shipper
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            Điểm nhận
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-0.5 bg-green-600 inline-block" />
            Tuyến đường
          </span>
        </div>
      </div>
    </div>
  );
}
