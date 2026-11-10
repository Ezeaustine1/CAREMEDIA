/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ArrowDown,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Film,
  Grid,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Settings,
  Star,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  BLUEPRINT_LIMITS,
  sanitizeString,
  makeValidDocId,
} from './lib/firebase';
import {
  GENERATED_ASSETS,
  PortfolioItemData,
  CategoryData,
  ServiceItemData,
  BookingData,
  TestimonialData,
  SiteSettingsData,
  DEFAULT_PORTFOLIO_ITEMS,
  DEFAULT_CATEGORIES,
  DEFAULT_SERVICES,
  DEFAULT_TESTIMONIALS,
  DEFAULT_SITE_SETTINGS,
  formatWhatsAppUrl,
} from './data/initialData';
import { resolveMediaUrl, subscribeMediaVault } from './lib/mediaVault';
import { studioApi } from './lib/apiClient';
import { ResilientImage } from './components/ResilientImage';
import { MediaLightbox, getEmbedVideoUrl } from './components/MediaLightbox';
import { StudioMap } from './components/StudioMap';
import { AdminDashboard } from './components/AdminDashboard';
import { PortfolioArchivePage } from './components/PortfolioArchivePage';

const STORAGE_KEYS = {
  PORTFOLIO: 'caremedia_portfolio_v1',
  CATEGORIES: 'caremedia_categories_v1',
  SERVICES: 'caremedia_services_v1',
  BOOKINGS: 'caremedia_bookings_v1',
  TESTIMONIALS: 'caremedia_testimonials_v1',
  SETTINGS: 'caremedia_settings_v1',
  ADMIN_SESSION: 'caremedia_admin_unlocked_v1',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveStored<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

// Ensure at least 5 default verified testimonials are present for the Row of 5 layout
function hydrateTestimonialsWithFiveDefaults(stored: TestimonialData[]): TestimonialData[] {
  const existingIds = new Set(stored.map((t) => t.id));
  const missingDefaults = DEFAULT_TESTIMONIALS.filter((d) => !existingIds.has(d.id));
  if (missingDefaults.length > 0 && stored.length < 5) {
    return [...stored, ...missingDefaults];
  }
  return stored;
}

export default function App() {
  // Google Maps Demo Key Quota Banner State (Section 8 Case A)
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Mobile Menu Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Re-render when IndexedDB media vault finishes hydrating
  const [, setVaultTick] = useState(0);
  useEffect(() => {
    return subscribeMediaVault(() => setVaultTick((t) => t + 1));
  }, []);

  // Auth & Studio Admin Session State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [isStudioAdminUnlocked, setIsStudioAdminUnlocked] = useState<boolean>(() =>
    loadStored<boolean>(STORAGE_KEYS.ADMIN_SESSION, false)
  );
  const [viewMode, setViewMode] = useState<'public' | 'admin' | 'portfolio-archive'>('public');
  const [archiveCategory, setArchiveCategory] = useState<string>('All');

  // Synchronized Studio State (Hydrated from LocalStorage + Live Firestore)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemData[]>(() =>
    loadStored(STORAGE_KEYS.PORTFOLIO, DEFAULT_PORTFOLIO_ITEMS)
  );
  const [categories, setCategories] = useState<CategoryData[]>(() =>
    loadStored(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
  );
  const [services, setServices] = useState<ServiceItemData[]>(() =>
    loadStored(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES)
  );
  const [bookings, setBookings] = useState<BookingData[]>(() =>
    loadStored(STORAGE_KEYS.BOOKINGS, [])
  );
  const [testimonials, setTestimonials] = useState<TestimonialData[]>(() =>
    hydrateTestimonialsWithFiveDefaults(
      loadStored(STORAGE_KEYS.TESTIMONIALS, DEFAULT_TESTIMONIALS)
    )
  );
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData>(() =>
    loadStored(STORAGE_KEYS.SETTINGS, DEFAULT_SITE_SETTINGS)
  );

  // Portfolio & Video Interactive State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Testimonials Row of 5 Pagination & Submission Form State
  const [reviewPage, setReviewPage] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [revName, setRevName] = useState('');
  const [revRole, setRevRole] = useState('');
  const [revText, setRevText] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revPhotoUrl, setRevPhotoUrl] = useState('');
  const [revSubmitted, setRevSubmitted] = useState(false);
  const [revError, setRevError] = useState<string | null>(null);
  const [revSubmitting, setRevSubmitting] = useState(false);

  // Booking Form State
  const [bookName, setBookName] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookEventType, setBookEventType] = useState('Wedding Ceremony & Reception');
  const [bookEventDate, setBookEventDate] = useState('');
  const [bookLocation, setBookLocation] = useState('');
  const [bookService, setBookService] = useState('Wedding Photography & Videography');
  const [bookNotes, setBookNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<BookingData | null>(null);

  // State updaters that persist immediately
  const handleUpdatePortfolio = (items: PortfolioItemData[]) => {
    setPortfolioItems(items);
    saveStored(STORAGE_KEYS.PORTFOLIO, items);
  };

  const handleUpdateCategories = (cats: CategoryData[]) => {
    setCategories(cats);
    saveStored(STORAGE_KEYS.CATEGORIES, cats);
  };

  const handleUpdateServices = (srvs: ServiceItemData[]) => {
    setServices(srvs);
    saveStored(STORAGE_KEYS.SERVICES, srvs);
  };

  const handleUpdateBookings = (bks: BookingData[]) => {
    setBookings(bks);
    saveStored(STORAGE_KEYS.BOOKINGS, bks);
  };

  const handleUpdateTestimonials = (tests: TestimonialData[]) => {
    setTestimonials(tests);
    saveStored(STORAGE_KEYS.TESTIMONIALS, tests);
  };

  const handleUpdateSiteSettings = (settings: SiteSettingsData) => {
    setSiteSettings(settings);
    saveStored(STORAGE_KEYS.SETTINGS, settings);
  };

  const handleUnlockStudioAdmin = (email: string) => {
    setIsStudioAdminUnlocked(true);
    saveStored(STORAGE_KEYS.ADMIN_SESSION, true);
    if (email) {
      setViewMode('admin');
    }
  };

  const handleLockStudioAdmin = () => {
    setIsStudioAdminUnlocked(false);
    saveStored(STORAGE_KEYS.ADMIN_SESSION, false);
  };

  const openCategoryArchivePage = (categoryName: string) => {
    setArchiveCategory(categoryName);
    setViewMode('portfolio-archive');
  };

  // Listen for Google Maps Platform quota exceeded event
  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        setIsStudioAdminUnlocked(true);
        saveStored(STORAGE_KEYS.ADMIN_SESSION, true);
      }
    });
    return () => unsub();
  }, []);

  const isBootstrappedAdmin = Boolean(
    user && user.email === ADMIN_EMAIL && user.emailVerified
  );
  const isFirestoreAdmin = isBootstrappedAdmin || isAdminDoc;

  // Check /admins/{uid} document if user is signed in
  useEffect(() => {
    if (!authReady || !user) {
      setIsAdminDoc(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'admins', user.uid),
      (snap) => {
        setIsAdminDoc(snap.exists());
      },
      () => {
        setIsAdminDoc(false);
      }
    );
    return () => unsub();
  }, [authReady, user]);

  // Public Firestore Listeners (Preserves local vault/data:image uploads when syncing)
  useEffect(() => {
    const portQuery = query(
      collection(db, 'portfolioItems'),
      where('mediaType', 'in', ['photo', 'video'])
    );
    const unsubPort = onSnapshot(
      portQuery,
      (snap) => {
        if (!snap.empty) {
          const currentLocal = loadStored<PortfolioItemData[]>(STORAGE_KEYS.PORTFOLIO, []);
          const localMap = new Map(currentLocal.map((item) => [item.id, item]));
          const cloudItems: PortfolioItemData[] = snap.docs.map((d) => {
            const data = d.data() as Omit<PortfolioItemData, 'id'>;
            const localMatch = localMap.get(d.id);
            const keepLocalMedia =
              localMatch &&
              (localMatch.mediaUrl.startsWith('vault://') ||
                localMatch.mediaUrl.startsWith('data:'));
            const keepLocalThumb =
              localMatch &&
              (localMatch.thumbnailUrl.startsWith('vault://') ||
                localMatch.thumbnailUrl.startsWith('data:'));
            return {
              id: d.id,
              ...data,
              mediaUrl: keepLocalMedia ? localMatch!.mediaUrl : data.mediaUrl,
              thumbnailUrl: keepLocalThumb ? localMatch!.thumbnailUrl : data.thumbnailUrl,
            };
          });
          // Also keep any local-only items not yet in Firestore
          const cloudIds = new Set(cloudItems.map((c) => c.id));
          const localOnly = currentLocal.filter((l) => !cloudIds.has(l.id));
          handleUpdatePortfolio([...localOnly, ...cloudItems]);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'portfolioItems')
    );

    const catQuery = query(collection(db, 'categories'), where('slug', '>=', ''));
    const unsubCat = onSnapshot(
      catQuery,
      (snap) => {
        if (!snap.empty) {
          const items: CategoryData[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<CategoryData, 'id'>),
          }));
          handleUpdateCategories(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    const srvQuery = query(collection(db, 'services'), where('orderIndex', '>=', 0));
    const unsubSrv = onSnapshot(
      srvQuery,
      (snap) => {
        if (!snap.empty) {
          const currentLocal = loadStored<ServiceItemData[]>(STORAGE_KEYS.SERVICES, []);
          const localMap = new Map(currentLocal.map((s) => [s.id, s]));
          const items: ServiceItemData[] = snap.docs
            .map((d) => {
              const data = d.data() as Omit<ServiceItemData, 'id'>;
              const localMatch = localMap.get(d.id);
              const keepLocalImg =
                localMatch &&
                (localMatch.imageUrl.startsWith('vault://') ||
                  localMatch.imageUrl.startsWith('data:'));
              return {
                id: d.id,
                ...data,
                imageUrl: keepLocalImg ? localMatch!.imageUrl : data.imageUrl,
              };
            })
            .sort((a, b) => a.orderIndex - b.orderIndex);
          handleUpdateServices(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'services')
    );

    const unsubSettings = onSnapshot(
      doc(db, 'siteSettings', 'main'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<SiteSettingsData>;
          handleUpdateSiteSettings({
            heroTitle: data.heroTitle || DEFAULT_SITE_SETTINGS.heroTitle,
            slogan: data.slogan || DEFAULT_SITE_SETTINGS.slogan,
            heroSubtitle: data.heroSubtitle || DEFAULT_SITE_SETTINGS.heroSubtitle,
            aboutText: data.aboutText || DEFAULT_SITE_SETTINGS.aboutText,
            phone: data.phone || DEFAULT_SITE_SETTINGS.phone,
            whatsapp: data.whatsapp || DEFAULT_SITE_SETTINGS.whatsapp,
            location: data.location || DEFAULT_SITE_SETTINGS.location,
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'siteSettings/main')
    );

    return () => {
      unsubPort();
      unsubCat();
      unsubSrv();
      unsubSettings();
    };
  }, []);

  // Testimonials & Bookings Listeners
  useEffect(() => {
    const testQuery = isFirestoreAdmin
      ? collection(db, 'testimonials')
      : query(collection(db, 'testimonials'), where('approved', '==', true));

    const unsubTestimonials = onSnapshot(
      testQuery,
      (snap) => {
        if (!snap.empty) {
          const currentLocal = loadStored<TestimonialData[]>(STORAGE_KEYS.TESTIMONIALS, []);
          const localMap = new Map(currentLocal.map((t) => [t.id, t]));
          const items: TestimonialData[] = snap.docs.map((d) => {
            const data = d.data() as Omit<TestimonialData, 'id'>;
            const localMatch = localMap.get(d.id);
            const keepLocalPhoto =
              localMatch &&
              (localMatch.photoUrl.startsWith('vault://') ||
                localMatch.photoUrl.startsWith('data:'));
            return {
              id: d.id,
              ...data,
              photoUrl: keepLocalPhoto ? localMatch!.photoUrl : data.photoUrl,
            };
          });
          handleUpdateTestimonials(hydrateTestimonialsWithFiveDefaults(items));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'testimonials')
    );

    let unsubBookings: (() => void) | undefined;
    if (authReady && isFirestoreAdmin) {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'confirmed', 'declined', 'completed'])
      );
      unsubBookings = onSnapshot(
        bookingsQuery,
        (snap) => {
          if (!snap.empty) {
            const items: BookingData[] = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<BookingData, 'id'>),
            }));
            handleUpdateBookings(items);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
      );
    }

    return () => {
      unsubTestimonials();
      if (unsubBookings) unsubBookings();
    };
  }, [authReady, isFirestoreAdmin]);

  const approvedTestimonials = testimonials.filter((t) => t.approved);

  const videoProjects = portfolioItems.filter(
    (item) => item.mediaType === 'video' || item.category === 'Videography'
  );
  const currentVideo =
    videoProjects.find((v) => v.id === activeVideoId) ||
    videoProjects[0] ||
    DEFAULT_PORTFOLIO_ITEMS.find((i) => i.mediaType === 'video')!;

  // All items matching the currently selected category on the front page
  const categoryMatchedPortfolio = portfolioItems.filter((item) => {
    const matchesCat =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Videography'
        ? item.category === 'Videography' || item.mediaType === 'video'
        : item.category === selectedCategory;
    const matchesFeatured = onlyFeatured ? item.featured : true;
    return matchesCat && matchesFeatured;
  });

  // Front-page preview shows up to 6 works so uploading 100+ items never makes the homepage lengthy!
  const FRONT_PAGE_PREVIEW_LIMIT = 6;
  const frontPagePortfolioPreview = categoryMatchedPortfolio.slice(
    0,
    FRONT_PAGE_PREVIEW_LIMIT
  );

  const getCategoryItemCount = (catName: string) => {
    if (catName === 'All') return portfolioItems.length;
    if (catName === 'Videography') {
      return portfolioItems.filter(
        (i) => i.category === 'Videography' || i.mediaType === 'video'
      ).length;
    }
    return portfolioItems.filter((i) => i.category === catName).length;
  };

  const activeLightboxItem =
    lightboxIndex !== null && categoryMatchedPortfolio[lightboxIndex]
      ? categoryMatchedPortfolio[lightboxIndex]
      : null;

  const handleBookServiceShortcut = (serviceTitle: string, eventCategory?: string) => {
    setViewMode('public');
    setBookService(serviceTitle);
    if (eventCategory) {
      setBookEventType(eventCategory);
    }
    setTimeout(() => {
      const el = document.getElementById('booking');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 80);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (
      !bookName.trim() ||
      !bookPhone.trim() ||
      !bookEmail.trim() ||
      !bookEventType.trim() ||
      !bookEventDate.trim() ||
      !bookLocation.trim() ||
      !bookService.trim()
    ) {
      setBookingError('Please complete all required booking fields.');
      return;
    }

    setBookingSubmitting(true);
    const docId = makeValidDocId('booking');
    const path = `bookings/${docId}`;

    try {
      const cleanBooking: BookingData = {
        id: docId,
        fullName: sanitizeString(bookName, BLUEPRINT_LIMITS.BOOKING.NAME_MAX),
        phone: sanitizeString(bookPhone, BLUEPRINT_LIMITS.BOOKING.PHONE_MAX),
        email: sanitizeString(bookEmail, BLUEPRINT_LIMITS.BOOKING.EMAIL_MAX),
        eventType: sanitizeString(bookEventType, BLUEPRINT_LIMITS.BOOKING.EVENT_TYPE_MAX),
        eventDate: sanitizeString(bookEventDate, BLUEPRINT_LIMITS.BOOKING.EVENT_DATE_MAX),
        eventLocation: sanitizeString(bookLocation, BLUEPRINT_LIMITS.BOOKING.LOCATION_MAX),
        serviceRequired: sanitizeString(bookService, BLUEPRINT_LIMITS.BOOKING.SERVICE_MAX),
        additionalInfo: sanitizeString(bookNotes, BLUEPRINT_LIMITS.BOOKING.INFO_MAX),
        status: 'pending',
      };

      handleUpdateBookings([cleanBooking, ...bookings]);
      void studioApi.saveBooking(cleanBooking);

      try {
        await setDoc(doc(db, 'bookings', docId), {
          fullName: cleanBooking.fullName,
          phone: cleanBooking.phone,
          email: cleanBooking.email,
          eventType: cleanBooking.eventType,
          eventDate: cleanBooking.eventDate,
          eventLocation: cleanBooking.eventLocation,
          serviceRequired: cleanBooking.serviceRequired,
          additionalInfo: cleanBooking.additionalInfo,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Cloud sync fallback to built-in backend/local DB:', err);
      }

      setSubmittedBooking(cleanBooking);
      setBookName('');
      setBookPhone('');
      setBookEmail('');
      setBookEventDate('');
      setBookLocation('');
      setBookNotes('');
    } catch (error) {
      setBookingError(
        'Could not save your booking right now. Please try again or reach us via WhatsApp.'
      );
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevError(null);

    if (!revName.trim() || revText.trim().length < 5) {
      setRevError('Please provide your name and a review of at least 5 characters.');
      return;
    }

    setRevSubmitting(true);
    const docId = makeValidDocId('rev');
    const path = `testimonials/${docId}`;

    try {
      const newReview: TestimonialData = {
        id: docId,
        customerName: sanitizeString(revName, BLUEPRINT_LIMITS.TESTIMONIAL.NAME_MAX),
        roleOrEvent: sanitizeString(
          revRole || 'Verified CAREMEDIA Client',
          BLUEPRINT_LIMITS.TESTIMONIAL.ROLE_MAX
        ),
        review: sanitizeString(revText, BLUEPRINT_LIMITS.TESTIMONIAL.REVIEW_MAX),
        rating: Math.max(1, Math.min(5, Number(revRating) || 5)),
        photoUrl: sanitizeString(revPhotoUrl, BLUEPRINT_LIMITS.TESTIMONIAL.PHOTO_URL_MAX),
        approved: false,
      };

      handleUpdateTestimonials([newReview, ...testimonials]);
      void studioApi.saveTestimonial(newReview);

      try {
        await setDoc(doc(db, 'testimonials', docId), {
          customerName: newReview.customerName,
          roleOrEvent: newReview.roleOrEvent,
          review: newReview.review,
          rating: newReview.rating,
          photoUrl: newReview.photoUrl,
          approved: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Cloud sync fallback to built-in backend/local DB:', err);
      }

      setRevSubmitted(true);
      setRevName('');
      setRevRole('');
      setRevText('');
      setRevPhotoUrl('');
    } catch (error) {
      setRevError('Unable to submit review at this moment.');
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setRevSubmitting(false);
    }
  };

  // VIEW MODE 1: STUDIO ADMIN DASHBOARD
  if (viewMode === 'admin') {
    return (
      <>
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        <AdminDashboard
          user={user}
          isFirestoreAdmin={isFirestoreAdmin}
          isStudioAdminUnlocked={isStudioAdminUnlocked}
          onUnlockStudioAdmin={handleUnlockStudioAdmin}
          onLockStudioAdmin={handleLockStudioAdmin}
          portfolioItems={portfolioItems}
          categories={categories}
          services={services}
          bookings={bookings}
          testimonials={testimonials}
          siteSettings={siteSettings}
          onUpdatePortfolio={handleUpdatePortfolio}
          onUpdateCategories={handleUpdateCategories}
          onUpdateServices={handleUpdateServices}
          onUpdateBookings={handleUpdateBookings}
          onUpdateTestimonials={handleUpdateTestimonials}
          onUpdateSiteSettings={handleUpdateSiteSettings}
          onExitAdmin={() => setViewMode('public')}
        />
      </>
    );
  }

  // VIEW MODE 2: DEDICATED FULL PORTFOLIO & CATEGORY ARCHIVE PAGE (Supports 100+ items per category)
  if (viewMode === 'portfolio-archive') {
    return (
      <>
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        <PortfolioArchivePage
          portfolioItems={portfolioItems}
          categories={categories}
          initialCategory={archiveCategory}
          siteSettings={siteSettings}
          onBackToHome={() => setViewMode('public')}
          onOpenAdmin={() => setViewMode('admin')}
          onBookCategory={(cat, workTitle) =>
            handleBookServiceShortcut(
              cat === 'Videography'
                ? 'Documentary and Event Filming'
                : 'Wedding Photography & Videography',
              workTitle ? `${cat} (${workTitle})` : cat
            )
          }
        />
      </>
    );
  }

  // Row of 5 Verified Customer Reviews computation
  const totalReviewPages = Math.max(1, Math.ceil(approvedTestimonials.length / 5));
  const safeReviewPage = reviewPage % totalReviewPages;
  const rowOfFiveReviews = approvedTestimonials.slice(
    safeReviewPage * 5,
    safeReviewPage * 5 + 5
  );

  const activeVideoEmbed = getEmbedVideoUrl(currentVideo.mediaUrl);
  const resolvedCurrentVideoPoster = resolveMediaUrl(
    currentVideo.thumbnailUrl || currentVideo.mediaUrl
  );

  return (
    <div id="top" className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Mandatory Google Maps Demo Key Quota Banner (Section 8 Case A) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* TOP BAR CONTRACT: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single text element Brand Wordmark */}
          <a
            href="#top"
            className="font-serif-display text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            {siteSettings.heroTitle}
          </a>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a
              href="#services"
              className="hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
            >
              Services
            </a>
            <a
              href="#portfolio"
              className="hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
            >
              Portfolio
            </a>
            <a
              href="#videos"
              className="hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
            >
              Films
            </a>
            <a
              href="#testimonials"
              className="hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
            >
              Reviews
            </a>
            <a
              href="#contact"
              className="hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
            >
              Contact
            </a>
          </nav>

          {/* Zone 3: Primary Action & Mobile Drawer Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setViewMode('admin')}
              className="p-2 rounded-lg border border-[#D4AF70]/40 bg-[#151515] text-[#D4AF70] hover:bg-[#D4AF70] hover:text-[#080808] transition-colors cursor-pointer"
              aria-label="Studio Admin Login & Dashboard"
              title="Studio Admin Dashboard"
            >
              <Settings className="w-4 h-4" />
            </button>
            <a
              href="#booking"
              className="px-4 sm:px-5 py-2 text-xs font-semibold bg-[#D4AF70] text-[#080808] rounded-lg hover:bg-[#e2c186] transition-colors whitespace-nowrap shrink-0"
            >
              Book a Session
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-white/15 text-zinc-200 hover:border-[#D4AF70] hover:text-[#D4AF70] cursor-pointer"
              aria-label="Toggle mobile navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#111111] px-6 py-4 space-y-3">
            <div className="flex flex-col space-y-2.5 text-sm font-medium text-zinc-200">
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#D4AF70]"
              >
                About Us
              </a>
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#D4AF70]"
              >
                Our Services
              </a>
              <a
                href="#portfolio"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#D4AF70]"
              >
                Portfolio Gallery
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openCategoryArchivePage('All');
                }}
                className="text-left text-[#D4AF70] font-semibold"
              >
                Full Portfolio Archive ({portfolioItems.length} Works)
              </button>
              <a
                href="#videos"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#D4AF70]"
              >
                Video Showcase
              </a>
              <a
                href="#testimonials"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#D4AF70]"
              >
                Customer Reviews
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#D4AF70]"
              >
                Contact &amp; Map
              </a>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setViewMode('admin');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#151515] border border-[#D4AF70]/50 text-xs font-semibold text-[#D4AF70] cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Studio Admin Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* SECTION 1: COMPACT LUXURY HERO SPLIT */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Editorial Hierarchy */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <p className="text-xs font-medium tracking-wide text-[#D4AF70]">
                  Professional Photography &amp; Videography Services · {siteSettings.location}
                </p>

                <div className="space-y-2">
                  <span className="block font-mono-tabular text-xs text-zinc-400 tracking-widest">
                    {siteSettings.heroTitle} PRODUCTION HOUSE
                  </span>
                  <h1
                    className="font-serif-display font-bold text-white tracking-tight leading-[1.08]"
                    style={{
                      fontSize: 'clamp(2.2rem, 4vw, 3.6rem)',
                      textWrap: 'balance',
                    }}
                  >
                    {siteSettings.slogan}
                  </h1>
                </div>

                <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-xl">
                  {siteSettings.heroSubtitle} From luxury weddings and royal traditional ceremonies to executive brand productions, we craft timeless visual heirlooms.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="#booking"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#D4AF70] text-[#080808] text-xs sm:text-sm font-semibold hover:bg-[#e2c186] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book a Session</span>
                  </a>

                  <a
                    href="#portfolio"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 bg-white/5 text-white text-xs sm:text-sm font-medium hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Explore Our Portfolio</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Subtle Scroll-Down Cue */}
              <div className="pt-2 hidden lg:flex items-center gap-3">
                <a
                  href="#about"
                  className="inline-flex items-center gap-2.5 text-xs text-zinc-400 hover:text-[#D4AF70] transition-colors group"
                >
                  <span className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center group-hover:border-[#D4AF70]">
                    <ArrowDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                  </span>
                  <span>Scroll to discover CAREMEDIA</span>
                </a>
              </div>
            </div>

            {/* Right Column: Properly Sized Uncropped Hero Showcase Container */}
            <div className="lg:col-span-6 relative h-[300px] sm:h-[350px] lg:h-[400px] rounded-2xl overflow-hidden border border-white/15 bg-[#111111] group">
              <ResilientImage
                src={GENERATED_ASSETS.heroStudio}
                alt="CAREMEDIA professional cinematographer and photographer capturing a luxury event"
                fit="studio-full"
                className="w-full h-full"
              />
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

              {/* Interactive Showreel Trigger Overlay */}
              <div className="absolute bottom-0 inset-x-0 z-20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-[#D4AF70] font-medium">
                    Featured Showreel · 4K Cinema Production
                  </p>
                  <h2 className="font-serif-display text-xl sm:text-2xl font-semibold text-white mt-0.5">
                    The Art of Visual Storytelling
                  </h2>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    ARRI &amp; Full-Frame Stills · Weddings, Events &amp; Commercials
                  </p>
                </div>

                <a
                  href="#videos"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch Showreel</span>
                </a>
              </div>
            </div>
          </div>

          {/* Compact KPI & Studio Admin Portal Strip Below Hero Split */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            <div>
              <p className="font-mono-tabular text-xl md:text-2xl font-bold text-white">
                850+
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Weddings, Milestone Events &amp; Brand Productions
              </p>
            </div>

            <div>
              <p className="font-mono-tabular text-xl md:text-2xl font-bold text-white">
                4K DCI
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cinema Multi-Camera &amp; Drone Aerial Coverage
              </p>
            </div>

            <div>
              <p className="font-mono-tabular text-xl md:text-2xl font-bold text-white">
                100%
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Colour-Graded Master Galleries &amp; Redundancy
              </p>
            </div>

            {/* Settings Icon Indicator for Admin Login & Studio Admin Dashboard */}
            <div className="col-span-2 lg:col-span-1 flex lg:justify-end">
              <button
                onClick={() => setViewMode('admin')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D4AF70]/40 bg-[#151515] hover:bg-[#D4AF70] text-xs font-semibold text-white hover:text-[#080808] transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                title="Admin Login & Studio Admin Dashboard"
              >
                <Settings className="w-4 h-4 text-[#D4AF70] group-hover:text-[#080808] transition-transform duration-300 group-hover:rotate-90" />
                <span>
                  {isStudioAdminUnlocked
                    ? 'Open Studio Admin Dashboard'
                    : 'Admin Login · Studio Dashboard'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SUBTLE MARQUEE SECTION DIVIDER */}
      <div className="border-b border-white/10 bg-[#111111] py-2.5 overflow-hidden">
        <div className="animate-marquee flex items-center gap-8 text-xs font-medium text-zinc-400">
          {[1, 2].map((loop) => (
            <div key={loop} className="flex items-center gap-8 shrink-0">
              <span>Luxury Weddings</span>
              <span className="text-[#D4AF70]">·</span>
              <span>Traditional Marriage Ceremonies</span>
              <span className="text-[#D4AF70]">·</span>
              <span>Corporate &amp; Brand Productions</span>
              <span className="text-[#D4AF70]">·</span>
              <span>Editorial Studio Portraits</span>
              <span className="text-[#D4AF70]">·</span>
              <span>4K Documentary Filmmaking</span>
              <span className="text-[#D4AF70]">·</span>
              <span>Ota, Ogun State, Nigeria</span>
              <span className="text-[#D4AF70]">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: ABOUT CAREMEDIA (Compact & Properly Proportioned) */}
      <section id="about" className="py-12 lg:py-16 bg-[#080808] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-5 relative h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border border-white/10 bg-[#151515]">
              <ResilientImage
                src={GENERATED_ASSETS.aboutPhotographer}
                alt="CAREMEDIA lead director and photographer adjusting a professional cinema camera lens"
                fit="studio-full"
                className="w-full h-full"
              />
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <p className="text-xs text-[#D4AF70] font-medium">
                  Craftsmanship · Direction · Emotion
                </p>
                <p className="font-serif-display text-lg text-white mt-0.5">
                  CAREMEDIA Production Team in Ota, Ogun State
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
              <p className="text-xs font-medium text-[#D4AF70]">
                About CAREMEDIA · Our Story &amp; Vision
              </p>

              <h2
                className="font-serif-display text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Every Moment Has a Story Worth Preserving in Cinema &amp; Stillness.
              </h2>

              <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
                {siteSettings.aboutText}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/10">
                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[#D4AF70]">
                    01. Editorial Eye
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Magazine-grade lighting, intentional framing, and natural skin-tone color science.
                  </p>
                </div>

                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[#D4AF70]">
                    02. Cinema Audio &amp; Motion
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Stabilized 4K camera movement paired with crystal-clear wireless vow and speech recording.
                  </p>
                </div>

                <div>
                  <h3 className="font-serif-display text-lg font-semibold text-[#D4AF70]">
                    03. Trusted Reliability
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Punctual on-site teams across Ota, Ogun State, Lagos, and nationwide destinations.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <a
                  href="#booking"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Schedule a Consultation</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>

                <a
                  href={formatWhatsAppUrl(
                    siteSettings.phone,
                    'Hello CAREMEDIA, I would like to enquire about your photography and videography services.'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-xs font-medium text-white hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4AF70]" />
                  <span>Chat with Us on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: OUR SERVICES (Compact 5-Column / Responsive Grid with Full Uncropped Images) */}
      <section id="services" className="py-12 lg:py-16 bg-[#151515] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-medium text-[#D4AF70]">
                Bespoke Coverage · Tailored Commissions
              </p>
              <h2
                className="font-serif-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-1"
                style={{ textWrap: 'balance' }}
              >
                Our Photography &amp; Videography Services
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
              Select any service package below to pre-fill your booking consultation or connect directly with our production team.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {services.map((service, index) => (
              <article
                key={service.id}
                className="rounded-xl border border-white/10 bg-[#080808] overflow-hidden flex flex-col justify-between group hover:border-[#D4AF70]/50 transition-colors"
              >
                <div>
                  <div className="relative h-40 overflow-hidden bg-[#0B0B0B]">
                    <ResilientImage
                      src={service.imageUrl}
                      alt={service.title}
                      fit="studio-full"
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#080808] via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-2 left-3 z-20 font-mono-tabular text-[11px] font-semibold text-[#D4AF70]">
                      {String(index + 1).padStart(2, '0')}.
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-serif-display text-lg font-semibold text-white leading-snug line-clamp-2">
                      {service.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-3">
                      {service.description}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-2.5 pt-2.5 border-t border-white/10 line-clamp-1">
                      {service.deliverables}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleBookServiceShortcut(service.title, service.title)}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Book Now
                  </button>
                  <a
                    href={formatWhatsAppUrl(
                      siteSettings.phone,
                      `Hello CAREMEDIA, I want to book "${service.title}". Please share availability and pricing.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-2.5 rounded-lg border border-white/15 text-[11px] font-medium text-zinc-300 hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
                  >
                    WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: SELECTED PHOTOGRAPHY & CINEMA PORTFOLIO (Curated Front-Page Preview + Direct Link to 100+ Category Archive Page) */}
      <section id="portfolio" className="py-12 lg:py-16 bg-[#080808] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-[#D4AF70]">
                Curated Front-Page Highlights · Click Any Category to Preview or Open Full 100+ Archive
              </p>
              <h2
                className="font-serif-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-1"
                style={{ textWrap: 'balance' }}
              >
                Selected Photography &amp; Cinema Portfolio
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setOnlyFeatured(!onlyFeatured)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  onlyFeatured
                    ? 'border-[#D4AF70] bg-[#D4AF70]/15 text-[#D4AF70]'
                    : 'border-white/15 text-zinc-300 hover:text-white'
                }`}
              >
                {onlyFeatured ? 'Showing Featured Only' : 'Filter: Featured Highlights'}
              </button>

              <button
                onClick={() => openCategoryArchivePage(selectedCategory)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>
                  Open Full {selectedCategory === 'All' ? 'Portfolio' : selectedCategory} Gallery (
                  {getCategoryItemCount(selectedCategory)})
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Category Filter Bar (Weddings to Videography) */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#151515] border border-white/10 rounded-xl overflow-x-auto mb-6">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'All'
                  ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <span>All Works</span>
              <span
                className={`font-mono-tabular text-[11px] ${
                  selectedCategory === 'All' ? 'text-[#080808]/80' : 'text-zinc-500'
                }`}
              >
                ({getCategoryItemCount('All')})
              </span>
            </button>
            {categories.map((cat) => {
              const count = getCategoryItemCount(cat.name);
              const active = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                      : 'text-zinc-300 hover:text-white'
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

          {/* Compact 6-Item Front-Page Preview Grid (Client Images 100% Fully Seen!) */}
          {frontPagePortfolioPreview.length === 0 ? (
            <div className="p-10 rounded-2xl border border-white/10 bg-[#151515] text-center">
              <p className="text-sm text-zinc-300">
                No portfolio works found in this filter view.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setOnlyFeatured(false);
                }}
                className="mt-3 px-4 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold cursor-pointer"
              >
                Reset Portfolio Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {frontPagePortfolioPreview.map((item, idx) => (
                <article
                  key={item.id}
                  onClick={() => setLightboxIndex(idx)}
                  className="group rounded-xl overflow-hidden border border-white/10 bg-[#151515] hover:border-[#D4AF70]/60 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Full Uncropped Client Image Container */}
                  <div className="relative h-56 w-full bg-[#0A0A0A] overflow-hidden">
                    <ResilientImage
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.title}
                      fit="studio-full"
                      className="w-full h-full"
                    />

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-sm border border-white/10 text-[11px] font-medium text-[#D4AF70]">
                      {item.category}
                    </div>

                    {/* Video Play Affordance */}
                    {item.mediaType === 'video' && (
                      <div className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-[#D4AF70] text-[#080808] flex items-center justify-center shadow-md">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    )}
                  </div>

                  {/* Clean Metadata & Story */}
                  <div className="p-4 bg-[#121212] flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                        {item.clientName ? (
                          <span className="text-zinc-300 font-medium">{item.clientName}</span>
                        ) : (
                          <span>CAREMEDIA Archive</span>
                        )}
                        {item.exifInfo && (
                          <span className="font-mono-tabular text-zinc-500">
                            {item.exifInfo}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif-display text-xl font-semibold text-white mt-1 line-clamp-1 group-hover:text-[#D4AF70] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Dedicated Category Archive Portal Banner (Directs Clients to See All 100+ Admin Uploads per Category) */}
          <div className="mt-6 p-4 sm:p-5 rounded-2xl border border-[#D4AF70]/35 bg-[#151515] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#D4AF70]">
                Showing {frontPagePortfolioPreview.length} of{' '}
                {categoryMatchedPortfolio.length}{' '}
                {selectedCategory === 'All' ? 'Total' : selectedCategory} Works on Front Page
              </p>
              <p className="text-xs text-zinc-300 mt-0.5">
                Click any category below or open the dedicated archive page to view all photographs and videos uploaded by the admin without scrolling a lengthy homepage.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => openCategoryArchivePage(selectedCategory)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors cursor-pointer"
              >
                <span>
                  See More {selectedCategory === 'All' ? 'Portfolio' : selectedCategory} Works (
                  {categoryMatchedPortfolio.length})
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: DEDICATED CINEMATIC VIDEO SHOWCASE & FEATURED FILM REELS (Responsive & Admin-Controlled) */}
      <section id="videos" className="py-12 lg:py-16 bg-[#151515] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-medium text-[#D4AF70]">
                CAREMEDIA Motion Pictures · Direct Playback &amp; 4K Showreels
              </p>
              <h2
                className="font-serif-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-1"
                style={{ textWrap: 'balance' }}
              >
                Cinematic Video Showcase
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => openCategoryArchivePage('Videography')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 hover:border-[#D4AF70] text-xs font-medium text-zinc-200 hover:text-[#D4AF70] transition-colors cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-[#D4AF70]" />
                <span>View All Videos ({videoProjects.length})</span>
              </button>
              <button
                onClick={() => setViewMode('admin')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#080808] border border-[#D4AF70]/40 text-xs font-semibold text-[#D4AF70] hover:bg-[#D4AF70] hover:text-[#080808] transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage Film Reels</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Active Video Player Stage */}
            <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-white/15 bg-[#080808] flex flex-col justify-between">
              <div className="w-full aspect-video bg-black relative">
                {activeVideoEmbed.type === 'iframe' ? (
                  <iframe
                    src={activeVideoEmbed.src}
                    title={currentVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={activeVideoEmbed.src}
                    src={activeVideoEmbed.src}
                    poster={resolvedCurrentVideoPoster}
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  >
                    Your browser does not support HTML5 video playback.
                  </video>
                )}
              </div>

              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span className="text-[#D4AF70] font-medium">{currentVideo.category}</span>
                    {currentVideo.exifInfo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">{currentVideo.exifInfo}</span>
                      </>
                    )}
                    {currentVideo.clientName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{currentVideo.clientName}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-serif-display text-xl sm:text-2xl font-semibold text-white mt-1">
                    {currentVideo.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                    {currentVideo.description}
                  </p>
                </div>

                <button
                  onClick={() =>
                    handleBookServiceShortcut(
                      'Documentary and Event Filming',
                      currentVideo.title
                    )
                  }
                  className="px-4 py-2.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Commission Film
                </button>
              </div>
            </div>

            {/* Responsive Featured Film Reels Playlist */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-display text-xl font-semibold text-white">
                    Featured Film Reels ({videoProjects.length})
                  </h3>
                  <span className="text-[11px] text-[#D4AF70] font-medium">
                    Click to Play
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {videoProjects.map((vid, idx) => {
                    const isSelected = vid.id === currentVideo.id;
                    return (
                      <button
                        key={vid.id}
                        onClick={() => setActiveVideoId(vid.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-colors flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-[#D4AF70] bg-[#080808]'
                            : 'border-white/10 bg-[#080808]/60 hover:border-white/25'
                        }`}
                      >
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-[#111]">
                          <ResilientImage
                            src={vid.thumbnailUrl || vid.mediaUrl}
                            alt={vid.title}
                            fit="studio-full"
                            className="w-full h-full"
                          />
                          <div className="absolute inset-0 z-20 bg-black/35 flex items-center justify-center">
                            <Play className="w-4 h-4 text-[#D4AF70] fill-current" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] text-[#D4AF70] font-medium truncate">
                              {isSelected ? '● NOW PLAYING' : `Reel #${idx + 1} · ${vid.category}`}
                            </p>
                          </div>
                          <p className="font-serif-display text-base font-semibold text-white truncate">
                            {vid.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 font-mono-tabular truncate">
                            {vid.exifInfo || '4K Master Reel'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/10 bg-[#080808] text-xs text-zinc-400 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-medium">Full-Length Event &amp; Brand Films</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    YouTube, Vimeo &amp; 4K Direct Uploads supported.
                  </p>
                </div>
                <button
                  onClick={() => openCategoryArchivePage('Videography')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#D4AF70] text-white hover:text-[#080808] text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  All Videos
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: VERIFIED CUSTOMER REVIEWS IN A COMPACT ROW OF 5 (Responsive & Admin-Controlled) */}
      <section id="testimonials" className="py-12 lg:py-16 bg-[#080808] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-medium text-[#D4AF70]">
                Client Stories · Verified Customer Reviews ({approvedTestimonials.length})
              </p>
              <h2
                className="font-serif-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-1"
                style={{ textWrap: 'balance' }}
              >
                Verified Customer Reviews
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {totalReviewPages > 1 && (
                <div className="flex items-center gap-1.5 mr-2">
                  <button
                    onClick={() =>
                      setReviewPage((prev) =>
                        prev === 0 ? totalReviewPages - 1 : prev - 1
                      )
                    }
                    className="p-2 rounded-lg border border-white/15 text-white hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors cursor-pointer"
                    aria-label="Previous 5 reviews"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono-tabular text-xs text-zinc-400 px-1.5">
                    Set {safeReviewPage + 1} / {totalReviewPages}
                  </span>
                  <button
                    onClick={() =>
                      setReviewPage((prev) => (prev + 1) % totalReviewPages)
                    }
                    className="p-2 rounded-lg border border-white/15 text-white hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors cursor-pointer"
                    aria-label="Next 5 reviews"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 rounded-lg border border-[#D4AF70] text-[#D4AF70] hover:bg-[#D4AF70] hover:text-[#080808] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showReviewForm ? 'Close Review Form' : 'Submit a Client Review'}
              </button>

              <button
                onClick={() => setViewMode('admin')}
                className="p-2 rounded-lg border border-white/15 text-zinc-400 hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors cursor-pointer"
                title="Manage Reviews in Studio Admin"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sleek Professional Row of 5 Verified Customer Reviews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {rowOfFiveReviews.map((reviewItem) => (
              <article
                key={reviewItem.id}
                className="rounded-xl border border-white/10 bg-[#151515] p-4 flex flex-col justify-between hover:border-[#D4AF70]/50 transition-colors"
              >
                <div>
                  {/* Client Portrait & Verified Rating Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#080808] border border-white/15">
                      <ResilientImage
                        src={reviewItem.photoUrl || GENERATED_ASSETS.weddingLuxury}
                        alt={reviewItem.customerName}
                        fit="studio-full"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-xs sm:text-sm truncate">
                        {reviewItem.customerName}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {reviewItem.roleOrEvent}
                      </p>
                      <div className="flex items-center gap-0.5 text-[#D4AF70] mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < reviewItem.rating ? 'fill-[#D4AF70]' : 'text-zinc-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Concise Quote */}
                  <blockquote className="text-xs text-zinc-300 italic leading-relaxed mt-3 line-clamp-4">
                    &ldquo;{reviewItem.review}&rdquo;
                  </blockquote>
                </div>

                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="text-[#D4AF70] font-medium">● Verified Client</span>
                  <span className="font-mono-tabular">{reviewItem.rating}.0 / 5.0</span>
                </div>
              </article>
            ))}
          </div>

          {/* Customer Review Submission Drawer */}
          {showReviewForm && (
            <div className="mt-6 p-6 rounded-2xl border border-[#D4AF70]/40 bg-[#151515]">
              {revSubmitted ? (
                <div className="text-center py-4 space-y-2.5">
                  <CheckCircle2 className="w-8 h-8 text-[#D4AF70] mx-auto" />
                  <h3 className="font-serif-display text-xl font-semibold text-white">
                    Thank You for Sharing Your Experience
                  </h3>
                  <p className="text-xs text-zinc-300 max-w-md mx-auto">
                    Your review has been saved to our database and submitted for administrator approval before appearing publicly.
                  </p>
                  <button
                    onClick={() => {
                      setRevSubmitted(false);
                      setShowReviewForm(false);
                    }}
                    className="px-5 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4 max-w-3xl mx-auto">
                  <h3 className="font-serif-display text-xl font-semibold text-white">
                    Submit Your CAREMEDIA Review
                  </h3>

                  {revError && (
                    <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200">
                      {revError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={revName}
                        onChange={(e) => setRevName(e.target.value)}
                        placeholder="e.g. Mr. & Mrs. Adeyemi"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Event Type or Role *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={revRole}
                        onChange={(e) => setRevRole(e.target.value)}
                        placeholder="e.g. Wedding Couple · Ota"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Star Rating *</label>
                      <select
                        value={revRating}
                        onChange={(e) => setRevRating(Number(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                      >
                        <option value={5}>5 Stars – Exceptional</option>
                        <option value={4}>4 Stars – Very Good</option>
                        <option value={3}>3 Stars – Good</option>
                        <option value={2}>2 Stars – Fair</option>
                        <option value={1}>1 Star – Needs Improvement</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Optional Photograph URL
                    </label>
                    <input
                      type="text"
                      maxLength={2000}
                      value={revPhotoUrl}
                      onChange={(e) => setRevPhotoUrl(e.target.value)}
                      placeholder="https://... (optional event or portrait photo link)"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Your Review *</label>
                    <textarea
                      rows={2}
                      required
                      maxLength={1500}
                      value={revText}
                      onChange={(e) => setRevText(e.target.value)}
                      placeholder="Tell us about your photography or videography session with CAREMEDIA..."
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={revSubmitting}
                      className="px-6 py-2.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer disabled:opacity-50"
                    >
                      {revSubmitting ? 'Submitting...' : 'Submit Review for Approval'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 7: BOOKING & ENQUIRY SYSTEM + CONTACT & GOOGLE MAPS */}
      <section id="booking" className="py-12 lg:py-16 bg-[#151515] border-b border-white/10">
        <div id="contact" className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Booking & Enquiry Form */}
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#080808] p-6 md:p-8">
              <p className="text-xs font-medium text-[#D4AF70]">
                Reserve Your Date · Instant Database &amp; WhatsApp Confirmation
              </p>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-white mt-1">
                Book a Photography or Videography Session
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Complete the form below to secure your event date. Your enquiry is logged directly to our studio dashboard with an immediate option to continue on WhatsApp.
              </p>

              {submittedBooking ? (
                <div className="mt-6 p-5 rounded-xl border border-[#D4AF70]/50 bg-[#151515] space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#D4AF70] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-serif-display text-xl font-semibold text-white">
                        Booking Enquiry Received
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                        Thank you, <strong className="text-white">{submittedBooking.fullName}</strong>. Your booking request for{' '}
                        <strong className="text-[#D4AF70]">{submittedBooking.serviceRequired}</strong> on{' '}
                        <span className="font-mono-tabular text-white">{submittedBooking.eventDate}</span> at{' '}
                        <span className="text-white">{submittedBooking.eventLocation}</span> has been saved in the CAREMEDIA database and sent to our Admin Dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href={formatWhatsAppUrl(
                        siteSettings.phone,
                        `Hello CAREMEDIA! I just submitted a booking enquiry on your website.\n\nName: ${submittedBooking.fullName}\nPhone: ${submittedBooking.phone}\nService: ${submittedBooking.serviceRequired}\nEvent Type: ${submittedBooking.eventType}\nDate: ${submittedBooking.eventDate}\nLocation: ${submittedBooking.eventLocation}\nNotes: ${submittedBooking.additionalInfo || 'N/A'}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Continue Enquiry on WhatsApp ({siteSettings.whatsapp})</span>
                    </a>

                    <button
                      onClick={() => setSubmittedBooking(null)}
                      className="px-4 py-2.5 rounded-lg border border-white/15 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                    >
                      Submit Another Booking
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="mt-6 space-y-4">
                  {bookingError && (
                    <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200">
                      {bookingError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={bookName}
                        onChange={(e) => setBookName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={40}
                        value={bookPhone}
                        onChange={(e) => setBookPhone(e.target.value)}
                        placeholder="e.g. 08063751294"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={150}
                        value={bookEmail}
                        onChange={(e) => setBookEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Type of Event *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={bookEventType}
                        onChange={(e) => setBookEventType(e.target.value)}
                        placeholder="e.g. White Wedding, Traditional Marriage, Corporate"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Event Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={bookEventDate}
                        onChange={(e) => setBookEventDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Event Location (Venue &amp; City) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={250}
                        value={bookLocation}
                        onChange={(e) => setBookLocation(e.target.value)}
                        placeholder="e.g. Ota, Ogun State / Ikeja, Lagos"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Type of Service Required *
                    </label>
                    <select
                      value={bookService}
                      onChange={(e) => setBookService(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.title}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Additional Information &amp; Special Requests
                    </label>
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={bookNotes}
                      onChange={(e) => setBookNotes(e.target.value)}
                      placeholder="Tell us about your guest count, timeline, drone requests, or studio preferences..."
                      className="w-full px-3.5 py-2 rounded-lg bg-[#151515] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#D4AF70] text-[#080808] text-xs sm:text-sm font-semibold hover:bg-[#e2c186] transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>
                        {bookingSubmitting ? 'Saving Booking...' : 'Submit Booking Request'}
                      </span>
                    </button>

                    <a
                      href={formatWhatsAppUrl(
                        siteSettings.phone,
                        `Hello CAREMEDIA, I would like to book ${bookService}${
                          bookEventDate ? ` for ${bookEventDate}` : ''
                        }${bookLocation ? ` in ${bookLocation}` : ''}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/20 text-xs sm:text-sm font-medium text-white hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 text-[#D4AF70]" />
                      <span>WhatsApp Booking ({siteSettings.phone})</span>
                    </a>
                  </div>
                </form>
              )}
            </div>

            {/* Right Column: Business Contact Info + Google Maps Location Section */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#080808] p-6 space-y-4">
                <div>
                  <p className="text-xs font-medium text-[#D4AF70]">
                    Direct Studio Contact
                  </p>
                  <h3 className="font-serif-display text-2xl font-bold text-white mt-1">
                    Connect with {siteSettings.heroTitle}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Available for studio sessions in Ota, Ogun State, and on-location commissions across Nigeria.
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#D4AF70] shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-zinc-400">Phone &amp; WhatsApp</p>
                      <a
                        href={`tel:${siteSettings.whatsapp}`}
                        className="font-mono-tabular text-sm font-semibold text-white hover:text-[#D4AF70] transition-colors"
                      >
                        {siteSettings.phone} ({siteSettings.whatsapp})
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#D4AF70] shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-zinc-400">Studio Headquarters</p>
                      <p className="text-sm font-semibold text-white">
                        {siteSettings.location}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <a
                    href={formatWhatsAppUrl(
                      siteSettings.phone,
                      'Hello CAREMEDIA! I am visiting your website and would like to speak with a producer.'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Contact Us Through WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Google Maps Location Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>Interactive Studio Map · {siteSettings.location}</span>
                  <span className="text-[#D4AF70]">Google Maps Platform</span>
                </div>
                <StudioMap locationQuery={siteSettings.location} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: PREMIUM FOOTER */}
      <footer className="bg-[#080808] text-white pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-white/10">
            {/* Brand Column */}
            <div className="lg:col-span-5 space-y-3">
              <a
                href="#top"
                className="font-serif-display text-2xl font-bold tracking-tight text-white inline-block"
              >
                {siteSettings.heroTitle}
              </a>
              <p className="font-serif-display text-lg italic text-[#D4AF70]">
                “{siteSettings.slogan}”
              </p>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Professional Photography, Cinematic Videography, and Commercial Media Production in {siteSettings.location}.
              </p>

              {/* Social Media Links */}
              <div className="flex items-center gap-2.5 pt-1">
                {[
                  {
                    name: 'Instagram',
                    href: 'https://instagram.com',
                    svg: (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'Facebook',
                    href: 'https://facebook.com',
                    svg: (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'TikTok',
                    href: 'https://tiktok.com',
                    svg: (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'YouTube',
                    href: 'https://youtube.com',
                    svg: (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    ),
                  },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-zinc-300 hover:border-[#D4AF70] hover:text-[#D4AF70] transition-colors"
                  >
                    {social.svg}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-3 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D4AF70]">
                Quick Links
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                <li>
                  <a href="#top" className="hover:text-[#D4AF70] transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-[#D4AF70] transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#D4AF70] transition-colors">
                    Services
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => openCategoryArchivePage('All')}
                    className="hover:text-[#D4AF70] transition-colors cursor-pointer"
                  >
                    Full Portfolio Archive ({portfolioItems.length})
                  </button>
                </li>
                <li>
                  <a href="#videos" className="hover:text-[#D4AF70] transition-colors">
                    Videos
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-[#D4AF70] transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Information & Studio Admin Access */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D4AF70]">
                Contact Information
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-zinc-300">
                <p className="font-mono-tabular">
                  Phone / WhatsApp:{' '}
                  <a
                    href={formatWhatsAppUrl(
                      siteSettings.phone,
                      'Hello CAREMEDIA, I am reaching out from your website.'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-[#D4AF70] underline"
                  >
                    {siteSettings.phone}
                  </a>
                </p>
                <p>Location: {siteSettings.location}</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setViewMode('admin')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D4AF70]/40 bg-[#151515] text-xs font-semibold text-white hover:bg-[#D4AF70] hover:text-[#080808] transition-colors cursor-pointer group"
                >
                  <Settings className="w-4 h-4 text-[#D4AF70] group-hover:text-[#080808]" />
                  <span>Studio Admin Dashboard</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>
              © {new Date().getFullYear()} {siteSettings.heroTitle}. All rights reserved.
            </p>
            <p>
              {siteSettings.location} · {siteSettings.phone}
            </p>
          </div>
        </div>
      </footer>

      {/* FLOATING ADMIN SETTINGS ICON BUTTON (Bottom-Left) */}
      <button
        onClick={() => setViewMode('admin')}
        aria-label="Admin Login and Studio Admin Dashboard"
        title="Studio Admin Dashboard"
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 px-3.5 py-3 rounded-full bg-[#151515]/95 border border-[#D4AF70]/50 text-white hover:bg-[#D4AF70] hover:text-[#080808] font-semibold text-xs shadow-lg transition-all cursor-pointer group"
      >
        <Settings className="w-4 h-4 text-[#D4AF70] group-hover:text-[#080808] transition-transform duration-300 group-hover:rotate-90" />
        <span className="hidden sm:inline">Studio Admin</span>
      </button>

      {/* FLOATING WHATSAPP BUTTON (+2348063751294) (Bottom-Right) */}
      <a
        href={formatWhatsAppUrl(
          siteSettings.phone,
          'Hello CAREMEDIA! I would like to enquire about booking a photography/videography session.'
        )}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with CAREMEDIA on WhatsApp"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#D4AF70] text-[#080808] font-semibold text-xs shadow-lg hover:bg-[#e2c186] transition-transform hover:scale-105"
      >
        <MessageCircle className="w-4 h-4 fill-current" />
        <span className="hidden sm:inline">WhatsApp CAREMEDIA</span>
      </a>

      {/* FULL-SCREEN PORTFOLIO LIGHTBOX */}
      <MediaLightbox
        item={activeLightboxItem}
        onClose={() => setLightboxIndex(null)}
        onPrev={
          categoryMatchedPortfolio.length > 1
            ? () =>
                setLightboxIndex((prev) =>
                  prev !== null
                    ? (prev - 1 + categoryMatchedPortfolio.length) %
                      categoryMatchedPortfolio.length
                    : 0
                )
            : undefined
        }
        onNext={
          categoryMatchedPortfolio.length > 1
            ? () =>
                setLightboxIndex((prev) =>
                  prev !== null ? (prev + 1) % categoryMatchedPortfolio.length : 0
                )
            : undefined
        }
        onBookSimilar={(cat, title) =>
          handleBookServiceShortcut(
            cat === 'Videography'
              ? 'Documentary and Event Filming'
              : 'Wedding Photography & Videography',
            `${cat} (${title})`
          )
        }
      />
    </div>
  );
}
