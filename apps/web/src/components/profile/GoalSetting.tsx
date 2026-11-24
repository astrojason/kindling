"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { setGoalMinutes } from "@/lib/firestore";
import { GOAL_CHOICES } from "@/lib/xp";

export function GoalSetting({ uid, initial }: { uid: string; initial: number }) {
  const [goal, setGoal] = useState(initial);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function choose(minutes: number) {
    setSaving(minutes);
    setError(null);
    try {
      await setGoalMinutes(uid, minutes);
      setGoal(minutes);
      toast(`Daily goal set to ${minutes} minutes.`);
    } catch (err) {
      console.error("Failed to save the daily goal:", err);
      setError(err instanceof Error ? err.message : "Could not save your daily goal.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-base font-extrabold text-fg-strong">Daily goal</h2>
      <div className="flex gap-2">
        {GOAL_CHOICES.map((minutes) => (
          <button key={minutes} type="button" aria-pressed={goal === minutes} disabled={saving !== null} onClick={() => void choose(minutes)}
            className={`flex-1 rounded-button py-1.5 text-sm font-extrabold disabled:opacity-60 ${goal === minutes ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent"}`}>
            {saving === minutes ? "Saving…" : `${minutes} min`}
          </button>
        ))}
      </div>
      {error && <pre role="alert" className="mt-2 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}
    </div>
  );
}
