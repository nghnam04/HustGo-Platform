import axiosInstance from "../api/axiosInstance";

const paymentService = {
  initiatePayment: (orderId, method, totalPrice) =>
    axiosInstance.get(`/payments/initiate/${orderId}`, {
      params: {
        method,
        totalPrice,
      },
    }),

  paymentCallback: (payload) =>
    axiosInstance.post("/payments/callback", payload),
};

export default paymentService;
