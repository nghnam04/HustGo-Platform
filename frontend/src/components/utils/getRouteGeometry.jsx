import decodePolyline from "./decodePolyline";
import normalizeRouteCoordinates from "./normalizeRouteCoordinates";

const getRouteGeometry = (previewData) => {
  if (!previewData) return null;
  const geometryPaths = [
    previewData.route?.geometry,
    previewData.routes?.[0]?.geometry,
    previewData.routeGeometry,
    previewData.geometry,
    previewData.route?.shape,
    previewData.routes?.[0]?.shape,
  ];
  for (const geometry of geometryPaths) {
    if (!geometry) continue;
    if (typeof geometry === "string") {
      const decoded5 = decodePolyline(geometry, 5);
      if (decoded5.length > 0 && Math.abs(decoded5[0][0]) <= 90) {
        return normalizeRouteCoordinates(decoded5);
      }
      return normalizeRouteCoordinates(decodePolyline(geometry, 6));
    }
    if (Array.isArray(geometry) && geometry.length > 0) {
      return normalizeRouteCoordinates(geometry);
    }
    if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
      return normalizeRouteCoordinates(geometry.coordinates);
    }
  }
  return null;
};

export default getRouteGeometry;
