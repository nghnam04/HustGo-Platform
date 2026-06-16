const decodePolyline = (encoded, precision = 5) => {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates = [];
  const factor = 10 ** precision;
  while (index < encoded.length) {
    let result = 0,
      shift = 0,
      byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
};

export default decodePolyline;
