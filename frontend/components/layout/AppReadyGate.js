'use client';

import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';

// Keeps the app invisible (but already mounted/hydrating in the background)
// until fonts have loaded and the browser has had a couple of paint frames
// to apply MUI's emotion-injected styles. This avoids the "giant unstyled
// icon" flash that happens when raw SVGs paint before their CSS classes
// (width/height in em units, etc.) have been attached.
export default function AppReadyGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let cancelled = false;

    const settle = () => {
      // Wait two animation frames after fonts/styles are in so layout has
      // fully stabilized before revealing the app.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    };

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(settle).catch(settle);
    } else {
      settle();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <>
      {/* Plain inline style (not sx) so this is present in the raw SSR HTML
          before any emotion stylesheet has been injected — that's what
          actually prevents the flash, not the JS state update. */}
      <div style={{ visibility: ready ? 'visible' : 'hidden' }}>{children}</div>

      {!ready && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
          }}
        >
          <CircularProgress size={32} thickness={4} sx={{ color: 'primary.main' }} />
        </div>
      )}
    </>
  );
}
