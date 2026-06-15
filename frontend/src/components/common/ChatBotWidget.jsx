import { useState, useRef, useEffect } from "react";
import { Bot, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import chatBotService from "../../services/chatBotService";

const ChatBotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Chào bạn! Tôi là trợ lý ảo HustGo. Tôi có thể giúp gì cho bạn?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatBotService.askAI(userMsg.content);
      const botMsg = { role: "bot", content: res.data || res };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("AI Chatbot Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            "Trợ lý HustGo tạm thời không khả dụng. Vui lòng thử lại sau giây lát!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end">
      {/* Cửa sổ khung chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[92vw] md:w-80 lg:w-96 h-[70vh] md:h-[500px] max-h-[85dvh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#a04050] p-4 border-b border-[#803040] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-display text-white font-bold">
                  HustGo AI Assistant
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900/90 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#a04050] text-white rounded-tr-none shadow-md shadow-red-900/30"
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: m.content }} />
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="relative flex items-center">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Hỏi tôi về dịch vụ HustGo..."
                  className="w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white rounded-full pl-4 pr-12 py-2.5 text-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-[#a04050] focus:ring-1 focus:ring-[#a04050]/50 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="absolute right-1.5 p-1.5 text-[#a04050] hover:text-[#803040] disabled:text-gray-400 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút bật/tắt Chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 md:w-14 md:h-14 bg-[#a04050] hover:bg-[#803040] rounded-full flex items-center justify-center shadow-lg shadow-red-900/40 transition-all active:scale-90 group"
      >
        {isOpen ? (
          <X
            size={28}
            className="text-white group-hover:rotate-90 transition-transform"
          />
        ) : (
          <Bot
            size={28}
            className="text-white group-hover:scale-115 transition-transform"
          />
        )}
      </button>
    </div>
  );
};

export default ChatBotWidget;
