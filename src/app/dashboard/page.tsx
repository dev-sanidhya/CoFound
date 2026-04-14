"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadBrain, CompanyBrain } from "@/lib/brain";
import { Council } from "@/components/council/Council";

export default function DashboardPage() {
  const router = useRouter();
  const [brain, setBrain] = useState<CompanyBrain | null>(null);

  useEffect(() => {
    const b = loadBrain();
    if (!b) {
      router.replace("/onboarding");
      return;
    }
    setBrain(b);
  }, [router]);

  if (!brain) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your council…</p>
        </div>
      </div>
    );
  }

  return <Council brain={brain} />;
}
