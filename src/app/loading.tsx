import { Brain } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Brain className="w-5 h-5 text-primary" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Loading CoFound…</p>
      </div>
    </div>
  );
}
