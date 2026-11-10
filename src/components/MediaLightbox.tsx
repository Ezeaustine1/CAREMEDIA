import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Film, Camera } from 'lucide-react';
import { PortfolioItemData } from '../data/initialData';
import { ResilientImage } from './ResilientImage';
import { resolveMediaUrl, subscribeMediaVault } from '../lib/mediaVault';

interface MediaLightboxProps {
  item: PortfolioItemData | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onBookSimilar?: (category: string, title: string) => void;
}

export function getEmbedVideoUrl(url: string): { type: 'iframe' | 'video'; src: string } {
  const resolved = resolveMediaUrl(url);
  const trimmed = (resolved || '').trim();
  // Check YouTube
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    };
  }
  // Check Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'iframe',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }
  return {
    type: 'video',
    src: trimmed,
  };
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  item,
  onClose,
  onPrev,
  onNext,
  onBookSimilar,
}) => {
  const [, setVaultTick] = useState(0);

  useEffect(() => {
    return subscribeMediaVault(() => setVaultTick((t) => t + 1));
  }, []);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose, onPrev, onNext]);

  if (!item) return null;

  const videoSource = item.mediaType === 'video' ? getEmbedVideoUrl(item.mediaUrl) : null;
  const resolvedPoster = resolveMediaUrl(item.thumbnailUrl || item.mediaUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080808]/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="text-[#D4AF70] font-medium flex items-center gap-1.5">
            {item.mediaType === 'video' ? (
              <Film className="w-3.5 h-3.5" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            {item.category}
          </span>
          {item.clientName && (
            <>
              <span aria-hidden="true">·</span>
              <span>Client: {item.clientName}</span>
            </>
          )}
          {item.exifInfo && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-zinc-300">{item.exifInfo}</span>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-[#D4AF70] hover:text-[#080808] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          aria-label="Close viewer"
        >
          <span>Close</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Media Stage */}
      <div className="relative flex-1 flex items-center justify-center my-4 min-h-[300px] max-h-[74vh]">
        {onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-1 md:left-4 z-20 p-3 rounded-full bg-[#151515]/90 border border-white/15 text-white hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors cursor-pointer"
            aria-label="Previous work"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="w-full max-w-5xl h-full flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0B0B0B] p-2">
          {item.mediaType === 'video' && videoSource ? (
            videoSource.type === 'iframe' ? (
              <div className="w-full aspect-video">
                <iframe
                  src={videoSource.src}
                  title={item.title}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                key={videoSource.src}
                src={videoSource.src}
                poster={resolvedPoster}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[70vh] aspect-video object-contain bg-black rounded-lg"
              >
                Your browser does not support HTML5 video playback.
              </video>
            )
          ) : (
            <ResilientImage
              src={item.mediaUrl || item.thumbnailUrl}
              alt={item.title}
              fallbackTitle={item.title}
              fit="contain"
              className="max-h-[70vh] w-auto max-w-full"
            />
          )}
        </div>

        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-1 md:right-4 z-20 p-3 rounded-full bg-[#151515]/90 border border-white/15 text-white hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors cursor-pointer"
            aria-label="Next work"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Caption & CTA */}
      <div className="max-w-5xl w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-white/10 pt-4">
        <div>
          <h3 className="font-serif-display text-2xl md:text-3xl font-semibold text-white">
            {item.title}
          </h3>
          <p className="text-sm text-zinc-300 mt-1 max-w-2xl">{item.description}</p>
        </div>

        {onBookSimilar && (
          <button
            onClick={() => {
              onClose();
              onBookSimilar(item.category, item.title);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#D4AF70] text-[#080808] hover:bg-[#e2c186] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Similar Production</span>
          </button>
        )}
      </div>
    </div>
  );
};
