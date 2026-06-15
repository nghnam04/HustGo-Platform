import {
  Boxes,
  Navigation,
  Truck,
  ArrowRightLeft,
  MapPin,
  FileText,
  Layers,
  Users,
  PackagePlus,
  HelpCircle,
  ClipboardList,
  LayoutDashboard,
  Route,
  PackageCheck,
  History,
  MessageCircle,
} from "lucide-react";

const iconMap = {
  // CUSTOMER
  "Dashboard khách hàng": LayoutDashboard,
  "Tạo đơn hàng": PackagePlus,
  "Lịch sử đơn hàng": ClipboardList,
  "Phản hồi của tôi": MessageCircle,
  "Theo dõi hành trình đơn hàng": MapPin,

  // SHIPPER
  "Dashboard Shipper": LayoutDashboard,
  "Tuyến khả dụng": Route,
  "Đơn đang giao": PackageCheck,
  "Lịch sử giao hàng": History,

  // HUB ADMIN
  "Dashboard Hub": LayoutDashboard,
  "Tiếp nhận hàng từ khách": PackagePlus,
  "Nhập kho trung chuyển": Truck,
  "Tạo chuyến trung chuyển": ArrowRightLeft,
  "Quản lý tồn kho tại Hub": Boxes,
  "Phân tuyến giao hàng": Navigation,
  "Theo dõi tuyến giao": MapPin,

  // SUPER ADMIN
  "Dashboard hệ thống": LayoutDashboard,
  "Quản lý đơn hàng": FileText,
  "Quản lý bưu cục": Layers,
  "Quản lý người dùng": Users,
  "Quản lý phản hồi": MessageCircle,
};

export const getIcon = (name) => {
  return iconMap[name] || HelpCircle;
};
