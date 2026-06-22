import { useEffect, useRef, useState } from "react";
import {
  LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS,
  type LoadoutActionFeedbackState
} from "../../utils/loadoutActionFeedback";

export function useLoadoutActionFeedback() {
  const [actionFeedback, setActionFeedback] = useState<Record<string, LoadoutActionFeedbackState>>({});
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
    timersRef.current = {};
  }, []);

  function setSingleActionFeedback(key: string, state: LoadoutActionFeedbackState) {
    const existingTimer = timersRef.current[key];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete timersRef.current[key];
    }

    setActionFeedback((current) => {
      if (state === "idle") {
        if (!(key in current)) {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      }

      return {
        ...current,
        [key]: state
      };
    });

    if (state === "success") {
      timersRef.current[key] = window.setTimeout(() => {
        setActionFeedback((current) => {
          if (!(key in current)) {
            return current;
          }
          const next = { ...current };
          delete next[key];
          return next;
        });
        delete timersRef.current[key];
      }, LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS);
    }
  }

  return {
    actionFeedback,
    setSingleActionFeedback
  };
}
