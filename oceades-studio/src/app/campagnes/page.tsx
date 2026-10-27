import type { Metadata } from "next";
import { CampaignsPage } from "@/components/campaigns/campaigns-page";

export const metadata: Metadata = { title: "Campagnes" };

export default function Page() {
  return <CampaignsPage />;
}
