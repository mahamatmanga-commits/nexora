import type { Metadata } from "next";
import { MediaPage } from "@/components/media/media-page";

export const metadata: Metadata = { title: "Médiathèque" };

export default function Page() {
  return <MediaPage />;
}
