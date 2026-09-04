import { useEffect, useMemo, useState } from 'react';
import styles from './TypewriterGreeting.module.css';

const START_DELAY_MS = 160;
const CHARACTER_INTERVAL_MS = 70;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function readsReducedMotionPreference() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function TypewriterGreeting({ text }: Readonly<{ text: string }>) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [reducedMotion, setReducedMotion] = useState(readsReducedMotionPreference);
  const [visibleCharacters, setVisibleCharacters] = useState(0);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const preference = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) return undefined;

    let interval: number | undefined;
    const delay = window.setTimeout(() => {
      setVisibleCharacters(0);
      interval = window.setInterval(() => {
        setVisibleCharacters((current) => {
          if (current >= characters.length) {
            if (interval !== undefined) window.clearInterval(interval);
            return current;
          }
          return current + 1;
        });
      }, CHARACTER_INTERVAL_MS);
    }, START_DELAY_MS);

    return () => {
      window.clearTimeout(delay);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [characters, reducedMotion]);

  const renderedCharacterCount = reducedMotion ? characters.length : Math.min(visibleCharacters, characters.length);
  const isComplete = renderedCharacterCount >= characters.length;

  return (
    <span
      className={styles.typewriter}
      data-state={isComplete ? 'complete' : 'typing'}
      data-workbuddy-typewriter="true"
    >
      <span className={styles.assistive}>{text}</span>
      <span className={styles.measure} aria-hidden="true">{text}</span>
      <span className={styles.visual} aria-hidden="true" data-typewriter-visual="true">
        {characters.slice(0, renderedCharacterCount).join('')}
        {!isComplete ? <span className={styles.caret} /> : null}
      </span>
    </span>
  );
}
