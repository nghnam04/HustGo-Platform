import { useState, useEffect, useRef } from "react";
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
  Menu,
  X,
  MapPin,
} from "lucide-react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import hubService from "../../services/hubService";
import useAuth from "../../hooks/useAuth";
import defaultAvatar from "../../assets/default-avatar.jpg";

const WS_URL =
  import.meta.env.VITE_NOTIFICATION_WS_URL ||
  "http://localhost:8084/ws-notifications";

export default function Navbar({ user, handleLogout }) {
  const { role, gpsStatus } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [gpsPaused, setGpsPaused] = useState(
    () => sessionStorage.getItem("gps_paused") === "true",
  );
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notiDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const isFirstSave = useRef(true);
  const stompClientRef = useRef(null);

  const [hubId, setHubId] = useState(null);

  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Load noti from localstorage
  useEffect(() => {
    if (!user?.id) return;
    isFirstSave.current = true;

    try {
      const saved = localStorage.getItem(`notifications_${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
      }
    } catch (e) {
      console.error(
        "[Notification] Parse notifications from localStorage failed",
        e,
      );
    } finally {
      setStorageLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    const roles = user?.roles || [];
    const isHubAdmin = roles.some(
      (r) => r.replace("ROLE_", "") === "HUB_ADMIN",
    );
    const isShipper = roles.some((r) => r.replace("ROLE_", "") === "SHIPPER");

    if (isHubAdmin) {
      hubService
        .getMyHub()
        .then((res) => setHubId(res.data?.id || res.data?.hubId))
        .catch(() => {});
    }
  }, [user?.id]);

  // Lưu noti vào storage
  useEffect(() => {
    if (!storageLoaded || !user?.id) return;
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }

    localStorage.setItem(
      `notifications_${user.id}`,
      JSON.stringify(notifications),
    );
  }, [notifications, user, storageLoaded]);

  // Web Socket & STOMP
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const socket = new SockJS(WS_URL);
    const stompClient = Stomp.over(socket);
    stompClientRef.current = stompClient;

    stompClient.connect(
      {},
      (frame) => {
        // Đơn hàng
        stompClient.subscribe(`/topic/orders/${user.id}`, (message) => {
          if (message.body) {
            handleNewNotification(JSON.parse(message.body));
          }
        });

        // Thanh toán
        stompClient.subscribe(`/topic/payments/${user.id}`, (message) => {
          if (message.body) {
            handleNewNotification(JSON.parse(message.body));
          }
        });

        // Hub admin - thông báo cá nhân
        stompClient.subscribe(`/topic/hub/${user.id}`, (message) => {
          if (message.body) {
            handleNewNotification(JSON.parse(message.body));
          }
        });

        // Hub admin - thông báo transfer
        stompClient.subscribe(`/topic/hubs/${user.id}`, (message) => {
          if (message.body) {
            handleNewNotification(JSON.parse(message.body));
          }
        });

        // User
        stompClient.subscribe(`/topic/users/${user.id}`, (message) => {
          if (message.body) {
            handleNewNotification(JSON.parse(message.body));
          }
        });

        // Shipper
        stompClient.subscribe(`/topic/shipper/${user.id}`, (message) => {
          if (message.body) {
            handleNewNotification(JSON.parse(message.body));
          }
        });
      },
      (error) => {
        console.error(`WebSocket kết nối thất bại tới user ${user.id}:`, error);
      },
    );

    return () => {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.disconnect(() => {
          stompClientRef.current = null;
        });
      }
    };
  }, [user?.id]);

  // Subscribe Hub topics khi có hubId
  useEffect(() => {
    const client = stompClientRef.current;

    if (!hubId || !client || !client.connected) {
      return;
    }

    const routeSub = client.subscribe(`/topic/routes/${hubId}`, (message) => {
      if (message.body) {
        handleNewNotification(JSON.parse(message.body));
      }
    });

    const hubSub = client.subscribe(`/topic/hub/${hubId}`, (message) => {
      if (message.body) {
        handleNewNotification(JSON.parse(message.body));
      }
    });

    // Hubadmin nhận thông báo transfer (trung chuyển)
    const transferSub = client.subscribe(
      `/topic/hubs/${user.id}`,
      (message) => {
        if (message.body) {
          handleNewNotification(JSON.parse(message.body));
        }
      },
    );

    return () => {
      routeSub?.unsubscribe();
      hubSub?.unsubscribe();
      transferSub?.unsubscribe();
    };
  }, [hubId, role, user?.id]);

  const handleNewNotification = (payload) => {
    let title = "Cập nhật hệ thống";

    // PAYMENT
    if (payload.type === "PAYMENT") {
      title =
        payload.status === "SUCCESS"
          ? "Thanh toán cho đơn hàng thành công"
          : "Thanh toán cho đơn hàng thất bại";
    }

    // ORDER
    if (payload.type === "ORDER") {
      switch (payload.status) {
        case "PENDING":
          title = "Đơn hàng đã được tạo/cập nhật và đang chờ xử lý";
          break;
        case "CREATED":
          title = "Đơn hàng đã được thanh toán cước vận chuyển thành công";
          break;
        case "COLLECTED":
          title = "Đơn hàng đã được gửi tại bưu cục và đang chờ phân loại";
          break;
        case "IN_TRANSIT":
          title = "Đơn hàng đang được trung chuyển tới Hub đích";
          break;
        case "AT_HUB":
          title = "Đơn hàng đã được trung chuyển tới Hub đích";
          break;
        case "PICKING":
          title = "Đơn hàng đã được Shipper nhận";
          break;
        case "DELIVERING":
          title = "Đơn hàng đang được giao";
          break;
        case "COMPLETED":
          title = "Đơn hàng đã giao thành công";
          break;
        case "CANCELLED":
          title = "Đơn hàng đã bị hủy";
          break;
        case "RETURNING":
          title = "Đơn hàng giao thất bại và đang được hoàn về";
          break;
        default:
          title = "Cập nhật đơn hàng";
      }
    }

    // HUB
    if (payload.type === "HUB") {
      switch (payload.status) {
        case "CREATED":
          title = "Hub mới đã được tạo thành công";
          break;
        case "UPDATED":
          title = "Thông tin Hub đã được cập nhật";
          break;
        case "DELETED":
          title = "Hub đã bị vô hiệu hóa";
          break;
        case "MANAGER_ASSIGNED":
          title = "Hub đã được gán quản lý mới";
          break;
        default:
          title = "Cập nhật Hub";
      }
    }

    // USER
    if (payload.type === "USER") {
      switch (payload.status) {
        case "REGISTERED":
          title = "Đăng ký tài khoản thành công";
          break;
        case "LOGGED_IN":
          title = "Đăng nhập thành công";
          break;
        case "PROFILE_UPDATED":
          title = "Thông tin cá nhân đã được cập nhật";
          break;
        case "PASSWORD_CHANGED":
          title = "Mật khẩu đã được thay đổi";
          break;
        case "ROLE_UPDATED":
          title = "Tài khoản của bạn đã được cập nhật phân quyền";
          break;
        case "USER_ROLE_UPDATED":
          title = "Bạn đã cập nhật phân quyền Tài khoản thành công";
          break;
        case "USER_DELETED":
          title = "Bạn đã xoá Tài khoản thành công";
          break;
        default:
          title = "Cập nhật tài khoản";
      }
    }

    // ROUTE_AVAILABLE
    if (payload.type === "ROUTE_AVAILABLE") {
      switch (payload.status) {
        case "NEW_ROUTE":
          title = "Có tuyến giao hàng mới";
          break;
        default:
          title = "Thông báo tuyến giao hàng";
      }
    }

    // ROUTE_ACCEPTED
    if (payload.type === "ROUTE_ACCEPTED") {
      title = "Shipper đã nhận tuyến giao hàng";
    }

    // ROUTE_ASSIGNED
    if (payload.type === "ROUTE_ASSIGNED") {
      title = "Đã phân tuyến thành công";
    }

    // ROUTE_COMPLETED
    if (payload.type === "ROUTE_COMPLETED") {
      title = "Tuyến giao hàng đã hoàn thành";
    }

    // TRANSFER NOTIFICATIONS
    if (payload.type === "TRANSFER_CREATED") {
      title = "Chuyến trung chuyển đã được tạo";
    }

    if (payload.type === "TRANSFER_RECEIVED") {
      title = "Chuyến trung chuyển đã đến đích";
    }

    if (payload.type === "TRANSFER_INCOMING") {
      title = "Sắp có hàng trung chuyển đến";
    }

    if (payload.type === "TRANSFER_ARRIVED") {
      title = "Có hàng trung chuyển cần xác nhận";
    }

    // FEEDBACK
    if (payload.type === "FEEDBACK") {
      switch (payload.status) {
        case "CREATED":
          title = "Cảm ơn phản hồi của bạn";
          break;
        case "NEW_FEEDBACK":
          title = "Có phản hồi mới từ khách hàng";
          break;
        case "UPDATED":
          title = "Phản hồi đã được cập nhật";
          break;
        case "DELETED":
          title = "Phản hồi đã bị xóa";
          break;
        case "DELETED_BY_ADMIN":
          title = "Đã xóa phản hồi thành công";
          break;
        default:
          title = "Thông báo phản hồi";
      }
    }

    const newNoti = {
      id: Date.now() + Math.random(),
      title,
      message: payload.message,
      isRead: false,
      createdAt: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: Date.now(),
    };

    setNotifications((prev) => {
      const isDuplicate = prev.some(
        (n) =>
          n.title === newNoti.title &&
          n.message === newNoti.message &&
          Date.now() - n.timestamp < 3000,
      );

      if (isDuplicate) {
        return prev;
      }
      return [newNoti, ...prev];
    });
  };

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notiDropdownRef.current &&
        !notiDropdownRef.current.contains(event.target)
      ) {
        setIsNotiOpen(false);
      }
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
    if (user?.id) {
      localStorage.removeItem(`notifications_${user.id}`);
    }
  };

  const onLogoutClick = () => {
    setIsUserOpen(false);
    handleLogout();
    navigate("/login");
  };

  return (
    <>
      {/* Thanh Navbar chính */}
      <nav className="relative sticky top-0 z-[100] w-full bg-white shadow-sm h-16 border-b border-slate-200">
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex justify-between h-16 items-center">
                {/* Brand Logo HUSTGo */}
                <Link to="/" className="flex flex-col leading-none">
                  <span className="text-2xl font-black tracking-tight text-[#a04050]">
                    HUST<span className="text-slate-900">Go</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500 mt-1">
                    Logistics Platform
                  </span>
                </Link>

                {/* Cụm chức năng góc phải */}
                <div className="flex items-center gap-2 md:space-x-4">
                  {user ? (
                    <div className="flex items-center gap-2 md:gap-3">
                      {/* GPS Toggle */}
                      {role?.name === "SHIPPER" && gpsStatus === "granted" && (
                        <button
                          onClick={() => {
                            const next = !gpsPaused;
                            setGpsPaused(next);
                            sessionStorage.setItem("gps_paused", String(next));
                            window.dispatchEvent(
                              new CustomEvent("gps_toggle", {
                                detail: { paused: next },
                              }),
                            );
                          }}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            gpsPaused
                              ? "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              : "text-green-600 hover:text-green-700 hover:bg-green-100"
                          }`}
                          title={gpsPaused ? "Bật GPS" : "Tắt GPS"}
                        >
                          <MapPin
                            size={18}
                            className={
                              gpsPaused
                                ? "text-slate-400"
                                : "text-green-600 animate-pulse"
                            }
                          />
                        </button>
                      )}

                      {/* Notification Bell */}
                      <div className="relative" ref={notiDropdownRef}>
                        <button
                          onClick={() => {
                            setIsNotiOpen(!isNotiOpen);
                            setIsUserOpen(false);
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
                          <div className="absolute right-0 mt-2.5 w-64 md:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-[110] overflow-hidden text-left">
                            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                              <span className="text-xs font-black text-slate-900 tracking-tight">
                                Thông báo hệ thống
                              </span>
                              {notifications.length > 0 && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-[#801B29] hover:underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Check size={11} className="stroke-[3]" />{" "}
                                    Đọc hết
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
                                </div>
                              ) : (
                                notifications.map((noti) => (
                                  <div
                                    key={noti.id}
                                    className={`p-3.5 hover:bg-slate-50/80 transition-colors relative text-left ${
                                      !noti.isRead ? "bg-[#801B29]/[0.02]" : ""
                                    }`}
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
                          </div>
                        )}
                      </div>

                      {/* User Dropdown */}
                      <div className="relative" ref={userDropdownRef}>
                        <button
                          onClick={() => {
                            setIsUserOpen(!isUserOpen);
                            setIsNotiOpen(false);
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
                            className={`text-slate-500 transition-transform duration-200 ${
                              isUserOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isUserOpen && (
                          <div className="absolute right-0 mt-2.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-[110] overflow-hidden py-1.5 text-left">
                            <Link
                              to="/profile"
                              onClick={() => setIsUserOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#801B29] transition-colors"
                            >
                              <User size={14} className="text-slate-400" />
                              <span className="truncate">Xem thông tin</span>
                            </Link>
                            <Link
                              to="/profile/edit"
                              onClick={() => setIsUserOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#801B29] transition-colors"
                            >
                              <Settings size={14} className="text-slate-400" />
                              <span className="truncate">
                                Chỉnh sửa thông tin
                              </span>
                            </Link>
                            <Link
                              to="/profile/change-password"
                              onClick={() => setIsUserOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#801B29] transition-colors"
                            >
                              <Key size={14} className="text-slate-400" />
                              <span className="truncate">Đổi mật khẩu</span>
                            </Link>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button
                              onClick={onLogoutClick}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50/60 transition-colors text-left cursor-pointer"
                            >
                              <LogOut size={14} />
                              <span className="truncate">Đăng xuất</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 md:gap-4">
                      {/* Mobile menu button */}
                      <button
                        className="md:hidden p-2 text-slate-600 hover:text-[#801B29] hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                      </button>

                      {/* Login/Register */}
                      <div className="hidden md:flex items-center gap-3">
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
                          Đăng ký
                        </Link>
                      </div>

                      {/* Mobile Menu Dropdown */}
                      {mobileMenuOpen && (
                        <div className="md:hidden absolute right-0 top-full z-[110] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-1.5 text-left min-w-[180px]">
                          <Link
                            to="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#801B29] hover:bg-slate-50 hover:bg-slate-50 transition-colors"
                          >
                            <Key size={16} className="text-slate-400" />
                            Đăng nhập
                          </Link>
                          <Link
                            to="/register"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-[#801B29] transition-colors border-t border-slate-100"
                          >
                            <User size={16} />
                            Đăng ký
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
