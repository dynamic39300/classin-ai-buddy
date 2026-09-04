import { useEffect, useState } from 'react';

function secondsUntil(deadline: number | null): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
}

export function useDeadlineCountdown(deadline: number | null): number | null {
  const [remainingSeconds, setRemainingSeconds] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    const update = () => {
      const next = secondsUntil(deadline);
      setRemainingSeconds((current) => current === next ? current : next);
    };
    update();
    if (deadline === null) return undefined;
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return remainingSeconds;
}
