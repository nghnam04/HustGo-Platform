import { Star } from "lucide-react";

const getRatingStars = (rating, setRating = null) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={18}
      onClick={() => setRating && setRating(i + 1)}
      className={`${
        i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
      } ${setRating ? "cursor-pointer" : ""}`}
    />
  ));
};

export default getRatingStars;
