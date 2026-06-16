import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Package,
  Phone,
  User,
  CheckCircle,
  CreditCard,
  Image as ImageIcon,
  AlertCircle,
  MapPinHouse,
  X,
  ArrowLeft,
} from "lucide-react";
import orderService from "../../services/orderService";
import { useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HANOI_DISTRICTS } from "../../constants/hanoiDistricts";
import getDistrictLabel from "../../components/utils/getDistrictLabel";
import getCoordinates from "../../components/utils/getCoordinates";

export default function EditOrder() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const getDistrictValue = (input) => {
    if (!input) return "";
    const cleanInput = input.trim().toLowerCase();
    if (HANOI_DISTRICTS.some((d) => d.value === input)) {
      return input;
    }
    let found = HANOI_DISTRICTS.find(
      (d) => d.label.toLowerCase() === cleanInput,
    );
    if (found) return found.value;
    found = HANOI_DISTRICTS.find(
      (d) =>
        d.label
          .replace(/^Quận\s*/, "")
          .replace(/^Huyện\s*/, "")
          .toLowerCase() === cleanInput ||
        d.label.replace(/^Quận\s*/, "").toLowerCase() === cleanInput,
    );
    if (found) return found.value;
    return input;
  };

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const fileInputRef = useRef(null);

  const senderMarkerRef = useRef(null);
  const receiverMarkerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const [senderGeoError, setSenderGeoError] = useState("");
  const [receiverGeoError, setReceiverGeoError] = useState("");

  const [senderCoords, setSenderCoords] = useState(null);
  const [receiverCoords, setReceiverCoords] = useState(null);

  const [pricing, setPricing] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  const [formData, setFormData] = useState({
    senderName: "",
    senderPhone: "",
    senderAddress: "",
    senderProvince: "Hà Nội",
    senderDistrict: "",
    senderWard: "",

    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    receiverProvince: "Hà Nội",
    receiverDistrict: "",
    receiverWard: "",

    productName: "",
    weight: 1.0,
    length: 10,
    width: 10,
    height: 10,
    orderValue: 0,
    codAmount: 0,

    serviceCode: "FAST",
    paymentMethod: "COD",
    note: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // LOAD ORDER DATA
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setFetching(true);
        const res = await orderService.getOrderById(orderId);
        const data = res.data || res;

        setFormData({
          senderName: data.senderName || "",
          senderPhone: data.senderPhone || "",
          senderAddress: data.senderAddress || "",
          senderProvince: data.senderProvince || "Hà Nội",
          senderDistrict: getDistrictValue(data.senderDistrict) || "",
          senderWard: data.senderWard || "",

          receiverName: data.receiverName || "",
          receiverPhone: data.receiverPhone || "",
          receiverAddress: data.receiverAddress || "",
          receiverProvince: data.receiverProvince || "Hà Nội",
          receiverDistrict: getDistrictValue(data.receiverDistrict) || "",
          receiverWard: data.receiverWard || "",

          productName: data.productName || "",
          weight: data.weight || 1.0,
          length: data.length || 10,
          width: data.width || 10,
          height: data.height || 10,
          orderValue: data.orderValue != null ? Number(data.orderValue) : 0,
          codAmount: data.codAmount != null ? Number(data.codAmount) : 0,

          serviceCode: data.serviceCode || "FAST",
          paymentMethod: data.paymentMethod || "COD",
          note: data.note || "",
        });

        if (data.imageUrl) setImagePreview(data.imageUrl);

        if (data.senderLat && data.senderLng) {
          setSenderCoords({ lat: data.senderLat, lng: data.senderLng });
        }
        if (data.receiverLat && data.receiverLng) {
          setReceiverCoords({ lat: data.receiverLat, lng: data.receiverLng });
        }
      } catch (err) {
        setError("Không thể tải thông tin đơn hàng.");
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    if (orderId) loadOrder();
  }, [orderId]);

  // MAP INIT
  useLayoutEffect(() => {
    if (fetching || !mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      minZoom: 8,
      maxZoom: 16,
      maxBounds: [
        [8.5, 102],
        [23.5, 110],
      ],
      maxBoundsViscosity: 1.0,
    }).setView([21.0285, 105.8542], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance.current);
  }, [fetching]);

  // MARKERS
  useEffect(() => {
    if (!mapInstance.current) return;

    if (senderMarkerRef.current) {
      senderMarkerRef.current.remove();
      senderMarkerRef.current = null;
    }
    if (receiverMarkerRef.current) {
      receiverMarkerRef.current.remove();
      receiverMarkerRef.current = null;
    }

    if (senderCoords) {
      const greenIcon = L.divIcon({
        html: `<div style="width:18px;height:18px;background:#10b981;border:3px solid white;border-radius:999px;box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>`,
        className: "",
        iconSize: [18, 18],
      });
      senderMarkerRef.current = L.marker([senderCoords.lat, senderCoords.lng], {
        icon: greenIcon,
      })
        .addTo(mapInstance.current)
        .bindPopup("📦 Người gửi");
    }

    if (receiverCoords) {
      const redIcon = L.divIcon({
        html: `<div style="width:18px;height:18px;background:#dc2626;border:3px solid white;border-radius:999px;box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>`,
        className: "",
        iconSize: [18, 18],
      });
      receiverMarkerRef.current = L.marker(
        [receiverCoords.lat, receiverCoords.lng],
        { icon: redIcon },
      )
        .addTo(mapInstance.current)
        .bindPopup("📍 Người nhận");
    }

    if (senderCoords && receiverCoords) {
      const bounds = L.latLngBounds([
        [senderCoords.lat, senderCoords.lng],
        [receiverCoords.lat, receiverCoords.lng],
      ]);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (senderCoords || receiverCoords) {
      const point = senderCoords || receiverCoords;
      mapInstance.current.flyTo([point.lat, point.lng], 14);
    }

    setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 300);
  }, [senderCoords, receiverCoords]);

  // Auto geocoding Sender
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (
        formData.senderAddress?.trim() &&
        formData.senderWard?.trim() &&
        formData.senderDistrict
      ) {
        setSenderGeoError("");

        const coords = await getCoordinates({
          address: formData.senderAddress,
          ward: formData.senderWard,
          district: getDistrictLabel(formData.senderDistrict),
          type: "sender",
        });

        if (coords) {
          setSenderCoords(coords);
          setSenderGeoError("");
        } else {
          setSenderCoords(null);
          setSenderGeoError(
            "Không tìm thấy vị trí người gửi. Vui lòng kiểm tra lại địa chỉ.",
          );
        }
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [formData.senderAddress, formData.senderWard, formData.senderDistrict]);

  // Auto geocoding Receiver
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (
        formData.receiverAddress?.trim() &&
        formData.receiverWard?.trim() &&
        formData.receiverDistrict
      ) {
        setReceiverGeoError("");

        const coords = await getCoordinates({
          address: formData.receiverAddress,
          ward: formData.receiverWard,
          district: getDistrictLabel(formData.receiverDistrict),
          type: "receiver",
        });

        if (coords) {
          setReceiverCoords(coords);
          setReceiverGeoError("");
        } else {
          setReceiverCoords(null);
          setReceiverGeoError(
            "Không tìm thấy vị trí người nhận. Vui lòng kiểm tra lại địa chỉ.",
          );
        }
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [
    formData.receiverAddress,
    formData.receiverWard,
    formData.receiverDistrict,
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errors = {};
    const required = [
      "senderName",
      "senderPhone",
      "senderDistrict",
      "senderWard",
      "senderAddress",
      "receiverName",
      "receiverPhone",
      "receiverDistrict",
      "receiverWard",
      "receiverAddress",
      "productName",
    ];

    required.forEach((field) => {
      if (!String(formData[field]).trim()) {
        errors[field] = "Trường này không được để trống";
      }
    });

    console.log("Field Errors:", errors);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleViewPrice = async () => {
    setPriceError("");
    setPricing(null);

    if (!validateForm()) {
      setPriceError(
        "Vui lòng điền đầy đủ thông tin bắt buộc trước khi xem giá.",
      );
      return;
    }

    if (senderGeoError || receiverGeoError) {
      setPriceError(
        "Vui lòng sửa lỗi địa chỉ người gửi/nhận trước khi xem giá.",
      );
      return;
    }

    setPriceLoading(true);

    try {
      const priceFormData = new FormData();
      Object.keys(formData).forEach((key) => {
        priceFormData.append(key, formData[key]);
      });

      const response = await orderService.calculatePrice(priceFormData);
      setPricing(response.data);
    } catch (err) {
      console.error("Lỗi tính giá:", err);
      setPriceError(
        err.response?.data?.message ||
          "Không thể tính giá lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setPriceLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    if (senderGeoError) {
      setError("Vui lòng sửa địa chỉ người gửi hợp lệ trước khi cập nhật");
      setLoading(false);
      return;
    }
    if (receiverGeoError) {
      setError("Vui lòng sửa địa chỉ người nhận hợp lệ trước khi cập nhật");
      setLoading(false);
      return;
    }

    try {
      const senderCoordsResult =
        senderCoords ||
        (await getCoordinates({
          address: formData.senderAddress,
          ward: formData.senderWard,
          district: formData.senderDistrict,
          type: "sender",
        }));

      const receiverCoordsResult =
        receiverCoords ||
        (await getCoordinates({
          address: formData.receiverAddress,
          ward: formData.receiverWard,
          district: formData.receiverDistrict,
          type: "receiver",
        }));

      if (!senderCoordsResult) {
        setError(
          "Không tìm thấy tọa độ người gửi. Vui lòng nhập địa chỉ rõ hơn.",
        );
        setLoading(false);
        return;
      }
      if (!receiverCoordsResult) {
        setError(
          "Không tìm thấy tọa độ người nhận. Vui lòng nhập địa chỉ rõ hơn.",
        );
        setLoading(false);
        return;
      }

      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });

      submitData.append("senderLat", senderCoordsResult.lat);
      submitData.append("senderLng", senderCoordsResult.lng);
      submitData.append("receiverLat", receiverCoordsResult.lat);
      submitData.append("receiverLng", receiverCoordsResult.lng);

      if (imageFile) {
        submitData.append("imageFile", imageFile);
      }

      await orderService.updateOrder(orderId, submitData);

      setSuccess(true);
      setTimeout(() => navigate("/customer/orders"), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Cập nhật đơn hàng thất bại!");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 mt-4">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-base max-w-lg mx-auto text-center py-16 mt-10"
      >
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black">Cập nhật đơn hàng thành công!</h2>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-4xl mx-auto space-y-6 pb-12"
    >
      {/* Header, nút Quay lại */}
      <div className="flex flex-row items-start justify-between gap-3 mb-2">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-[#801B29]/10 rounded-xl shrink-0">
            <Package className="text-[#801B29] w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cập nhật đơn hàng
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
              Mạng lưới vận chuyển khu vực Hà Nội
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/customer/orders")}
          className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Quay lại</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Thông báo lỗi geocoding */}
      {(senderGeoError || receiverGeoError) && (
        <div className="space-y-2">
          {senderGeoError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={18} /> {senderGeoError}
            </div>
          )}
          {receiverGeoError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={18} /> {receiverGeoError}
            </div>
          )}
        </div>
      )}

      {/* MAP */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-800 uppercase">
            Bản đồ định vị
          </h3>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" /> Người gửi
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" /> Người nhận
            </div>
          </div>
        </div>
        <div ref={mapRef} className="w-full h-[350px] rounded-2xl z-10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin gửi + nhận */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Người gửi */}
          <div className="card-base space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 mb-4">
              <MapPinHouse size={16} className="text-blue-500" />
              Thông tin gửi
            </h3>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleInputChange}
                  className="input-base w-full !pl-12"
                  placeholder="Tên người gửi"
                  required
                />
                {fieldErrors.senderName && (
                  <p className="text-red-500 text-xs mt-1">
                    {fieldErrors.senderName}
                  </p>
                )}
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="tel"
                  name="senderPhone"
                  value={formData.senderPhone}
                  onChange={handleInputChange}
                  className="input-base w-full !pl-12"
                  placeholder="Số điện thoại"
                  required
                />
                {fieldErrors.senderPhone && (
                  <p className="text-red-500 text-xs mt-1">
                    {fieldErrors.senderPhone}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value="Hà Nội"
                  disabled
                  className="input-base bg-slate-100 cursor-not-allowed"
                />
                <select
                  name="senderDistrict"
                  value={formData.senderDistrict}
                  onChange={handleInputChange}
                  className="input-base cursor-pointer"
                  required
                >
                  <option value="">-- Chọn quận/huyện --</option>
                  {HANOI_DISTRICTS.map((district) => (
                    <option key={district.value} value={district.value}>
                      {district.label}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                name="senderWard"
                value={formData.senderWard}
                onChange={handleInputChange}
                className="input-base"
                placeholder="Phường/Xã"
                required
              />

              <input
                type="text"
                name="senderAddress"
                value={formData.senderAddress}
                onChange={handleInputChange}
                className="input-base"
                placeholder="Số nhà, tên đường..."
                required
              />
            </div>
          </div>

          {/* Người nhận */}
          <div className="card-base space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#801B29]" />
            <h3 className="text-sm font-black text-[#801B29] uppercase flex items-center gap-2 mb-4">
              <MapPin size={16} /> Thông tin nhận
            </h3>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#801B29]/50 w-4 h-4" />
                <input
                  type="text"
                  name="receiverName"
                  value={formData.receiverName}
                  onChange={handleInputChange}
                  className="input-base w-full !pl-12"
                  placeholder="Tên người nhận"
                  required
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#801B29]/50 w-4 h-4" />
                <input
                  type="tel"
                  name="receiverPhone"
                  value={formData.receiverPhone}
                  onChange={handleInputChange}
                  className="input-base w-full !pl-12"
                  placeholder="Số điện thoại"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value="Hà Nội"
                  disabled
                  className="input-base bg-slate-100 cursor-not-allowed"
                />
                <select
                  name="receiverDistrict"
                  value={formData.receiverDistrict}
                  onChange={handleInputChange}
                  className="input-base cursor-pointer"
                  required
                >
                  <option value="">-- Chọn quận/huyện --</option>
                  {HANOI_DISTRICTS.map((district) => (
                    <option key={district.value} value={district.value}>
                      {district.label}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                name="receiverWard"
                value={formData.receiverWard}
                onChange={handleInputChange}
                className="input-base"
                placeholder="Phường/Xã"
                required
              />

              <input
                type="text"
                name="receiverAddress"
                value={formData.receiverAddress}
                onChange={handleInputChange}
                className="input-base"
                placeholder="Số nhà, tên đường..."
                required
              />
            </div>
          </div>
        </div>

        {/* Chi tiết bưu kiện */}
        <div className="card-base space-y-5">
          <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-100 pb-3">
            Chi tiết bưu kiện
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Ảnh sản phẩm
              </label>
              <div className="relative w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden">
                {imagePreview ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full cursor-pointer">
                    <ImageIcon className="text-slate-400 mb-1" size={28} />
                    <span className="text-xs text-slate-500">Tải ảnh lên</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="md:col-span-9 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Tên hàng hóa
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    className="input-base"
                    placeholder="Ví dụ: Quần áo..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Trọng lượng (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    step="0.1"
                    min="0.1"
                    value={formData.weight}
                    onChange={handleInputChange}
                    className="input-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Dài (cm)
                  </label>
                  <input
                    type="number"
                    name="length"
                    value={formData.length}
                    onChange={handleInputChange}
                    className="input-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Rộng (cm)
                  </label>
                  <input
                    type="number"
                    name="width"
                    value={formData.width}
                    onChange={handleInputChange}
                    className="input-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Cao (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    className="input-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Giá trị hàng hóa (VNĐ)
                  </label>
                  <input
                    type="number"
                    name="orderValue"
                    value={formData.orderValue}
                    onChange={handleInputChange}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#801B29] mb-1.5">
                    Tiền thu hộ COD (VNĐ)
                  </label>
                  <input
                    type="number"
                    name="codAmount"
                    value={formData.codAmount}
                    onChange={handleInputChange}
                    className="input-base !border-[#801B29]/30 !bg-[#801B29]/5 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dịch vụ & Thanh toán */}
        <div className="card-base space-y-5">
          <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-100 pb-3">
            Dịch vụ & Thanh toán
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Gói vận chuyển
              </label>
              <select
                name="serviceCode"
                value={formData.serviceCode}
                onChange={handleInputChange}
                className="input-base cursor-pointer"
              >
                <option value="ECONOMY">Chuyển phát tiết kiệm (Economy)</option>
                <option value="FAST">Chuyển phát nhanh (Fast)</option>
                <option value="EXPRESS">Chuyển phát hỏa tốc (Express)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Phương thức thanh toán
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="input-base cursor-pointer"
              >
                <option value="COD">Người nhận trả cước (COD)</option>
                <option value="ONLINE_PAYMENT">
                  Người gửi trả cước (MoMo)
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Ghi chú giao hàng
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              className="input-base min-h-[80px] resize-none"
              placeholder="Hàng dễ vỡ, gọi trước..."
            />
          </div>
        </div>

        {/* PRICING RESULT */}
        {pricing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base overflow-hidden p-0"
          >
            {/* HEADER */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100">
                  <CheckCircle
                    className="h-5 w-5 text-emerald-600"
                    strokeWidth={2.5}
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Bảng giá chi tiết
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Chi tiết toàn bộ chi phí vận chuyển đơn hàng
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="space-y-3 p-6">
              {[
                {
                  label: "Cước vận chuyển",
                  desc: "Theo khoảng cách và trọng lượng quy đổi",
                  value: pricing.shippingFee,
                },
                {
                  label: "Phí thu hộ COD",
                  desc: "0.8% tiền COD — tối thiểu 15.000 ₫",
                  value: pricing.codFee,
                },
                {
                  label: "Phí bảo hiểm",
                  desc: "Áp dụng cho đơn hàng giá trị cao",
                  value: pricing.insuranceFee,
                },
                {
                  label: "Phụ phí dịch vụ",
                  desc: "Khu vực ngoại thành và loại dịch vụ",
                  value: pricing.surcharge,
                },
                {
                  label: "VAT (8%)",
                  value:
                    pricing.totalPrice -
                    (pricing.shippingFee +
                      pricing.codFee +
                      pricing.insuranceFee +
                      pricing.surcharge),
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between rounded-2xl border border-slate-200 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.label}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-slate-900">
                    {item.value.toLocaleString()} ₫
                  </p>
                </div>
              ))}

              {/* WEIGHT */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Trọng lượng tính cước
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Lấy giá trị lớn hơn giữa cân nặng thực tế và quy đổi thể
                    tích
                  </p>
                </div>

                <p className="text-xl font-bold text-slate-900">
                  {pricing.weight} kg
                </p>
              </div>

              {/* TOTAL */}
              <div className="rounded-2xl bg-emerald-200 px-6 py-5 text-emerald-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                      Tổng cước vận chuyển
                    </p>

                    <p className="mt-1 text-xs text-emerald-700/80">
                      Đã bao gồm VAT
                    </p>
                  </div>

                  <h4 className="text-2xl font-black">
                    {pricing.totalPrice.toLocaleString()} ₫
                  </h4>
                </div>
              </div>

              {/* PAYMENT SUMMARY */}
              {formData.paymentMethod === "COD" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-100 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-800">
                        Shipper thu Người nhận
                      </p>

                      <p className="mt-1 text-xs text-amber-800/80">
                        Bao gồm phí COD và cước vận chuyển
                      </p>
                    </div>

                    <h4 className="text-xl font-black text-amber-800">
                      {pricing.finalCollect.toLocaleString()} ₫
                    </h4>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#A50064]/30 bg-[#A50064]/5 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A50064]/10 shrink-0">
                      <CreditCard
                        className="h-4 w-4 text-[#A50064]"
                        strokeWidth={2.3}
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A50064]">
                        Thanh toán online qua MoMo
                      </p>

                      <p className="mt-1 text-xs text-[#A50064]/70">
                        Shipper chỉ thu phí COD từ người nhận
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {priceError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm flex items-center gap-2">
            <AlertCircle size={18} /> {priceError}
          </div>
        )}

        <div className="flex justify-end gap-3 sm:gap-4 pt-4">
          <button
            type="button"
            onClick={handleViewPrice}
            disabled={priceLoading || loading}
            className="h-11 btn-ghost px-6 sm:px-8 text-sm font-bold border border-slate-300 hover:bg-slate-50 flex items-center justify-center"
          >
            {priceLoading ? "Đang tính giá..." : "Xem giá đơn hàng"}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="h-11 bg-[#801B29] hover:bg-[#63141F] text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-lg hover:shadow-[#801B29]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 px-6 sm:px-10"
          >
            {loading ? "Đang cập nhật..." : "Cập nhật đơn hàng"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
