export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center gap-3">
      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Assembling your council…</p>
    </div>
  );
}
