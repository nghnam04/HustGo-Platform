const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\s T]/);
  if (parts.length < 2) return null;
  const [ymd, hms] = parts;
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi, s] = (hms || "0:0:0").split(":").map(Number);
  return new Date(y, mo - 1, d, h || 0, mi || 0, s || 0, 0);
};

export default parseDate;
