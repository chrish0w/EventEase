import { useEffect, useState } from 'react';
import api from '../api/axios';

interface PdfPreviewProps {
  url: string;
  className?: string;
}

export default function PdfPreview({ url, className }: PdfPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let revoked = '';
    let cancelled = false;
    setError('');
    setBlobUrl('');
    api.get(url, { responseType: 'blob' })
      .then(res => {
        if (cancelled) return;
        revoked = URL.createObjectURL(res.data);
        setBlobUrl(revoked);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load PDF');
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [url]);

  if (error) return <div className="text-sm text-red-600 py-8 text-center">{error}</div>;
  if (!blobUrl) return <div className="text-sm text-gray-400 py-8 text-center">Loading PDF…</div>;
  return (
    <iframe
      src={blobUrl}
      title="PDF preview"
      className={className ?? 'w-full h-[500px] border border-gray-200 rounded-lg'}
    />
  );
}
