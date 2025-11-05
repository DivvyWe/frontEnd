// app/groups/layout.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function GroupsLayout({ children }) {
  const token = (await cookies()).get("token")?.value;

  // QUICK FIX: presence-only check
  if (!token) {
    redirect("/auth/signin");
  }

  return <>{children}</>;
}
