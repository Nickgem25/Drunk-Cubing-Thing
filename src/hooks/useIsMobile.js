import { useState, useEffect } from 'react';

// Same breakpoint as the @media (max-width: 700px) rules in index.css
const QUERY = '(max-width: 700px)';

// true on phones, false on bigger screens. Updates if the window is resized.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
