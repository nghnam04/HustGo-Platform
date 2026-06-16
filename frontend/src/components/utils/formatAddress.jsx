const formatAddress = (address, ward, district) =>
  [address, ward, district].filter(Boolean).join(", ");

export default formatAddress;
