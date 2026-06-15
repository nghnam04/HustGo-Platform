import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import moneyFormat from "../utils/moneyFormat";

function CustomTooltip({ active, payload, label, type = "hub" }) {
  if (!active || !payload?.length) return null;
  if (type === "shipper") {
    const baseEarnings =
      payload.find((p) => p.dataKey === "baseEarnings")?.value || 0;
    const codCommission =
      payload.find((p) => p.dataKey === "codCommission")?.value || 0;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
        <div className="font-semibold text-slate-700 mb-1">{label}</div>
        <div className="text-emerald-600">
          Lương cứng (10k/đơn): {moneyFormat.format(baseEarnings)}
        </div>
        <div className="text-yellow-500">
          Hoa hồng COD (2%): {moneyFormat.format(codCommission)}
        </div>
      </div>
    );
  }
  if (type === "customer") {
    const chiTieu = payload.find((p) => p.dataKey === "chiTieu")?.value || 0;
    const codNhan = payload.find((p) => p.dataKey === "codNhan")?.value || 0;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
        <div className="font-semibold text-slate-700 mb-1">{label}</div>
        <div className="text-emerald-600">
          Chi tiêu: {moneyFormat.format(chiTieu)}
        </div>
        <div className="text-yellow-500">
          COD cần nhận: {moneyFormat.format(codNhan)}
        </div>
      </div>
    );
  }

  const hubRevenue =
    payload.find((p) => p.dataKey === "hubRevenue")?.value || 0;
  const codAmount = payload.find((p) => p.dataKey === "codAmount")?.value || 0;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-slate-700 mb-1">{label}</div>
      <div className="text-emerald-600">
        Doanh thu Hub: {moneyFormat.format(hubRevenue)}
      </div>
      <div className="text-yellow-500">
        COD cần hoàn: {moneyFormat.format(codAmount)}
      </div>
    </div>
  );
}

export default function RevenueChart({ data, view, type = "hub" }) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data.map((d) => {
      let dayOfMonth, month;

      if (d.date) {
        if (typeof d.date === "string") {
          const [y, m, day] = d.date.split("-").map(Number);
          dayOfMonth = day;
          month = m;
        } else {
          dayOfMonth = d.date.dayOfMonth;
          month = d.date.month;
        }
      }

      if (!dayOfMonth && d.label) {
        const parts = d.label.split("/");
        dayOfMonth = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
      return {
        label: d.label || (dayOfMonth && month ? `${dayOfMonth}/${month}` : ""),
        hubRevenue: Number(d.hubRevenue || d.baseEarnings || 0),
        codAmount: Number(d.codAmount || d.codCommission || 0),
        chiTieu: Number(d.chiTieu || 0),
        codNhan: Number(d.codNhan || 0),
        baseEarnings: Number(d.baseEarnings || 0),
        codCommission: Number(d.codCommission || 0),
        totalRevenue: Number(d.totalRevenue || 0),
        orderCount: d.orderCount || 0,
      };
    });
  }, [data]);

  // Calculate responsive width for chart
  const [chartWidth, setChartWidth] = useState(
    typeof window !== "undefined" && window.innerWidth < 1024
      ? Math.max(chartData.length * 44, 500)
      : 0, // 0 means 100%
  );

  useEffect(() => {
    const updateWidth = () => {
      if (window.innerWidth >= 1024) {
        setChartWidth(0); // 0 makes ResponsiveContainer use 100%
      } else {
        const minWidth = Math.max(chartData.length * 44, 500);
        setChartWidth(minWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [chartData.length]);

  if (!chartData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Chưa có dữ liệu doanh thu
      </div>
    );
  }

  // ResponsiveContainer: 0 or "100%" = 100% width, number = exact pixels
  const containerWidth = chartWidth === 0 ? "100%" : chartWidth;

  return (
    <div className="overflow-x-auto lg:overflow-visible -mx-2 lg:mx-0">
      <ResponsiveContainer width={containerWidth} height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={view === "day" ? 0 : Math.floor(chartData.length / 8)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => moneyFormat.format(v)}
            width={60}
          />
          <Tooltip content={<CustomTooltip type={type} />} />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(value) => (
              <span className="text-slate-600">{value}</span>
            )}
          />
          {type === "customer" ? (
            <>
              <Bar
                dataKey="chiTieu"
                name="Chi tiêu"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="codNhan"
                name="COD cần nhận"
                fill="#f97316"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
            </>
          ) : type === "shipper" ? (
            <>
              <Bar
                dataKey="baseEarnings"
                name="Lương cứng (10k/đơn)"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="codCommission"
                name="Hoa hồng COD (2%)"
                fill="#f97316"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
            </>
          ) : (
            <>
              <Bar
                dataKey="hubRevenue"
                name="Doanh thu Hub"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="codAmount"
                name="COD cần hoàn"
                fill="#f97316"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
