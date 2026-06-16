import { HANOI_DISTRICTS } from "../../constants/hanoiDistricts";

const getDistrictLabel = (value) => {
  return HANOI_DISTRICTS.find((d) => d.value === value)?.label || value;
};

export default getDistrictLabel;
