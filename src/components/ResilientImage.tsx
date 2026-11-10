import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { resolveMediaUrl, subscribeMediaVault } from '../lib/mediaVault';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  /**
   * 'studio-full' (default): Shows 100% of the uploaded client photograph without cropping
   * heads, crowns, or outfits, backed by a subtle ambient studio blur so the frame always looks full and professional.
   * 'cover': Standard object-cover with top-center alignment.
   * 'contain': Pure object-contain.
   */
  fit?: 'studio-full' | 'cover' | 'contain';
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = 'w-full h-full',
  fallbackTitle,
  fit = 'studio-full',
}) => {
  const [hasError, setHasError] = useState(false);
  const [, setVaultTick] = useState(0);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (src && src.startsWith('vault://')) {
      return subscribeMediaVault(() => setVaultTick((t) => t + 1));
    }
  }, [src]);

  const resolvedSrc = resolveMediaUrl(src);

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1815] via-[#121212] to-[#080808] text-[#D4AF70]/80 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Camera className="w-7 h-7 mb-1.5 stroke-[1.5]" />
        <span className="font-serif-display text-xs tracking-wide text-white/80 line-clamp-2">
          {fallbackTitle || alt || 'CAREMEDIA Visual Archive'}
        </span>
      </div>
    );
  }

  if (fit === 'contain') {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${className} object-contain`}
        loading="lazy"
      />
    );
  }

  if (fit === 'cover') {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${className} object-cover object-top`}
        loading="lazy"
      />
    );
  }

  // Default 'studio-full': 100% of the client image is clearly seen (no cropped heads or outfits)
  // with an ambient studio backdrop filling any aspect ratio difference cleanly.
  return (
    <div className={`relative overflow-hidden bg-[#0B0B0B] flex items-center justify-center ${className}`}>
      <img
        src={resolvedSrc}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-40 pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="relative z-10 w-full h-full object-contain object-center transition-transform duration-500"
        loading="lazy"
      />
    </div>
  );
};
