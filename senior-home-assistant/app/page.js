import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ROLES } from "@/lib/constants";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === ROLES.ADMIN ? "/admin" : "/client");
  redirect("/login");
}
