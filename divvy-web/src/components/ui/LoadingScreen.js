"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-[2px]"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Bars Loader */}
      <div className="flex items-end gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-6 w-2 sm:h-8 sm:w-2.5 md:h-10 md:w-3 rounded-full bg-lime-400"
            animate={{ scaleY: [1, 1.8, 1] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
