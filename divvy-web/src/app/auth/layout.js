// src/app/auth/layout.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }) {
  const token = (await cookies()).get("token")?.value;
  if (token) redirect("/dashboard");
  return <>{children}</>;
}
