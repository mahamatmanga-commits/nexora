import type { Metadata } from "next";
import { PlanningPage } from "@/components/ai/planning-page";

export const metadata: Metadata = { title: "Construire mon planning" };

export default function Page() {
  return <PlanningPage />;
}
