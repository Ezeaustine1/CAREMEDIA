import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Camera,
  Film,
  Grid,
  MessageCircle,
  Play,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  CategoryData,
  PortfolioItemData,
  SiteSettingsData,
  formatWhatsAppUrl,
} from '../data/initialData';
import { ResilientImage } from './ResilientImage';
import { MediaLightbox } from './MediaLightbox';

interface PortfolioArchivePageProps {
  portfolioItems: PortfolioItemData[];
  categories: CategoryData[];
  initialCategory: string;
  siteSettings: SiteSettingsData;
  onBackToHome: () => void;
  onOpenAdmin: () => void;
  onBookCategory: (category: string, workTitle?: string) => void;
}

export const PortfolioArchivePage: React.FC<PortfolioArchivePageProps> = ({
  portfolioItems,
  categories,
  initialCategory,
  siteSettings,
  onBackToHome,
  onOpenAdmin,
  onBookCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    setSelectedCategory(initialCategory || 'All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialCategory]);

  // Reset pagination count when filter changes
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedCategory, mediaFilter, searchQuery]);

  const filteredItems = portfolioItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Videography'
        ? item.category === 'Videography' || item.mediaType === 'video'
        : item.category === selectedCategory;

    const matchesMedia =
      mediaFilter === 'all' ? true : item.mediaType === mediaFilter;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q
      ? true
      : item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.clientName || '').toLowerCase().includes(q);

    return matchesCategory && matchesMedia && matchesSearch;
  });

  const displayedItems = filteredItems.slice(0, visibleCount);
  const activeLightboxItem =
    lightboxIdx !== null && filteredItems[lightboxIdx]
      ? filteredItems[lightboxIdx]
      : null;

  const getCategoryCount = (catName: string) => {
    if (catName === 'All') return portfolioItems.length;
    if (catName === 'Videography') {
      return portfolioItems.filter(
        (i) => i.category === 'Videography' || i.mediaType === 'video'
      ).length;
    }
    return portfolioItems.filter((i) => i.category === catName).length;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Top Sticky Archive Header */}
      <header className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 hover:border-[#D4AF70] text-xs font-semibold text-white hover:text-[#D4AF70] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Front Page</span>
            </button>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <span className="font-serif-display text-xl font-bold tracking-tight text-white">
              {siteSettings.heroTitle}{' '}
              <span className="text-[#D4AF70] font-normal text-sm">
                Full Portfolio Archive
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() =>
                onBookCategory(
                  selectedCategory === 'All'
                    ? 'Wedding Photography & Videography'
                    : selectedCategory
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book a Session</span>
            </button>
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4AF70]/40 bg-[#151515] hover:bg-[#D4AF70] text-xs font-semibold text-white hover:text-[#080808] transition-colors cursor-pointer group"
              title="Open Studio Admin Dashboard"
            >
              <Settings className="w-3.5 h-3.5 text-[#D4AF70] group-hover:text-[#080808]" />
              <span className="hidden md:inline">Admin Upload</span>
            </button>
          </div>
        </div>
      </header>

      {/* Archive Hero Banner */}
      <section className="bg-[#111111] border-b border-white/10 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-[#D4AF70] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Complete CAREMEDIA Gallery · Up to 100+ High-Resolution Photographs &amp; Films
                </span>
              </p>
              <h1 className="font-serif-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-1.5">
                {selectedCategory === 'All'
                  ? 'All Photography & Cinema Works'
                  : `${selectedCategory} Portfolio Archive`}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-2xl">
                Showing {filteredItems.length} curated works in{' '}
                <span className="text-white font-medium">
                  {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                </span>
                . Click any photograph or film reel to inspect in full-screen high definition.
              </p>
            </div>

            {/* Search & Media Type Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title or client..."
                  className="w-full sm:w-56 pl-9 pr-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF70]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080808] border border-white/10">
                {[
                  { id: 'all', label: 'All Media', icon: Grid },
                  { id: 'photo', label: 'Photos', icon: Camera },
                  { id: 'video', label: 'Videos', icon: Film },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = mediaFilter === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMediaFilter(m.id as 'all' | 'photo' | 'video')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Filter Pills (Weddings to Videography + Admin Custom Categories) */}
          <div className="mt-6 flex items-center gap-1.5 p-1.5 bg-[#080808] border border-white/10 rounded-xl overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'All'
                  ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>All Works</span>
              <span
                className={`font-mono-tabular text-[11px] ${
                  selectedCategory === 'All' ? 'text-[#080808]/80' : 'text-zinc-500'
                }`}
              >
                ({getCategoryCount('All')})
              </span>
            </button>

            {categories.map((cat) => {
              const active = selectedCategory === cat.name;
              const count = getCategoryCount(cat.name);
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                      : 'text-zinc-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      active ? 'text-[#080808]/80' : 'text-zinc-500'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Gallery Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {filteredItems.length === 0 ? (
          <div className="p-12 rounded-2xl border border-white/10 bg-[#151515] text-center space-y-4">
            <p className="text-base text-zinc-300">
              No photographs or videos found in &ldquo;{selectedCategory}&rdquo; yet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setMediaFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold cursor-pointer"
              >
                Show All Categories
              </button>
              <button
                onClick={onOpenAdmin}
                className="px-4 py-2 rounded-lg border border-white/15 text-xs font-medium text-white hover:border-[#D4AF70] cursor-pointer"
              >
                Upload Works in Admin Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {displayedItems.map((item, idx) => (
                <article
                  key={item.id}
                  onClick={() => setLightboxIdx(idx)}
                  className="group rounded-xl overflow-hidden border border-white/10 bg-[#151515] hover:border-[#D4AF70]/60 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative h-56 w-full bg-[#0A0A0A] overflow-hidden">
                    <ResilientImage
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.title}
                      fit="studio-full"
                      className="w-full h-full"
                    />

                    {/* Media Type Indicator */}
                    <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-sm border border-white/10 text-[11px] font-medium text-[#D4AF70] flex items-center gap-1">
                      {item.mediaType === 'video' ? (
                        <>
                          <Film className="w-3 h-3" />
                          <span>Video</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3 h-3" />
                          <span>{item.category}</span>
                        </>
                      )}
                    </div>

                    {item.mediaType === 'video' && (
                      <div className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-[#D4AF70] text-[#080808] flex items-center justify-center shadow-md">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between bg-[#121212]">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                        <span className="text-[#D4AF70] font-medium truncate">
                          {item.category}
                        </span>
                        {item.clientName && (
                          <span className="truncate text-zinc-400">{item.clientName}</span>
                        )}
                      </div>
                      <h3 className="font-serif-display text-lg font-semibold text-white mt-1 line-clamp-1 group-hover:text-[#D4AF70] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {item.exifInfo && (
                      <p className="font-mono-tabular text-[11px] text-zinc-500 mt-2.5 pt-2 border-t border-white/5 truncate">
                        {item.exifInfo}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Load More / Show All Controls for 100+ items */}
            {filteredItems.length > visibleCount && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 20)}
                  className="px-6 py-3 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                >
                  Load Next 20 Works ({filteredItems.length - visibleCount} Remaining)
                </button>
                <button
                  onClick={() => setVisibleCount(filteredItems.length)}
                  className="px-5 py-3 rounded-xl border border-white/15 text-xs font-medium text-white hover:border-[#D4AF70] cursor-pointer"
                >
                  Show All {filteredItems.length} Works
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom CTA Strip */}
      <footer className="bg-[#111111] border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-serif-display text-2xl font-bold text-white">
              Ready to Book Your Own {selectedCategory === 'All' ? 'Production' : selectedCategory} Session?
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {siteSettings.heroTitle} · {siteSettings.location} · {siteSettings.phone}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                onBookCategory(
                  selectedCategory === 'All'
                    ? 'Wedding Photography & Videography'
                    : selectedCategory
                )
              }
              className="px-5 py-2.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
            >
              Book This Service
            </button>
            <a
              href={formatWhatsAppUrl(
                siteSettings.phone,
                `Hello CAREMEDIA, I just viewed your ${selectedCategory} portfolio archive and would like to book a session.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-xs font-medium text-white hover:border-[#D4AF70]"
            >
              <MessageCircle className="w-4 h-4 text-[#D4AF70]" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </footer>

      <MediaLightbox
        item={activeLightboxItem}
        onClose={() => setLightboxIdx(null)}
        onPrev={
          filteredItems.length > 1
            ? () =>
                setLightboxIdx((prev) =>
                  prev !== null
                    ? (prev - 1 + filteredItems.length) % filteredItems.length
                    : 0
                )
            : undefined
        }
        onNext={
          filteredItems.length > 1
            ? () =>
                setLightboxIdx((prev) =>
                  prev !== null ? (prev + 1) % filteredItems.length : 0
                )
            : undefined
        }
        onBookSimilar={(cat, title) => onBookCategory(cat, title)}
      />
    </div>
  );
};
