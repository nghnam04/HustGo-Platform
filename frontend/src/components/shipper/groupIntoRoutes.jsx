export default function groupIntoRoutes(orders) {
  const map = {};
  for (const o of orders) {
    if (!o.routeId) continue;
    if (!map[o.routeId]) {
      map[o.routeId] = {
        routeId: o.routeId,
        hubId: o.currentHubId,
        hubName: o.currentHubName || o.currentHubId || "Hub chưa xác định",
        hubLat: o.currentHubLat,
        hubLng: o.currentHubLng,
        hubAddress: o.currentHubAddress,
        hubWard: o.currentHubWard,
        hubDistrict: o.currentHubDistrict,
        orders: [],
      };
    }
    map[o.routeId].orders.push(o);
  }
  return Object.values(map);
}
