import React, { useState, useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Boxes,
  Navigation,
  Truck,
  MapPin,
  ShieldCheck,
  FileText,
  Layers,
  Users,
  LogOut,
  PackagePlus,
  HelpCircle,
  AlertTriangle,
  CreditCard,
  ClipboardList,
  ChevronLeft,
  Menu,
} from "lucide-react";

const getIcon = (name) => {
  const iconMap = {
    "Tạo đơn hàng": PackagePlus,
    "Lịch sử đơn hàng": ClipboardList,
    "Thanh toán đơn hàng": CreditCard,
    "Xác nhận lấy hàng tại Hub": Truck,
    "Xác nhận thu tiền": ShieldCheck,
    "Giao hàng": MapPin,
    "Báo cáo sự cố": AlertTriangle,
    "Quản lý tồn kho tại Hub": Boxes,
    "Phân tuyến tối ưu": Navigation,
    "Danh sách đơn toàn hệ thống": FileText,
    "Quản lý danh mục HUB (CRUD)": Layers,
    "Quản lý người dùng & Role": Users,
  };
  return iconMap[name] || HelpCircle;
};

export default function Sidebar({ user, handleLogout, menuConfig }) {
  // Trạng thái Đóng/Mở (Mặc định mở: true)
  const [isOpen, setIsOpen] = useState(true);

  // Link ảnh đại diện mặc định phòng hờ khi link mạng xã hội bị lỗi 403 hoặc null (Đồng bộ với Navbar)
  const defaultAvatar =
    "https://avatarngau.sbs/wp-content/uploads/2025/07/avatar-vo-danh-va-sach.jpg";

  // Ép kiểu mảng an toàn, tránh lỗi render
  const userRolesArray = useMemo(() => user?.roles || [], [user?.roles]);

  // Lọc và gộp menu dựa theo danh sách phân quyền
  const currentMenu = useMemo(() => {
    let combinedMenu = [];
    const seenPaths = new Set();

    userRolesArray.forEach((rawRole) => {
      const cleanRole = rawRole.replace("ROLE_", "").toUpperCase();
      const roleMenu = menuConfig[cleanRole] || [];

      roleMenu.forEach((item) => {
        if (!seenPaths.has(item.path)) {
          seenPaths.add(item.path);
          combinedMenu.push(item);
        }
      });
    });

    if (combinedMenu.length === 0) {
      combinedMenu = menuConfig["CUSTOMER"] || [];
    }

    return combinedMenu;
  }, [userRolesArray, menuConfig]);

  // Tạo chuỗi hiển thị tên khối phân quyền thân thiện
  const getRoleBadgeName = (roles) => {
    if (roles.length === 0) return "Khách Hàng";

    const badgeNames = roles.map((rawRole) => {
      const role = rawRole.replace("ROLE_", "").toUpperCase();
      if (role === "SUPER_ADMIN" || role === "ADMIN") return "Hệ Thống";
      if (role === "HUB_ADMIN") return "Quản Trị Hub";
      if (role === "SHIPPER") return "Đối Tác Rider";
      return "Khách Hàng";
    });

    return [...new Set(badgeNames)].join(", ");
  };

  return (
    <>
      {/* NÚT FLOAT MENU: Xuất hiện khi Sidebar đóng, bám lề trái */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-1/6 left-0 -translate-y-1/2 z-30 p-3 bg-white border-y border-r border-slate-200 rounded-r-2xl text-slate-600 shadow-md hover:bg-slate-50 hover:text-[#801B29] transition-all duration-200 cursor-pointer flex items-center justify-center animate-fadeIn group"
          title="Mở thanh điều hướng"
        >
          <Menu
            size={18}
            className="stroke-[2.5] group-hover:scale-110 transition-transform"
          />
        </button>
      )}

      {/* THANH SIDEBAR CHÍNH */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-64px)] bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 text-slate-600 z-20 text-left transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen
            ? "w-64 opacity-100 translate-x-0"
            : "w-0 opacity-0 -translate-x-full"
        }`}
      >
        {/* PHẦN TRÊN: Khu vực Header & Điều hướng */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-[256px]">
          {/* Header: Khối phân quyền và Nút đóng */}
          <div className="pt-4 px-4 flex items-center justify-between gap-2 shrink-0">
            <div className="overflow-hidden flex-1">
              <span className="inline-block text-[10px] font-bold text-[#801B29] bg-[#801B29]/5 border border-[#801B29]/20 px-2.5 py-1 rounded-md uppercase tracking-wider max-w-full break-words">
                Khối: {getRoleBadgeName(userRolesArray)}
              </span>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Ẩn menu điều hướng"
            >
              <ChevronLeft size={16} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Danh sách các nút Route */}
          <nav className="mt-5 px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            <span className="text-[10px] font-extrabold text-slate-400 px-3 tracking-wider block uppercase mb-2">
              Nghiệp vụ tài khoản
            </span>
            {currentMenu.map((item, index) => {
              const IconComponent = getIcon(item.name);
              return (
                <NavLink
                  key={index}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 ${
                      item.isPending
                        ? "text-slate-300 cursor-not-allowed italic"
                        : isActive
                          ? "bg-[#801B29]/10 text-[#801B29]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                  onClick={(e) => item.isPending && e.preventDefault()}
                >
                  <IconComponent
                    size={15}
                    className={
                      item.isPending
                        ? "text-slate-300"
                        : "stroke-[2.5] shrink-0"
                    }
                  />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* PHẦN DƯỚI: Thông tin User & Đăng xuất (Ghim cố định đáy Sidebar) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col gap-3 shrink-0 min-w-[256px]">
          <div className="flex items-center gap-3 px-1">
            {/* THAY ĐỔI: Sử dụng thẻ img trực tiếp kết hợp defaultAvatar và xử lý sự kiện onError */}
            <img
              src={user?.avatarUrl || defaultAvatar}
              alt="User Avatar"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 bg-white"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultAvatar;
              }}
            />

            <div className="overflow-hidden text-left">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user?.fullName || user?.username || "Thành viên"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {user?.email || "Chưa có email"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={13} className="stroke-[2.5] shrink-0" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </aside>

      {/* ĐỆM RỘNG ĐỘNG: Đẩy nội dung trang chủ (Layout bọc ngoài) tránh đè văn bản */}
      <div
        className={`hidden md:block shrink-0 transition-all duration-300 ease-in-out ${
          isOpen ? "w-64" : "w-0"
        }`}
      />
    </>
  );
}
