"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const VibeCompanion = dynamic(
  () =>
    import("vibe-kanban-web-companion").then(
      (mod) => mod.VibeKanbanWebCompanion
    ),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      {children}
      {isDev ? <VibeCompanion /> : null}
    </>
  );
}
