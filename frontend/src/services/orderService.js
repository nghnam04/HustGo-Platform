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

  // Doanh thu tháng của hub
  getMonthlyRevenueByHub: (hubId, month, year) =>
    axiosInstance.get(`/orders/hub/${hubId}/monthly-revenue`, {
      params: { month, year },
    }),

  // Doanh thu hub theo filter (today/week/month/all)
  getHubRevenueByFilter: (hubId, filter) =>
    axiosInstance.get(`/orders/hub/${hubId}/revenue`, { params: { filter } }),

  // Doanh thu 12 tháng cho chart
  getMonthlyRevenueForChart: (hubId) =>
    axiosInstance.get(`/orders/hub/${hubId}/monthly-revenue-chart`),

  // Doanh thu theo ngày trong tháng của hub (cho biểu đồ)
  getDailyRevenueByHub: (hubId, month, year) =>
    axiosInstance.get(`/orders/hub/${hubId}/daily-revenue`, {
      params: { month, year },
    }),

  // Doanh thu shipper (theo tháng)
  getShipperRevenue: (shipperId, month, year) =>
    axiosInstance.get(`/orders/shipper/${shipperId}/revenue`, {
      params: { month, year },
    }),

  // Doanh thu shipper theo filter (today/week/month/all)
  getShipperRevenueByFilter: (shipperId, filter) =>
    axiosInstance.get(`/orders/shipper/${shipperId}/revenue-by-filter`, {
      params: { filter },
    }),

  // Doanh thu shipper 12 tháng cho chart
  getShipperMonthlyRevenueChart: (shipperId) =>
    axiosInstance.get(`/orders/shipper/${shipperId}/monthly-revenue-chart`),

  // ================= COMMON (CUSTOMER, ADMIN, SHIPPER) =================

  // Xem chi tiết một đơn hàng
  getOrderById: (id) => axiosInstance.get(`/orders/${id}`),

  // Xem lịch sử hành trình/trạng thái đơn hàng
  getOrderHistory: (id) => axiosInstance.get(`/orders/${id}/history`),

  // ================= SUPER ADMIN =================

  // Danh sách toàn bộ đơn hàng hệ thống
  getAllOrders: (params = {}) => axiosInstance.get("/orders", { params }),

  // Doanh thu hệ thống theo filter (today/week/month/all)
  getSystemRevenueByFilter: (filter) =>
    axiosInstance.get("/orders/system/revenue", { params: { filter } }),

  // Doanh thu hệ thống 12 tháng cho chart
  getSystemRevenueChart: () =>
    axiosInstance.get("/orders/system/monthly-revenue-chart"),

  // ================= SHIPPER =================

  // Shipper lấy đơn của mình
  getMyShipperOrders: (params = {}) =>
    axiosInstance.get("/orders/shipper/my-orders", { params }),

  // Shipper lấy danh sách tuyến available (có thể truyền {lat, lng} để filter theo khoảng cách 5km)
  getAvailableRoutes: (position = null) => {
    const params = {};
    if (position) {
      params.lat = position.lat;
      params.lng = position.lng;
    }
    return axiosInstance.get("/orders/shipper/available-routes", { params });
  },

  // Shipper nhận tuyến
  shipperAcceptRoute: (routeId) =>
    axiosInstance.patch(`/orders/route/${routeId}/accept`),

  // Shipper bắt đầu giao hàng
  shipperStartDelivery: (routeId) =>
    axiosInstance.patch(`/orders/route/${routeId}/start-delivery`),

  // Lấy thông tin route (bao gồm tổng số đơn)
  getRouteInfo: (routeId) => axiosInstance.get(`/orders/route/${routeId}`),

  // Shipper cập nhật trạng thái giao hàng
  updateDeliveryStatus: (id, deliveryData) =>
    axiosInstance.patch(`/orders/${id}/delivery-status`, deliveryData),

  // Shipper trả hàng về hub
  returnOrderToHub: (id, data) =>
    axiosInstance.patch(`/orders/${id}/return-to-hub`, data),

  // Upload ảnh minh chứng giao hàng
  uploadDeliveryImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.post("/orders/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // ================= FEEDBACK =================

  // Tạo feedback cho đơn hàng đã COMPLETED
  createFeedback: (feedbackData) =>
    axiosInstance.post("/feedbacks", feedbackData),

  // Lấy feedback của chính mình (customer)
  getMyFeedbacks: () => axiosInstance.get("/feedbacks/my-feedbacks"),

  // Lấy tất cả feedback (SuperAdmin)
  getAllFeedbacks: () => axiosInstance.get("/feedbacks"),

  // Lấy feedback theo order ID
  getFeedbacksByOrder: (orderId) =>
    axiosInstance.get(`/feedbacks/order/${orderId}`),

  // Lấy feedback theo ID
  getFeedbackById: (feedbackId) =>
    axiosInstance.get(`/feedbacks/${feedbackId}`),

  // Cập nhật feedback
  updateFeedback: (feedbackId, feedbackData) =>
    axiosInstance.put(`/feedbacks/${feedbackId}`, feedbackData),

  // Xóa feedback (SuperAdmin)
  deleteFeedback: (feedbackId) =>
    axiosInstance.delete(`/feedbacks/${feedbackId}`),
};

export default orderService;
