import { Brain, LogOut, Settings } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">CoFound</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Edit brain
          </Link>
          <Link
            href="/api/auth/logout"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Link>
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
