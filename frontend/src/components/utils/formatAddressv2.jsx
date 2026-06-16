const formatAddressv2 = (order) =>
  [order.receiverAddress, order.receiverWard, order.receiverDistrict]
    .filter(Boolean)
    .join(", ");

export default formatAddressv2;
