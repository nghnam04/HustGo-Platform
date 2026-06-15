import { motion } from "framer-motion";

export default function LoadingSpinner({ size = "md", message }) {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 antialiased">
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute rounded-full border-wine-light/10 ${sizeClasses[size]}`}
        />

        <motion.div
          className={`rounded-full border-t-wine-accent border-r-wine-light border-b-transparent border-l-transparent shadow-lg shadow-wine-accent/20 ${sizeClasses[size]}`}
          animate={{ rotate: 360 }}
          transition={{
            loop: Infinity,
            repeat: Infinity,
            duration: 0.8,
            ease: "linear",
          }}
        />

        <div className="absolute w-1.5 h-1.5 rounded-full bg-wine-accent/60 blur-[1px] animate-pulse" />
      </div>

      {/* 4. Đoạn văn bản chỉ thị */}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[11px] font-mono tracking-widest uppercase text-wine-light font-semibold"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
