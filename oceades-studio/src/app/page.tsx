import { Suspense } from "react";
import { BoardPage } from "@/components/board/board-page";

export default function Page() {
  return (
    <Suspense>
      <BoardPage />
    </Suspense>
  );
}
