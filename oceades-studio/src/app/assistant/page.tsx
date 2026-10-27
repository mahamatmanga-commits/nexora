import type { Metadata } from "next";
import { AssistantPage } from "@/components/ai/assistant-page";

export const metadata: Metadata = { title: "Assistant IA" };

export default function Page() {
  return <AssistantPage />;
}
