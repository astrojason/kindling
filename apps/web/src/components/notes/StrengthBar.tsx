/** A 1-5 recall strength as five segments, filled up to the last self-rating. */
export function StrengthBar({ value }: { value: number }) {
  return (
    <div role="img" aria-label={`Strength ${value} of 5`} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`h-1.5 w-5 rounded-full ${n <= value ? "bg-accent" : "bg-border"}`} />
      ))}
    </div>
  );
}
