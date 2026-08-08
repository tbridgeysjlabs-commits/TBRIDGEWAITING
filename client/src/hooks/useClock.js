import { useEffect, useState } from 'react';
import { formatNow } from '../api/client';

export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(formatNow());
  useEffect(() => {
    const id = setInterval(() => setNow(formatNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
