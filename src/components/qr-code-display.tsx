'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { Skeleton } from './ui/skeleton';

export function QrCodeDisplay() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    // This ensures the code only runs on the client-side
    // where window object is available.
    setUrl(window.location.origin);
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border">
      {url ? (
        <QRCode value={url} size={200} level="H" includeMargin={true} />
      ) : (
        <Skeleton className="w-[224px] h-[224px]" />
      )}
    </div>
  );
}
