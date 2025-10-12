// app/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/auth/signin");
  redirect("/groups");
}
