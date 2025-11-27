'use client';

import { useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';

export function Confetti({ onComplete }: { onComplete?: () => void }) {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // This code runs only on the client
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (windowSize.width === 0) {
    return null; // Don't render on the server or before dimensions are set
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'none' }}>
      <ReactConfetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={500}
        tweenDuration={5000}
        gravity={0.2}
        onConfettiComplete={onComplete}
      />
    </div>
  );
}
