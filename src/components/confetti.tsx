'use client';

import { useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';

export function Confetti({ active }: { active: boolean }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!isClient || !active) {
    return null;
  }

  return (
    <ReactConfetti
      width={dimensions.width}
      height={dimensions.height}
      recycle={false}
      numberOfPieces={400}
      tweenDuration={10000}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
      confettiSource={{
        x: dimensions.width / 2,
        y: 0,
        w: 0,
        h: 0,
      }}
    />
  );
}
