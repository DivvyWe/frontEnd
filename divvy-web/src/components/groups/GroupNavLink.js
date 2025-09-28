"use client";
import Link from "next/link";
import { useGroupCache } from "@/store/useGroupCache";

export default function GroupNavLink({ g, className = "", children }) {
  const { setLastClicked, remember } = useGroupCache();
  const href = `/groups/${g._id}`;

  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        const id = String(g._id || "");
        const name = String(g.name || "Group");
        setLastClicked({ id, name });
        remember({ id, name });
      }}
    >
      {children}
    </Link>
  );
}
