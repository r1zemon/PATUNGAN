
import type React from "react";

// This is the correct, minimal layout for the /app route group.
// It simply renders the pages within this route.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
