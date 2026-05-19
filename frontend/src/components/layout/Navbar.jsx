import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  Bell,
  Check,
  Trash2,
  User,
  Settings,
  Key,
  ChevronDown,
} from "lucide-react";

export default function Navbar({ user, handleLogout }) {
  // Trạng thái lưu danh sách thông báo nhận từ notification-service
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Đơn hàng mới",
      message: "Có đơn hàng mới cần lấy tại Hub Bách Khoa",
      isRead: false,
      createdAt: "Vừa xong",
    },
    {
      id: 2,
      title: "Tuyến đường tối ưu",
      message: "Đã tính toán xong lộ trình phân phối ca sáng",
      isRead: true,
      createdAt: "10 phút trước",
    },
  ]);

  // Trạng thái đóng/mở riêng biệt cho 2 dropdown khay thông báo và menu tài khoản
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);

  // Khai báo các Ref để xử lý click ra ngoài vùng hiển thị (Click Outside)
  const notiDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const navigate = useNavigate();

  const defaultAvatar =
    "https://avatarngau.sbs/wp-content/uploads/2025/07/avatar-vo-danh-va-sach.jpg";

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // LẮP RÁP KẾT NỐI REAL-TIME VỚI NOTIFICATION-SERVICE
  useEffect(() => {
    if (!user) return;
  }, [user]);

  // Xử lý đóng các Dropdown khi nhấn chuột ra ngoài vùng hiển thị
  useEffect(() => {
    function handleClickOutside(event) {
      // Click ra ngoài khay thông báo
      if (
        notiDropdownRef.current &&
        !notiDropdownRef.current.contains(event.target)
      ) {
        setIsNotiOpen(false);
      }
      // Click ra ngoài menu tài khoản
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setIsUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const onLogoutClick = () => {
    setIsUserOpen(false);
    handleLogout(); // Gọi hàm xóa storage đồng bộ từ Hook cha
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-[100] w-full bg-white border-b border-slate-200 shadow-sm shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo HUSTGo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-[#801B29]">
              HUST<span className="text-slate-900">Go</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 uppercase tracking-wider">
              Logistics
            </span>
          </Link>

          {/* Cụm chức năng góc phải */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* 🔔 1. KHỐI CHUÔNG THÔNG BÁO */}
                <div className="relative" ref={notiDropdownRef}>
                  <button
                    onClick={() => {
                      setIsNotiOpen(!isNotiOpen);
                      setIsUserOpen(false); // Đóng menu user nếu đang mở
                    }}
                    className="p-2 text-slate-500 hover:text-[#801B29] hover:bg-slate-50 rounded-xl transition-all relative border border-slate-200 cursor-pointer flex items-center justify-center"
                  >
                    <Bell size={15} className="stroke-[2.5]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-600 border-2 border-white text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotiOpen && (
                    <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-[110] overflow-hidden text-left">
                      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900 tracking-tight">
                          Thông báo bưu cục
                        </span>
                        {notifications.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={markAllAsRead}
                              className="text-[10px] font-bold text-[#801B29] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Check size={11} className="stroke-[3]" /> Đọc hết
                            </button>
                            <button
                              onClick={clearAllNotifications}
                              className="text-[10px] font-bold text-slate-400 hover:text-red-600 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Trash2 size={11} /> Xóa
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <p className="text-xs font-bold">
                              Không có thông báo mới
                            </p>
                            <p className="text-[10px] mt-0.5">
                              Mọi diễn biến đơn hàng sẽ hiển thị tại đây.
                            </p>
                          </div>
                        ) : (
                          notifications.map((noti) => (
                            <div
                              key={noti.id}
                              className={`p-3.5 hover:bg-slate-50/80 transition-colors relative text-left ${!noti.isRead ? "bg-[#801B29]/[0.02]" : ""}`}
                            >
                              {!noti.isRead && (
                                <span className="absolute top-4 right-3 w-1.5 h-1.5 bg-[#801B29] rounded-full"></span>
                              )}
                              <h4 className="text-xs font-bold text-slate-800 pr-3">
                                {noti.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                {noti.message}
                              </p>
                              <span className="text-[9px] text-slate-400 font-medium block mt-1.5">
                                {noti.createdAt}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2 border-t border-slate-100 text-center bg-slate-50/20">
                        <Link
                          to="/notifications"
                          onClick={() => setIsNotiOpen(false)}
                          className="block py-1 text-[11px] font-bold text-slate-600 hover:text-[#801B29] transition-colors"
                        >
                          Xem tất cả nhật ký hệ thống
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 👤 2. KHỐI TÀI KHOẢN GỘP DROPDOWN (Đã gộp & Bỏ nút đăng xuất cũ) */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => {
                      setIsUserOpen(!isUserOpen);
                      setIsNotiOpen(false); // Đóng khay thông báo nếu đang mở
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100/80 pl-2 pr-2.5 py-1 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-200/60 transition-all cursor-pointer focus:outline-none"
                  >
                    <img
                      src={user.avatarUrl || defaultAvatar}
                      alt="User Avatar"
                      className="w-7 h-7 rounded-lg object-cover border border-slate-200/60 bg-white"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultAvatar;
                      }}
                    />
                    <span className="hidden sm:inline tracking-tight max-w-[120px] truncate">
                      {user.fullName || user.username}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-500 transition-transform duration-200 ${isUserOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Dropdown danh sách tính năng cá nhân */}
                  {isUserOpen && (
                    <div className="absolute right-0 mt-2.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-[110] overflow-hidden py-1.5 text-left">
                      {/* Mục 1: Xem thông tin */}
                      <Link
                        to="/profile"
                        onClick={() => setIsUserOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#801B29] transition-colors"
                      >
                        <User size={14} className="text-slate-400" />
                        <span>Xem thông tin</span>
                      </Link>

                      {/* Mục 2: Chỉnh sửa thông tin */}
                      <Link
                        to="/profile/edit"
                        onClick={() => setIsUserOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#801B29] transition-colors"
                      >
                        <Settings size={14} className="text-slate-400" />
                        <span>Chỉnh sửa thông tin</span>
                      </Link>

                      {/* Mục 3: Đổi mật khẩu */}
                      <Link
                        to="/profile/change-password"
                        onClick={() => setIsUserOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#801B29] transition-colors"
                      >
                        <Key size={14} className="text-slate-400" />
                        <span>Đổi mật khẩu</span>
                      </Link>

                      {/* Đường kẻ chia vách ngăn phân tách hành động */}
                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Mục 4: Hành động Đăng xuất */}
                      <button
                        onClick={onLogoutClick}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50/60 transition-colors text-left cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 bg-[#801B29] hover:bg-[#63141F] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold text-slate-600 hover:text-[#801B29] transition-colors"
                >
                  Đăng ký tài khoản
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
