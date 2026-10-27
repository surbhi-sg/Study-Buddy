export function Loading() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/70" />)}
    </div>
  )
}
export function ErrorBox({ message }) {
  return <div className="rounded-2xl bg-[#FDE2E2] p-4 text-sm font-medium text-[#C03A3A]">⚠️ {message}</div>
}
export function Empty({ message }) {
  return <div className="rounded-2xl border-2 border-dashed bg-white/60 p-6 text-center text-sm text-muted">{message}</div>
}
