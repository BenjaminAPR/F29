export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-8 w-56 max-w-full rounded-lg bg-slate-200/90" />
        <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
      </div>
      <div className="h-36 rounded-2xl bg-slate-100 ring-1 ring-slate-900/[0.04]" />
      <div className="h-[22rem] rounded-2xl bg-slate-100 ring-1 ring-slate-900/[0.04]" />
    </div>
  )
}
