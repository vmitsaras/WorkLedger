import { useEffect, useState } from 'react';

export function useWideAdministrationLayout(): boolean {
  const [wide, setWide] = useState(readWideAdministrationLayout);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 48rem)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);

  return wide;
}

function readWideAdministrationLayout(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 48rem)').matches;
}
