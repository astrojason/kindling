export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-fg-muted">
      <div>Couldn&apos;t load today&apos;s lesson.</div>
      <div className="text-[13px] text-rust">{message}</div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-button bg-accent px-4 py-2 text-sm font-extrabold text-accent-fg transition-opacity hover:opacity-85"
      >
        Try again
      </button>
    </div>
  );
}
