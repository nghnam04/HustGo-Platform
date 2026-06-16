const normalizeRouteCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const first = coords[0];
  if (!Array.isArray(first) || first.length < 2) return [];
  const shouldSwap = Math.abs(first[0]) > 90;
  return coords.map(([a, b]) => (shouldSwap ? [b, a] : [a, b]));
};

export default normalizeRouteCoordinates;
