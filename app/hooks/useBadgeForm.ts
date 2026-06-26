import { useCallback, useState } from "react";
import type { BadgeStyleInput } from "../types/badge.types";

// Local, client-only form state for the Customizer. The live preview reads
// straight from `values` — no server round trip — so edits render instantly;
// `update` is what every field control calls on change.
export function useBadgeForm(initial: BadgeStyleInput) {
  const [values, setValues] = useState<BadgeStyleInput>(initial);

  const update = useCallback(
    <K extends keyof BadgeStyleInput>(key: K, value: BadgeStyleInput[K]) => {
      setValues((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  return { values, update };
}
