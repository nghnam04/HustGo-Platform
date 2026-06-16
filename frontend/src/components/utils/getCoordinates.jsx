const getCoordinates = async ({ address, ward, district, type }) => {
  const clean = (str) => str?.trim().replace(/\s+/g, " ") || "";

  const districtLabel = district || "";
  const street = clean(address);
  const wardClean = clean(ward);

  // Danh sách query theo thứ tự ưu tiên cao → thấp
  const queries = [
    `${street}, ${districtLabel}, Hà Nội, Việt Nam`,
    `${street}, ${wardClean}, ${districtLabel}, Hà Nội, Việt Nam`,
    `${street}, ${wardClean}, Hà Nội, Việt Nam`,
    `${street}, Hà Nội, Việt Nam`,
  ];

  for (const q of queries) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(q)}&` +
          `limit=5&` +
          `addressdetails=1&` +
          `countrycodes=vn&` +
          `accept-language=vi`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "HustGo_Order_App",
          },
        },
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const best = data[0];
        return {
          lat: Number(best.lat),
          lng: Number(best.lon),
        };
      }
    } catch (err) {
      console.error(`Geocoding ${type} error:`, err);
    }
  }

  return null;
};

export default getCoordinates;
