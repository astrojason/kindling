export function LoadingView({ text }: { text: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-sm font-semibold text-fg-muted">
      <div className="size-7 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent" />
      <div>{text}</div>
    </div>
  );
}
