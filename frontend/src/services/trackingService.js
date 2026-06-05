import axiosInstance from "../api/axiosInstance";

const trackingService = {
  // ================= TRACKING =================

  // Lịch sử tracking đơn hàng
  getOrderHistory: (orderId) =>
    axiosInstance.get(`/tracking/${orderId}/history`),

  // Tọa độ đích người nhận
  getOrderDestination: (orderId) =>
    axiosInstance.get(`/tracking/${orderId}/destination`),

  // Vị trí realtime shipper đang giao đơn
  getShipperLocationByOrder: (orderId) =>
    axiosInstance.get(`/tracking/${orderId}/shipper-location`),

  // ================= SHIPPER =================

  // Shipper cập nhật GPS hiện tại
  updateShipperLocation: (shipperId, data) =>
    axiosInstance.post(`/tracking/shipper/${shipperId}/location`, data),

  // ================= HUB ADMIN =================

  // Tìm shipper gần hub
  getNearbyShippers: ({
    lat,
    lng,
    radiusKm = 5,
  }) =>
    axiosInstance.get("/tracking/shippers/nearby", {
      params: {
        lat,
        lng,
        radiusKm,
      },
    }),
};

export default trackingService;