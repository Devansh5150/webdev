import type { ReactNode } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full flex flex-col min-h-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-2 focus:bg-cyan focus:text-bg">Skip to content</a>
      <Topbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main id="main" className="flex-1 min-w-0 min-h-0 overflow-auto lg:overflow-hidden p-3">{children}</main>
      </div>
    </div>
  );
}
