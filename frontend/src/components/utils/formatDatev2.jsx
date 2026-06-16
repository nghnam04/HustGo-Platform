import dayjs from "dayjs";

const formatDatev2 = (dateString) => {
  if (!dateString) return "Chưa có dữ liệu";
  const date = dayjs(dateString);
  return date.isValid() ? date.format("DD/MM/YYYY HH:mm:ss") : "---";
};

export default formatDatev2;
