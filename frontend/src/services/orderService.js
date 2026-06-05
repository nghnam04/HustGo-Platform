import axiosInstance from "../api/axiosInstance";

const orderService = {
  // ================= CUSTOMER =================

  // Tạo đơn hàng mới (Multipart để upload imageFile)
  createOrder: (formData) =>
    axiosInstance.post("/orders", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Xem danh sách đơn hàng của chính mình (Hỗ trợ phân trang qua params)
  getMyOrders: (params = {}) =>
    axiosInstance.get("/orders/my-orders", { params }),

  // Cập nhật đơn hàng (Sử dụng PUT và Multipart như Controller)
  updateOrder: (id, formData) =>
    axiosInstance.put(`/orders/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Huỷ đơn hàng (Sử dụng PATCH /cancel)
  cancelOrder: (id) => axiosInstance.patch(`/orders/${id}/cancel`),

  // Tính giá trước khi tạo đơn
  calculatePrice: (formData) =>
    axiosInstance.post("/orders/calculate-price", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Lấy link thanh toán VNPAY
  getPaymentUrl: (id) => axiosInstance.get(`/orders/${id}/payment-url`),

  // ================= HUB ADMIN =================

  // Xác nhận đơn hàng khách gửi tại hub
  arriveAtHubCustomer: (id, arriveData) =>
    axiosInstance.patch(`/orders/${id}/hub/pickup`, arriveData),

  // Xác nhận đơn hàng trung chuyển nhập kho hub
  arriveAtHubTransfer: (id, arriveData) =>
    axiosInstance.patch(`/orders/${id}/hub/receive-transfer`, arriveData),

  // Xem tồn kho tại bưu cục
  getInventoryAtHub: (hubId, params = {}) =>
    axiosInstance.get(`/orders/hub/${hubId}`, { params }),

  // Lấy các đơn PICKING/DELIVERING của hub (qua tuyến đã accept)
  getDeliveryOrdersByHub: (hubId) =>
    axiosInstance.get(`/orders/hub/${hubId}/delivery-orders`),

  // Lấy các đơn IN_TRANSIT đang chờ nhập kho tại hub đích
  getInTransitOrdersForHub: (hubId) =>
    axiosInstance.get(`/orders/hub/${hubId}/in-transit`),

  // Tạo chuyến trung chuyển
  createTransferManifest: (transferData) =>
    axiosInstance.post("/orders/transfer", transferData),

  // Phân tuyến giao hàng
  assignOrdersToRoute: (hubId, assignData) =>
    axiosInstance.post(`/orders/hub/${hubId}/assign-route`, assignData),

  // Xác nhận thu tiền từ shipper theo tuyến
  confirmPaymentCollection: (routeId) =>
    axiosInstance.post(
      `/orders/hub/route/${routeId}/confirm-payment-collection`,
    ),

  // ================= COMMON (CUSTOMER, ADMIN, SHIPPER) =================

  // Xem chi tiết một đơn hàng
  getOrderById: (id) => axiosInstance.get(`/orders/${id}`),

  // Xem lịch sử hành trình/trạng thái đơn hàng
  getOrderHistory: (id) => axiosInstance.get(`/orders/${id}/history`),

  // ================= SUPER ADMIN =================

  // Danh sách toàn bộ đơn hàng hệ thống
  getAllOrders: (params = {}) => axiosInstance.get("/orders", { params }),

  // ================= SHIPPER =================

  // Shipper lấy đơn của mình
  getMyShipperOrders: (params = {}) =>
    axiosInstance.get("/orders/shipper/my-orders", { params }),

  // Shipper lấy danh sách tuyến available
  getAvailableRoutes: (params = {}) =>
    axiosInstance.get("/orders/shipper/available-routes", { params }),

  // Shipper nhận tuyến
  shipperAcceptRoute: (routeId) =>
    axiosInstance.patch(`/orders/route/${routeId}/accept`),

  // Shipper bắt đầu giao hàng
  shipperStartDelivery: (routeId) =>
    axiosInstance.patch(`/orders/route/${routeId}/start-delivery`),

  // Shipper cập nhật trạng thái giao hàng
  updateDeliveryStatus: (id, deliveryData) =>
    axiosInstance.patch(`/orders/${id}/delivery-status`, deliveryData),

  // Shipper trả hàng về hub
  returnOrderToHub: (id, data) =>
    axiosInstance.patch(`/orders/${id}/return-to-hub`, data),
};

export default orderService;
