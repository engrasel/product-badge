import { useCallback, useState } from "react";
import type { BadgeStyleInput } from "../types/badge.types";

// Local, client-only form state for the Customizer. The live preview reads
// straight from `values` — no server round trip — so edits render instantly;
// `update` is what every field control calls on change. Past/future stacks
// back Undo/Redo; `reset` jumps back to whatever was loaded on mount.
export function useBadgeForm(initial: BadgeStyleInput) {
  const [past, setPast] = useState<BadgeStyleInput[]>([]);
  const [present, setPresent] = useState<BadgeStyleInput>(initial);
  const [future, setFuture] = useState<BadgeStyleInput[]>([]);

  const update = useCallback(
    <K extends keyof BadgeStyleInput>(key: K, value: BadgeStyleInput[K]) => {
      setPast((prev) => [...prev, present]);
      setPresent((prev) => ({ ...prev, [key]: value }));
      setFuture([]);
    },
    [present],
  );

  const undo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [present, ...f]);
      setPresent(previous);
      return prev.slice(0, -1);
    });
  }, [present]);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setPast((p) => [...p, present]);
      setPresent(next);
      return prev.slice(1);
    });
  }, [present]);

  const reset = useCallback(() => {
    setPast((prev) => [...prev, present]);
    setPresent(initial);
    setFuture([]);
  }, [present, initial]);

  return {
    values: present,
    update,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
