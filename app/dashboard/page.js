import { auth } from "../../auth";
import { redirect } from "next/navigation";
import DashboardClient from "./client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <DashboardClient user={session.user} />;
}
