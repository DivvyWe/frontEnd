"use client";

import ClipLoader from "react-spinners/ClipLoader";

export default function LoadingSpinner({ size = 40, color = "#0f172a" }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <ClipLoader size={size} color={color} speedMultiplier={1.2} />
    </div>
  );
}
