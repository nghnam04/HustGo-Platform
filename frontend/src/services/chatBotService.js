import axiosInstance from "../api/axiosInstance";

const chatBotService = {
  askAI: (question) => axiosInstance.post("/chatbot/ask", { question }),
};

export default chatBotService;
