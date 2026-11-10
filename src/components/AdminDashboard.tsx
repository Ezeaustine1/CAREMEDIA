import React, { useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  LayoutDashboard,
  Calendar,
  Image as ImageIcon,
  Briefcase,
  MessageSquareQuote,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Check,
  X,
  Star,
  Upload,
  ArrowLeft,
  Database,
  Edit3,
  MessageCircle,
  Film,
  Camera,
  Search,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Play,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  ADMIN_EMAIL,
  BLUEPRINT_LIMITS,
  sanitizeString,
  makeValidDocId,
} from '../lib/firebase';
import {
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
  GENERATED_ASSETS,
  formatWhatsAppUrl,
} from '../data/initialData';
import {
  processUploadedImageFile,
  processUploadedVideoFile,
} from '../lib/mediaVault';
import { studioApi } from '../lib/apiClient';
import { ResilientImage } from './ResilientImage';
import { getEmbedVideoUrl } from './MediaLightbox';

interface AdminDashboardProps {
  user: User | null;
  isFirestoreAdmin: boolean;
  isStudioAdminUnlocked: boolean;
  onUnlockStudioAdmin: (email: string) => void;
  onLockStudioAdmin: () => void;
  portfolioItems: PortfolioItemData[];
  categories: CategoryData[];
  services: ServiceItemData[];
  bookings: BookingData[];
  testimonials: TestimonialData[];
  siteSettings: SiteSettingsData;
  onUpdatePortfolio: (items: PortfolioItemData[]) => void;
  onUpdateCategories: (cats: CategoryData[]) => void;
  onUpdateServices: (srvs: ServiceItemData[]) => void;
  onUpdateBookings: (bks: BookingData[]) => void;
  onUpdateTestimonials: (tests: TestimonialData[]) => void;
  onUpdateSiteSettings: (settings: SiteSettingsData) => void;
  onExitAdmin: () => void;
}

export type AdminTab =
  | 'overview'
  | 'bookings'
  | 'portfolio'
  | 'videos'
  | 'services'
  | 'testimonials'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  isFirestoreAdmin,
  isStudioAdminUnlocked,
  onUnlockStudioAdmin,
  onLockStudioAdmin,
  portfolioItems,
  categories,
  services,
  bookings,
  testimonials,
  siteSettings,
  onUpdatePortfolio,
  onUpdateCategories,
  onUpdateServices,
  onUpdateBookings,
  onUpdateTestimonials,
  onUpdateSiteSettings,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [batchUploading, setBatchUploading] = useState(false);

  // Admin Login Form State
  const [loginEmail, setLoginEmail] = useState(ADMIN_EMAIL);
  const [loginPasscode, setLoginPasscode] = useState('CAREMEDIA2026');
  const [loginLoading, setLoginLoading] = useState(false);

  // Bookings Filter & Search & Manual Add State
  const [bookingFilter, setBookingFilter] = useState<string>('all');
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [showAddBookingForm, setShowAddBookingForm] = useState(false);
  const [newBkName, setNewBkName] = useState('');
  const [newBkPhone, setNewBkPhone] = useState('');
  const [newBkEmail, setNewBkEmail] = useState('');
  const [newBkEventType, setNewBkEventType] = useState('Wedding Ceremony');
  const [newBkDate, setNewBkDate] = useState('');
  const [newBkLocation, setNewBkLocation] = useState('Ota, Ogun State');
  const [newBkService, setNewBkService] = useState(
    services[0]?.title || 'Wedding Photography & Videography'
  );
  const [newBkNotes, setNewBkNotes] = useState('');
  const [newBkStatus, setNewBkStatus] = useState<'pending' | 'confirmed'>('confirmed');

  // Portfolio Filter & Form State
  const [portfolioFilterCat, setPortfolioFilterCat] = useState<string>('All');
  const [portfolioSearch, setPortfolioSearch] = useState<string>('');
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portTitle, setPortTitle] = useState('');
  const [portDesc, setPortDesc] = useState('');
  const [portCategory, setPortCategory] = useState(categories[0]?.name || 'Weddings');
  const [portMediaType, setPortMediaType] = useState<'photo' | 'video'>('photo');
  const [portMediaUrl, setPortMediaUrl] = useState(GENERATED_ASSETS.weddingLuxury);
  const [portThumbUrl, setPortThumbUrl] = useState(GENERATED_ASSETS.weddingLuxury);
  const [portFeatured, setPortFeatured] = useState(true);
  const [portExif, setPortExif] = useState('85mm f/1.4 · ISO 100');
  const [portClient, setPortClient] = useState('');

  // Dedicated Video Showcase & Film Reels Form State
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [vidTitle, setVidTitle] = useState('');
  const [vidDesc, setVidDesc] = useState('');
  const [vidCategory, setVidCategory] = useState('Videography');
  const [vidUrl, setVidUrl] = useState(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [vidThumbUrl, setVidThumbUrl] = useState(GENERATED_ASSETS.weddingLuxury);
  const [vidExif, setVidExif] = useState('4K 60fps · Cinema Master');
  const [vidClient, setVidClient] = useState('');
  const [vidFeatured, setVidFeatured] = useState(true);
  const [videoUploading, setVideoUploading] = useState(false);

  // New Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Service Form State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [srvTitle, setSrvTitle] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvImage, setSrvImage] = useState(GENERATED_ASSETS.weddingLuxury);
  const [srvDeliverables, setSrvDeliverables] = useState(
    '4K Cinema · Retouched Stills · Full Gallery'
  );
  const [srvOrder, setSrvOrder] = useState(services.length + 1);

  // Testimonial Admin Add, Edit & Filter State
  const [testimonialFilter, setTestimonialFilter] = useState<'all' | 'pending' | 'approved'>(
    'all'
  );
  const [showAddTestimonial, setShowAddTestimonial] = useState(false);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);
  const [testName, setTestName] = useState('');
  const [testRole, setTestRole] = useState('Wedding Client · Ota');
  const [testReview, setTestReview] = useState('');
  const [testRating, setTestRating] = useState(5);
  const [testPhoto, setTestPhoto] = useState(GENERATED_ASSETS.weddingLuxury);

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<SiteSettingsData>(siteSettings);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(null), 4500);
  };

  const handleDirectFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPasscode.trim()) {
      showMessage('error', 'Please enter your admin email and passcode.');
      return;
    }
    void studioApi.login(loginEmail.trim(), loginPasscode.trim());
    onUnlockStudioAdmin(loginEmail.trim());
    showMessage('success', 'Welcome to the CAREMEDIA Studio Admin Dashboard.');
  };

  const handleGoogleSignIn = async () => {
    setLoginLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onUnlockStudioAdmin(result.user.email || ADMIN_EMAIL);
      showMessage('success', 'Signed in with Google. Welcome to Studio Admin.');
    } catch (err: unknown) {
      showMessage(
        'error',
        err instanceof Error
          ? `${err.message}. You can also use the instant Studio Admin Login button above.`
          : 'Google Sign-In popup was closed.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (user) {
        await signOut(auth);
      }
    } catch {
      // ignore signOut errors
    }
    studioApi.logout();
    onLockStudioAdmin();
    showMessage('success', 'Signed out of Studio Admin.');
  };

  const tryFirestoreWrite = async (fn: () => Promise<void>) => {
    if (!isFirestoreAdmin) return;
    try {
      await fn();
    } catch (err) {
      console.warn('Firestore sync note (local state updated):', err);
    }
  };

  const syncPortfolioItemToFirestore = async (item: PortfolioItemData) => {
    void studioApi.savePortfolioItem(item);
    const safeFirestoreMediaUrl =
      item.mediaUrl.length <= BLUEPRINT_LIMITS.PORTFOLIO.MEDIA_URL_MAX
        ? item.mediaUrl
        : GENERATED_ASSETS.weddingLuxury;
    const safeFirestoreThumbUrl =
      item.thumbnailUrl.length <= BLUEPRINT_LIMITS.PORTFOLIO.THUMB_URL_MAX
        ? item.thumbnailUrl
        : GENERATED_ASSETS.weddingLuxury;

    await tryFirestoreWrite(async () => {
      await setDoc(doc(db, 'portfolioItems', item.id), {
        title: sanitizeString(item.title, BLUEPRINT_LIMITS.PORTFOLIO.TITLE_MAX, 'Untitled Work'),
        description: sanitizeString(
          item.description,
          BLUEPRINT_LIMITS.PORTFOLIO.DESC_MAX,
          'CAREMEDIA Production'
        ),
        category: sanitizeString(item.category, BLUEPRINT_LIMITS.PORTFOLIO.CATEGORY_MAX, 'Weddings'),
        mediaType: item.mediaType,
        mediaUrl: safeFirestoreMediaUrl,
        thumbnailUrl: safeFirestoreThumbUrl,
        featured: Boolean(item.featured),
        exifInfo: sanitizeString(item.exifInfo, BLUEPRINT_LIMITS.PORTFOLIO.EXIF_MAX),
        clientName: sanitizeString(item.clientName, BLUEPRINT_LIMITS.PORTFOLIO.CLIENT_MAX),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      onUpdateCategories(DEFAULT_CATEGORIES);
      onUpdatePortfolio(DEFAULT_PORTFOLIO_ITEMS);
      onUpdateServices(DEFAULT_SERVICES);
      onUpdateTestimonials(DEFAULT_TESTIMONIALS);
      onUpdateSiteSettings(DEFAULT_SITE_SETTINGS);
      void studioApi.seedDefaultDatabase();

      await tryFirestoreWrite(async () => {
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, 'categories', cat.id), {
            name: sanitizeString(cat.name, BLUEPRINT_LIMITS.CATEGORY.NAME_MAX),
            slug: sanitizeString(cat.slug, BLUEPRINT_LIMITS.CATEGORY.SLUG_MAX),
            createdAt: serverTimestamp(),
          });
        }
        for (const item of DEFAULT_PORTFOLIO_ITEMS) {
          await syncPortfolioItemToFirestore(item);
        }
        for (const srv of DEFAULT_SERVICES) {
          await setDoc(doc(db, 'services', srv.id), {
            title: sanitizeString(srv.title, BLUEPRINT_LIMITS.SERVICE.TITLE_MAX),
            description: sanitizeString(srv.description, BLUEPRINT_LIMITS.SERVICE.DESC_MAX),
            imageUrl: sanitizeString(srv.imageUrl, BLUEPRINT_LIMITS.SERVICE.IMAGE_URL_MAX),
            deliverables: sanitizeString(
              srv.deliverables,
              BLUEPRINT_LIMITS.SERVICE.DELIVERABLES_MAX
            ),
            orderIndex: Number(srv.orderIndex),
            updatedAt: serverTimestamp(),
          });
        }
        for (const test of DEFAULT_TESTIMONIALS) {
          await setDoc(doc(db, 'testimonials', test.id), {
            customerName: sanitizeString(
              test.customerName,
              BLUEPRINT_LIMITS.TESTIMONIAL.NAME_MAX
            ),
            roleOrEvent: sanitizeString(test.roleOrEvent, BLUEPRINT_LIMITS.TESTIMONIAL.ROLE_MAX),
            review: sanitizeString(test.review, BLUEPRINT_LIMITS.TESTIMONIAL.REVIEW_MAX),
            rating: Number(test.rating),
            photoUrl: sanitizeString(test.photoUrl, BLUEPRINT_LIMITS.TESTIMONIAL.PHOTO_URL_MAX),
            approved: Boolean(test.approved),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await setDoc(doc(db, 'siteSettings', 'main'), {
          heroTitle: sanitizeString(
            DEFAULT_SITE_SETTINGS.heroTitle,
            BLUEPRINT_LIMITS.SITE_SETTINGS.HERO_TITLE_MAX
          ),
          slogan: sanitizeString(
            DEFAULT_SITE_SETTINGS.slogan,
            BLUEPRINT_LIMITS.SITE_SETTINGS.SLOGAN_MAX
          ),
          heroSubtitle: sanitizeString(
            DEFAULT_SITE_SETTINGS.heroSubtitle,
            BLUEPRINT_LIMITS.SITE_SETTINGS.HERO_SUBTITLE_MAX
          ),
          aboutText: sanitizeString(
            DEFAULT_SITE_SETTINGS.aboutText,
            BLUEPRINT_LIMITS.SITE_SETTINGS.ABOUT_MAX
          ),
          phone: sanitizeString(
            DEFAULT_SITE_SETTINGS.phone,
            BLUEPRINT_LIMITS.SITE_SETTINGS.PHONE_MAX
          ),
          whatsapp: sanitizeString(
            DEFAULT_SITE_SETTINGS.whatsapp,
            BLUEPRINT_LIMITS.SITE_SETTINGS.WHATSAPP_MAX
          ),
          location: sanitizeString(
            DEFAULT_SITE_SETTINGS.location,
            BLUEPRINT_LIMITS.SITE_SETTINGS.LOCATION_MAX
          ),
          updatedAt: serverTimestamp(),
        });
      });

      showMessage(
        'success',
        'All CAREMEDIA default portfolio items, 5 verified reviews, services, and categories have been restored!'
      );
    } finally {
      setIsSeeding(false);
    }
  };

  // BOOKING HANDLERS
  const handleAddManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBkName.trim() || !newBkPhone.trim() || !newBkDate.trim()) {
      showMessage('error', 'Please fill in client name, phone number, and event date.');
      return;
    }
    const docId = makeValidDocId('booking');
    const newBooking: BookingData = {
      id: docId,
      fullName: sanitizeString(newBkName, BLUEPRINT_LIMITS.BOOKING.NAME_MAX),
      phone: sanitizeString(newBkPhone, BLUEPRINT_LIMITS.BOOKING.PHONE_MAX),
      email: sanitizeString(
        newBkEmail || 'client@caremedia.ng',
        BLUEPRINT_LIMITS.BOOKING.EMAIL_MAX
      ),
      eventType: sanitizeString(newBkEventType, BLUEPRINT_LIMITS.BOOKING.EVENT_TYPE_MAX),
      eventDate: sanitizeString(newBkDate, BLUEPRINT_LIMITS.BOOKING.EVENT_DATE_MAX),
      eventLocation: sanitizeString(newBkLocation, BLUEPRINT_LIMITS.BOOKING.LOCATION_MAX),
      serviceRequired: sanitizeString(newBkService, BLUEPRINT_LIMITS.BOOKING.SERVICE_MAX),
      additionalInfo: sanitizeString(newBkNotes, BLUEPRINT_LIMITS.BOOKING.INFO_MAX),
      status: newBkStatus,
    };

    onUpdateBookings([newBooking, ...bookings]);
    void studioApi.saveBooking(newBooking);

    await tryFirestoreWrite(async () => {
      await setDoc(doc(db, 'bookings', docId), {
        fullName: newBooking.fullName,
        phone: newBooking.phone,
        email: newBooking.email,
        eventType: newBooking.eventType,
        eventDate: newBooking.eventDate,
        eventLocation: newBooking.eventLocation,
        serviceRequired: newBooking.serviceRequired,
        additionalInfo: newBooking.additionalInfo,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (newBkStatus !== 'pending') {
        await updateDoc(doc(db, 'bookings', docId), {
          status: newBkStatus,
          updatedAt: serverTimestamp(),
        });
      }
    });

    setNewBkName('');
    setNewBkPhone('');
    setNewBkEmail('');
    setNewBkDate('');
    setNewBkNotes('');
    setShowAddBookingForm(false);
    showMessage('success', `Booking for ${newBooking.fullName} added to schedule.`);
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: 'pending' | 'confirmed' | 'declined' | 'completed'
  ) => {
    const updated = bookings.map((b) =>
      b.id === bookingId ? { ...b, status: newStatus } : b
    );
    onUpdateBookings(updated);
    void studioApi.updateBookingStatus(bookingId, newStatus);

    await tryFirestoreWrite(async () => {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    });

    showMessage('success', `Booking status updated to "${newStatus.toUpperCase()}".`);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const updated = bookings.filter((b) => b.id !== bookingId);
    onUpdateBookings(updated);
    void studioApi.deleteBooking(bookingId);

    await tryFirestoreWrite(async () => {
      await deleteDoc(doc(db, 'bookings', bookingId));
    });

    showMessage('success', 'Booking record deleted.');
  };

  // PORTFOLIO HANDLERS (Single + Multi-Photo Batch Upload for up to 100+ items)
  const handleSavePortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portTitle.trim() || !portDesc.trim() || !portMediaUrl.trim()) {
      showMessage('error', 'Please fill in title, description, and media URL.');
      return;
    }

    const docId = editingPortfolioId || makeValidDocId('port');
    const newItem: PortfolioItemData = {
      id: docId,
      title: sanitizeString(portTitle, BLUEPRINT_LIMITS.PORTFOLIO.TITLE_MAX, 'Untitled Work'),
      description: sanitizeString(
        portDesc,
        BLUEPRINT_LIMITS.PORTFOLIO.DESC_MAX,
        'CAREMEDIA Production'
      ),
      category: sanitizeString(
        portCategory,
        BLUEPRINT_LIMITS.PORTFOLIO.CATEGORY_MAX,
        'Weddings'
      ),
      mediaType: portMediaType,
      mediaUrl: portMediaUrl.trim(),
      thumbnailUrl: (portThumbUrl || portMediaUrl).trim(),
      featured: Boolean(portFeatured),
      exifInfo: sanitizeString(portExif, BLUEPRINT_LIMITS.PORTFOLIO.EXIF_MAX),
      clientName: sanitizeString(portClient, BLUEPRINT_LIMITS.PORTFOLIO.CLIENT_MAX),
    };

    if (editingPortfolioId) {
      onUpdatePortfolio(
        portfolioItems.map((item) => (item.id === editingPortfolioId ? newItem : item))
      );
      showMessage('success', `"${newItem.title}" updated in portfolio.`);
    } else {
      onUpdatePortfolio([newItem, ...portfolioItems]);
      showMessage('success', `"${newItem.title}" published to public portfolio.`);
    }

    await syncPortfolioItemToFirestore(newItem);

    setEditingPortfolioId(null);
    setPortTitle('');
    setPortDesc('');
    setPortClient('');
  };

  // Multi-File Batch Upload so Admin can upload 10, 50, or 100 photos at once into any category
  const handleBatchPhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBatchUploading(true);
    try {
      const addedItems: PortfolioItemData[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
        const { vaultUrl } = await processUploadedImageFile(file);
        const docId = makeValidDocId(`port_${i}`);
        const item: PortfolioItemData = {
          id: docId,
          title: sanitizeString(
            portTitle.trim()
              ? files.length > 1
                ? `${portTitle.trim()} (${i + 1})`
                : portTitle.trim()
              : cleanFileName || `${portCategory} Highlight #${i + 1}`,
            BLUEPRINT_LIMITS.PORTFOLIO.TITLE_MAX,
            'CAREMEDIA Portfolio Work'
          ),
          description: sanitizeString(
            portDesc.trim() ||
              `Professional ${portCategory} photography captured by CAREMEDIA in high-resolution full frame.`,
            BLUEPRINT_LIMITS.PORTFOLIO.DESC_MAX,
            'CAREMEDIA Production'
          ),
          category: sanitizeString(portCategory, BLUEPRINT_LIMITS.PORTFOLIO.CATEGORY_MAX, 'Weddings'),
          mediaType: 'photo',
          mediaUrl: vaultUrl,
          thumbnailUrl: vaultUrl,
          featured: portFeatured,
          exifInfo: sanitizeString(
            portExif || 'Full-Frame Master · CAREMEDIA Studio',
            BLUEPRINT_LIMITS.PORTFOLIO.EXIF_MAX
          ),
          clientName: sanitizeString(portClient, BLUEPRINT_LIMITS.PORTFOLIO.CLIENT_MAX),
        };
        addedItems.push(item);
        await syncPortfolioItemToFirestore(item);
      }

      onUpdatePortfolio([...addedItems, ...portfolioItems]);
      showMessage(
        'success',
        `Successfully uploaded and published ${addedItems.length} photograph(s) to "${portCategory}"!`
      );
    } catch {
      showMessage('error', 'One or more image files could not be processed.');
    } finally {
      setBatchUploading(false);
    }
  };

  const handleTogglePortfolioFeatured = async (item: PortfolioItemData) => {
    const nextFeatured = !item.featured;
    const updatedItem = { ...item, featured: nextFeatured };
    const updated = portfolioItems.map((p) => (p.id === item.id ? updatedItem : p));
    onUpdatePortfolio(updated);

    await syncPortfolioItemToFirestore(updatedItem);

    showMessage(
      'success',
      `"${item.title}" ${
        nextFeatured ? 'featured on Front Page' : 'moved to Category Archive'
      }.`
    );
  };

  const handleDeletePortfolioItem = async (id: string) => {
    const target = portfolioItems.find((p) => p.id === id);
    onUpdatePortfolio(portfolioItems.filter((p) => p.id !== id));
    void studioApi.deletePortfolioItem(id);

    await tryFirestoreWrite(async () => {
      await deleteDoc(doc(db, 'portfolioItems', id));
    });

    showMessage('success', `"${target?.title || 'Item'}" deleted.`);
  };

  // DEDICATED VIDEO SHOWCASE & FILM REELS HANDLERS
  const handleSaveVideoReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidTitle.trim() || !vidUrl.trim()) {
      showMessage('error', 'Please enter a video title and video URL or upload a video file.');
      return;
    }

    const docId = editingVideoId || makeValidDocId('vid');
    const newVideoItem: PortfolioItemData = {
      id: docId,
      title: sanitizeString(vidTitle, BLUEPRINT_LIMITS.PORTFOLIO.TITLE_MAX, 'Untitled Film Reel'),
      description: sanitizeString(
        vidDesc || 'Cinematic 4K event film produced by CAREMEDIA.',
        BLUEPRINT_LIMITS.PORTFOLIO.DESC_MAX,
        'CAREMEDIA Film Production'
      ),
      category: sanitizeString(vidCategory || 'Videography', BLUEPRINT_LIMITS.PORTFOLIO.CATEGORY_MAX),
      mediaType: 'video',
      mediaUrl: vidUrl.trim(),
      thumbnailUrl: (vidThumbUrl || GENERATED_ASSETS.weddingLuxury).trim(),
      featured: Boolean(vidFeatured),
      exifInfo: sanitizeString(
        vidExif || '4K Cinema Master · CAREMEDIA',
        BLUEPRINT_LIMITS.PORTFOLIO.EXIF_MAX
      ),
      clientName: sanitizeString(vidClient, BLUEPRINT_LIMITS.PORTFOLIO.CLIENT_MAX),
    };

    if (editingVideoId) {
      onUpdatePortfolio(
        portfolioItems.map((item) => (item.id === editingVideoId ? newVideoItem : item))
      );
      showMessage('success', `Video reel "${newVideoItem.title}" updated in Cinematic Video Showcase!`);
    } else {
      onUpdatePortfolio([newVideoItem, ...portfolioItems]);
      showMessage('success', `New video reel "${newVideoItem.title}" added to Featured Film Reels!`);
    }

    await syncPortfolioItemToFirestore(newVideoItem);

    setEditingVideoId(null);
    setVidTitle('');
    setVidDesc('');
    setVidClient('');
  };

  const handleSetMainShowcaseVideo = (videoId: string) => {
    const target = portfolioItems.find((p) => p.id === videoId);
    if (!target) return;
    const remaining = portfolioItems.filter((p) => p.id !== videoId);
    onUpdatePortfolio([{ ...target, featured: true }, ...remaining]);
    showMessage(
      'success',
      `"${target.title}" is now the Lead Film in the Cinematic Video Showcase!`
    );
  };

  const handleMoveVideoOrder = (videoId: string, direction: 'up' | 'down') => {
    const videos = portfolioItems.filter(
      (i) => i.mediaType === 'video' || i.category === 'Videography'
    );
    const vIdx = videos.findIndex((v) => v.id === videoId);
    if (vIdx < 0) return;
    const swapIdx = direction === 'up' ? vIdx - 1 : vIdx + 1;
    if (swapIdx < 0 || swapIdx >= videos.length) return;

    const idA = videos[vIdx].id;
    const idB = videos[swapIdx].id;
    const fullList = [...portfolioItems];
    const posA = fullList.findIndex((i) => i.id === idA);
    const posB = fullList.findIndex((i) => i.id === idB);
    if (posA >= 0 && posB >= 0) {
      const temp = fullList[posA];
      fullList[posA] = fullList[posB];
      fullList[posB] = temp;
      onUpdatePortfolio(fullList);
      showMessage('success', 'Featured Film Reels order updated.');
    }
  };

  // CATEGORY HANDLERS
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const slug =
      newCategoryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 75) || 'category';
    const id = `cat_${slug}_${Date.now().toString().slice(-4)}`;
    const newCat: CategoryData = {
      id,
      name: sanitizeString(newCategoryName, BLUEPRINT_LIMITS.CATEGORY.NAME_MAX),
      slug,
    };

    onUpdateCategories([...categories, newCat]);
    void studioApi.saveCategory(newCat);
    setNewCategoryName('');
    showMessage('success', `Category "${newCat.name}" added.`);

    await tryFirestoreWrite(async () => {
      await setDoc(doc(db, 'categories', id), {
        name: newCat.name,
        slug: newCat.slug,
        createdAt: serverTimestamp(),
      });
    });
  };

  const handleDeleteCategory = async (id: string) => {
    onUpdateCategories(categories.filter((c) => c.id !== id));
    void studioApi.deleteCategory(id);
    showMessage('success', 'Category removed.');

    await tryFirestoreWrite(async () => {
      await deleteDoc(doc(db, 'categories', id));
    });
  };

  // SERVICE HANDLERS
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvTitle.trim() || !srvDesc.trim()) {
      showMessage('error', 'Please enter service title and description.');
      return;
    }
    const docId = editingServiceId || makeValidDocId('srv');
    const newSrv: ServiceItemData = {
      id: docId,
      title: sanitizeString(srvTitle, BLUEPRINT_LIMITS.SERVICE.TITLE_MAX),
      description: sanitizeString(srvDesc, BLUEPRINT_LIMITS.SERVICE.DESC_MAX),
      imageUrl: srvImage.trim() || GENERATED_ASSETS.weddingLuxury,
      deliverables: sanitizeString(
        srvDeliverables,
        BLUEPRINT_LIMITS.SERVICE.DELIVERABLES_MAX
      ),
      orderIndex: Math.max(0, Math.min(1000, Number(srvOrder) || 1)),
    };

    if (editingServiceId) {
      onUpdateServices(
        services
          .map((s) => (s.id === editingServiceId ? newSrv : s))
          .sort((a, b) => a.orderIndex - b.orderIndex)
      );
      showMessage('success', `Service "${newSrv.title}" updated.`);
    } else {
      onUpdateServices(
        [...services, newSrv].sort((a, b) => a.orderIndex - b.orderIndex)
      );
      showMessage('success', `New service "${newSrv.title}" added.`);
    }
    void studioApi.saveService(newSrv);

    await tryFirestoreWrite(async () => {
      await setDoc(doc(db, 'services', docId), {
        title: newSrv.title,
        description: newSrv.description,
        imageUrl: sanitizeString(
          newSrv.imageUrl.length <= 2000
            ? newSrv.imageUrl
            : GENERATED_ASSETS.weddingLuxury,
          BLUEPRINT_LIMITS.SERVICE.IMAGE_URL_MAX
        ),
        deliverables: newSrv.deliverables,
        orderIndex: newSrv.orderIndex,
        updatedAt: serverTimestamp(),
      });
    });

    setEditingServiceId(null);
    setSrvTitle('');
    setSrvDesc('');
    setSrvOrder(services.length + 2);
  };

  const handleDeleteService = async (id: string) => {
    onUpdateServices(services.filter((s) => s.id !== id));
    void studioApi.deleteService(id);
    showMessage('success', 'Service package removed.');

    await tryFirestoreWrite(async () => {
      await deleteDoc(doc(db, 'services', id));
    });
  };

  // TESTIMONIALS HANDLERS (Full Add, Edit, Reorder in Row of 5, Approve/Unpublish, Delete)
  const handleSaveAdminTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim() || testReview.trim().length < 5) {
      showMessage('error', 'Please enter customer name and review.');
      return;
    }
    const docId = editingTestimonialId || makeValidDocId('test');
    const savedTest: TestimonialData = {
      id: docId,
      customerName: sanitizeString(testName, BLUEPRINT_LIMITS.TESTIMONIAL.NAME_MAX),
      roleOrEvent: sanitizeString(
        testRole || 'Verified CAREMEDIA Client',
        BLUEPRINT_LIMITS.TESTIMONIAL.ROLE_MAX
      ),
      review: sanitizeString(testReview, BLUEPRINT_LIMITS.TESTIMONIAL.REVIEW_MAX),
      rating: Math.max(1, Math.min(5, Number(testRating) || 5)),
      photoUrl: testPhoto.trim() || GENERATED_ASSETS.weddingLuxury,
      approved: true,
    };

    if (editingTestimonialId) {
      onUpdateTestimonials(
        testimonials.map((t) => (t.id === editingTestimonialId ? savedTest : t))
      );
      showMessage('success', `Customer review by "${savedTest.customerName}" updated!`);
    } else {
      onUpdateTestimonials([savedTest, ...testimonials]);
      showMessage('success', `Verified review by "${savedTest.customerName}" published to Row of 5!`);
    }
    void studioApi.saveTestimonial(savedTest);

    setEditingTestimonialId(null);
    setTestName('');
    setTestReview('');
    setShowAddTestimonial(false);

    await tryFirestoreWrite(async () => {
      await setDoc(doc(db, 'testimonials', docId), {
        customerName: savedTest.customerName,
        roleOrEvent: savedTest.roleOrEvent,
        review: savedTest.review,
        rating: savedTest.rating,
        photoUrl: sanitizeString(
          savedTest.photoUrl.length <= 2000
            ? savedTest.photoUrl
            : GENERATED_ASSETS.weddingLuxury,
          BLUEPRINT_LIMITS.TESTIMONIAL.PHOTO_URL_MAX
        ),
        approved: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  };

  const handleToggleTestimonialApproval = async (t: TestimonialData) => {
    const nextApproved = !t.approved;
    onUpdateTestimonials(
      testimonials.map((item) =>
        item.id === t.id ? { ...item, approved: nextApproved } : item
      )
    );
    void studioApi.saveTestimonial({ ...t, approved: nextApproved });
    showMessage(
      'success',
      `Review by ${t.customerName} ${
        nextApproved ? 'approved for public Row of 5' : 'moved to pending'
      }.`
    );

    await tryFirestoreWrite(async () => {
      await setDoc(doc(db, 'testimonials', t.id), {
        customerName: sanitizeString(t.customerName, BLUEPRINT_LIMITS.TESTIMONIAL.NAME_MAX),
        roleOrEvent: sanitizeString(t.roleOrEvent, BLUEPRINT_LIMITS.TESTIMONIAL.ROLE_MAX),
        review: sanitizeString(t.review, BLUEPRINT_LIMITS.TESTIMONIAL.REVIEW_MAX),
        rating: Math.max(1, Math.min(5, Number(t.rating) || 5)),
        photoUrl: sanitizeString(
          (t.photoUrl || '').length <= 2000
            ? t.photoUrl || ''
            : GENERATED_ASSETS.weddingLuxury,
          BLUEPRINT_LIMITS.TESTIMONIAL.PHOTO_URL_MAX
        ),
        approved: nextApproved,
        createdAt: t.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  };

  const handleMoveTestimonialOrder = (id: string, direction: 'up' | 'down') => {
    const idx = testimonials.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= testimonials.length) return;
    const copy = [...testimonials];
    const temp = copy[idx];
    copy[idx] = copy[swapIdx];
    copy[swapIdx] = temp;
    onUpdateTestimonials(copy);
    showMessage('success', 'Customer review display order updated.');
  };

  const handleDeleteTestimonial = async (id: string) => {
    onUpdateTestimonials(testimonials.filter((t) => t.id !== id));
    void studioApi.deleteTestimonial(id);
    showMessage('success', 'Testimonial deleted.');

    await tryFirestoreWrite(async () => {
      await deleteDoc(doc(db, 'testimonials', id));
    });
  };

  // SITE SETTINGS HANDLER
  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SiteSettingsData = {
      heroTitle: sanitizeString(
        settingsForm.heroTitle,
        BLUEPRINT_LIMITS.SITE_SETTINGS.HERO_TITLE_MAX,
        'CAREMEDIA'
      ),
      slogan: sanitizeString(
        settingsForm.slogan,
        BLUEPRINT_LIMITS.SITE_SETTINGS.SLOGAN_MAX,
        DEFAULT_SITE_SETTINGS.slogan
      ),
      heroSubtitle: sanitizeString(
        settingsForm.heroSubtitle,
        BLUEPRINT_LIMITS.SITE_SETTINGS.HERO_SUBTITLE_MAX,
        DEFAULT_SITE_SETTINGS.heroSubtitle
      ),
      aboutText: sanitizeString(
        settingsForm.aboutText,
        BLUEPRINT_LIMITS.SITE_SETTINGS.ABOUT_MAX,
        DEFAULT_SITE_SETTINGS.aboutText
      ),
      phone: sanitizeString(
        settingsForm.phone,
        BLUEPRINT_LIMITS.SITE_SETTINGS.PHONE_MAX,
        '08063751294'
      ),
      whatsapp: sanitizeString(
        settingsForm.whatsapp,
        BLUEPRINT_LIMITS.SITE_SETTINGS.WHATSAPP_MAX,
        '+2348063751294'
      ),
      location: sanitizeString(
        settingsForm.location,
        BLUEPRINT_LIMITS.SITE_SETTINGS.LOCATION_MAX,
        'Ota, Ogun State, Nigeria'
      ),
    };

    onUpdateSiteSettings(updated);
    void studioApi.saveSiteSettings(updated);
    showMessage('success', 'Website headlines, About story, and contact details updated live!');

    await tryFirestoreWrite(async () => {
      await setDoc(doc(db, 'siteSettings', 'main'), {
        ...updated,
        updatedAt: serverTimestamp(),
      });
    });
  };

  // ADMIN LOGIN GATE: Leads directly to Admin Dashboard upon login
  if (!isStudioAdminUnlocked) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#151515] p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#D4AF70]/15 border border-[#D4AF70]/40 flex items-center justify-center text-[#D4AF70]">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif-display text-2xl font-bold text-white">
                  Studio Admin Login
                </h1>
                <p className="text-xs text-zinc-400">
                  CAREMEDIA Executive Control Room
                </p>
              </div>
            </div>
            <button
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Website</span>
            </button>
          </div>

          {statusBanner && (
            <div
              className={`mb-5 px-3.5 py-2.5 rounded-lg border text-xs ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/60 border-red-500/40 text-red-200'
              }`}
            >
              {statusBanner.text}
            </div>
          )}

          {/* Direct Studio Admin Login Form */}
          <form onSubmit={handleDirectFormLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                  placeholder="ezehaustine1@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Studio Access Key
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                  placeholder="Enter studio passcode"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-[#D4AF70] text-[#080808] font-semibold text-sm hover:bg-[#e2c186] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Login to Studio Admin Dashboard</span>
            </button>
          </form>

          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#151515] px-3 text-xs text-zinc-500 uppercase">or</span>
            <div className="border-t border-white/10 w-full" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loginLoading}
            className="w-full py-2.5 px-4 rounded-lg border border-white/15 bg-[#080808] hover:border-[#D4AF70] text-white font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>
              {loginLoading ? 'Connecting to Google...' : 'Continue with Google OAuth'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Metrics Calculation
  const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedBookingsCount = bookings.filter((b) => b.status === 'confirmed').length;
  const completedBookingsCount = bookings.filter((b) => b.status === 'completed').length;
  const pendingReviewsCount = testimonials.filter((t) => !t.approved).length;
  const approvedReviewsCount = testimonials.filter((t) => t.approved).length;
  const featuredItemsCount = portfolioItems.filter((p) => p.featured).length;
  const videoProjects = portfolioItems.filter(
    (p) => p.mediaType === 'video' || p.category === 'Videography'
  );
  const videoCount = videoProjects.length;
  const photoCount = portfolioItems.filter((p) => p.mediaType === 'photo').length;

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = bookingFilter === 'all' ? true : b.status === bookingFilter;
    const q = bookingSearch.trim().toLowerCase();
    const matchesSearch = !q
      ? true
      : b.fullName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.serviceRequired.toLowerCase().includes(q) ||
        b.eventLocation.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const filteredAdminPortfolio = portfolioItems.filter((item) => {
    const matchesCat =
      portfolioFilterCat === 'All'
        ? true
        : portfolioFilterCat === 'Featured'
        ? item.featured
        : portfolioFilterCat === 'Videos'
        ? item.mediaType === 'video'
        : item.category === portfolioFilterCat;
    const q = portfolioSearch.trim().toLowerCase();
    const matchesSearch = !q
      ? true
      : item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.clientName || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const filteredAdminTestimonials = testimonials.filter((t) => {
    if (testimonialFilter === 'pending') return !t.approved;
    if (testimonialFilter === 'approved') return t.approved;
    return true;
  });

  const navTabs: {
    id: AdminTab;
    label: string;
    shortLabel: string;
    count?: number;
    badge?: number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'overview',
      label: 'Overview & Analytics',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'bookings',
      label: 'Client Bookings',
      shortLabel: 'Bookings',
      count: bookings.length,
      badge: pendingBookingsCount,
      icon: Calendar,
    },
    {
      id: 'portfolio',
      label: 'Portfolio (100+ Gallery)',
      shortLabel: 'Portfolio',
      count: portfolioItems.length,
      icon: ImageIcon,
    },
    {
      id: 'videos',
      label: 'Video Showcase & Reels',
      shortLabel: 'Film Reels',
      count: videoCount,
      icon: Film,
    },
    {
      id: 'services',
      label: 'Services & Packages',
      shortLabel: 'Services',
      count: services.length,
      icon: Briefcase,
    },
    {
      id: 'testimonials',
      label: 'Reviews (Row of 5)',
      shortLabel: 'Reviews',
      count: testimonials.length,
      badge: pendingReviewsCount,
      icon: MessageSquareQuote,
    },
    {
      id: 'settings',
      label: 'Website Content',
      shortLabel: 'Site Copy',
      icon: Settings,
    },
  ];

  const previewVideoSource = getEmbedVideoUrl(vidUrl);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col lg:flex-row">
      {/* RESPONSIVE SIDEBAR & MOBILE HEADER */}
      <aside className="w-full lg:w-72 lg:sticky lg:top-0 lg:h-screen shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#111111] flex flex-col justify-between z-30">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D4AF70] text-[#080808] flex items-center justify-center font-bold">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="font-serif-display text-xl font-bold tracking-tight text-white block leading-none">
                  CAREMEDIA
                </span>
                <span className="text-[11px] text-[#D4AF70]">Studio Admin Portal</span>
              </div>
            </div>

            {/* Mobile Quick Actions */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={onExitAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#D4AF70] text-[#080808] rounded-lg cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Public Site</span>
              </button>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-zinc-400 hover:text-red-300 border border-white/10 rounded-lg cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="mt-4 flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#D4AF70] text-[#080808] font-semibold shadow-sm'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {typeof tab.count === 'number' && (
                      <span
                        className={`font-mono-tabular text-[11px] ${
                          active ? 'text-[#080808]/80' : 'text-zinc-500'
                        }`}
                      >
                        ({tab.count})
                      </span>
                    )}
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold ${
                          active
                            ? 'bg-[#080808] text-[#D4AF70]'
                            : 'bg-[#D4AF70]/20 text-[#D4AF70]'
                        }`}
                      >
                        {tab.badge} new
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Footer Controls */}
        <div className="hidden lg:flex flex-col gap-2.5 p-5 border-t border-white/10 bg-[#0c0c0c]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="truncate">{user?.email || loginEmail}</span>
            <span className="text-[#D4AF70] font-medium">Admin</span>
          </div>

          <button
            onClick={onExitAdmin}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#D4AF70] text-[#080808] hover:bg-[#e2c186] text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 hover:bg-red-950/40 text-xs font-medium text-zinc-400 hover:text-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock / Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
        {statusBanner && (
          <div
            className={`mb-5 px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between shadow-lg ${
              statusBanner.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/80 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#D4AF70]" />
              <span>{statusBanner.text}</span>
            </div>
            <button
              onClick={() => setStatusBanner(null)}
              className="text-current p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Action Bar */}
        <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-[#151515] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF70]" />
              <span>Studio Control Room · Full Uncropped Image &amp; Video Engine</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Upload up to 100+ client photos &amp; videos, manage Featured Film Reels, and control the Row of 5 Verified Reviews.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 hover:border-[#D4AF70] text-xs font-medium text-zinc-200 hover:text-[#D4AF70] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-[#D4AF70]" />
              <span>{isSeeding ? 'Syncing...' : 'Restore Defaults'}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('portfolio');
                setEditingPortfolioId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Photos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('videos');
                setEditingVideoId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4AF70]/50 bg-[#080808] text-[#D4AF70] text-xs font-semibold hover:bg-[#D4AF70] hover:text-[#080808] transition-colors cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Manage Film Reels</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                Studio Overview &amp; Analytics
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Click any card below to manage bookings, 100+ portfolio items, film reels, or customer reviews.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-left p-5 rounded-2xl border border-white/10 bg-[#151515] hover:border-[#D4AF70] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Client Bookings</span>
                  <Calendar className="w-4 h-4 text-[#D4AF70]" />
                </div>
                <p className="font-mono-tabular text-3xl font-bold text-white mt-2 group-hover:text-[#D4AF70]">
                  {bookings.length}
                </p>
                <p className="text-xs text-zinc-400 mt-2 font-mono-tabular">
                  {pendingBookingsCount} pending · {confirmedBookingsCount} confirmed ·{' '}
                  {completedBookingsCount} done
                </p>
              </button>

              <button
                onClick={() => setActiveTab('portfolio')}
                className="text-left p-5 rounded-2xl border border-white/10 bg-[#151515] hover:border-[#D4AF70] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Portfolio Archive</span>
                  <ImageIcon className="w-4 h-4 text-[#D4AF70]" />
                </div>
                <p className="font-mono-tabular text-3xl font-bold text-white mt-2 group-hover:text-[#D4AF70]">
                  {portfolioItems.length}
                </p>
                <p className="text-xs text-zinc-400 mt-2 font-mono-tabular">
                  {photoCount} photos · {featuredItemsCount} front-page featured
                </p>
              </button>

              <button
                onClick={() => setActiveTab('videos')}
                className="text-left p-5 rounded-2xl border border-white/10 bg-[#151515] hover:border-[#D4AF70] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Cinematic Video Reels</span>
                  <Film className="w-4 h-4 text-[#D4AF70]" />
                </div>
                <p className="font-mono-tabular text-3xl font-bold text-white mt-2 group-hover:text-[#D4AF70]">
                  {videoCount}
                </p>
                <p className="text-xs text-zinc-400 mt-2 font-mono-tabular">
                  Active in Cinematic Video Showcase
                </p>
              </button>

              <button
                onClick={() => setActiveTab('testimonials')}
                className="text-left p-5 rounded-2xl border border-white/10 bg-[#151515] hover:border-[#D4AF70] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Verified Reviews (Row of 5)</span>
                  <MessageSquareQuote className="w-4 h-4 text-[#D4AF70]" />
                </div>
                <p className="font-mono-tabular text-3xl font-bold text-white mt-2 group-hover:text-[#D4AF70]">
                  {testimonials.length}
                </p>
                <p className="text-xs text-[#D4AF70] mt-2 font-mono-tabular">
                  {approvedReviewsCount} public in Row of 5 · {pendingReviewsCount} pending
                </p>
              </button>
            </div>

            {/* Category Inventory Breakdown */}
            <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-white">
                    Category Archive Distribution (Weddings to Videography)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Front page displays up to 6 preview works per category and directs visitors to the Full Category Archive Page for all 100+ uploads.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="text-xs text-[#D4AF70] hover:underline text-left cursor-pointer shrink-0"
                >
                  Upload to Categories →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {categories.map((cat) => {
                  const count = portfolioItems.filter(
                    (i) =>
                      i.category === cat.name ||
                      (cat.name === 'Videography' && i.mediaType === 'video')
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setPortfolioFilterCat(cat.name);
                        setPortCategory(cat.name);
                        setActiveTab('portfolio');
                      }}
                      className="p-3.5 rounded-xl bg-[#080808] border border-white/10 hover:border-[#D4AF70] flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-medium text-white truncate">
                        {cat.name}
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-[#D4AF70]">
                        {count} works
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Bookings Section */}
            <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-white">
                    Recent Client Bookings
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Confirm or message clients directly via WhatsApp.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('bookings');
                      setShowAddBookingForm(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                  >
                    + Log New Booking
                  </button>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs text-[#D4AF70] hover:underline cursor-pointer"
                  >
                    View All ({bookings.length})
                  </button>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#080808] border border-white/5 text-center space-y-2">
                  <p className="text-sm text-zinc-300">No client bookings recorded yet.</p>
                  <button
                    onClick={() => {
                      setActiveTab('bookings');
                      setShowAddBookingForm(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold cursor-pointer"
                  >
                    + Add Client Booking
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-[#080808] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-white text-sm">
                            {b.fullName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#D4AF70] uppercase font-mono-tabular font-semibold">
                            {b.status}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-zinc-400">
                            {b.eventDate}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300">
                          {b.serviceRequired} ({b.eventType}) — {b.eventLocation}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'confirmed')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-900/50 text-emerald-200 hover:bg-emerald-800/70 text-xs font-medium cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'declined')}
                          className="px-3 py-1.5 rounded-lg bg-red-900/40 text-red-200 hover:bg-red-800/60 text-xs font-medium cursor-pointer"
                        >
                          Decline
                        </button>
                        <a
                          href={formatWhatsAppUrl(
                            b.phone,
                            `Hello ${b.fullName}, this is CAREMEDIA regarding your ${b.serviceRequired} booking on ${b.eventDate}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186]"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS MANAGEMENT */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                  Client Bookings &amp; Schedule
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  View customer contact details, confirm or decline dates, and log phone/WhatsApp bookings.
                </p>
              </div>

              <button
                onClick={() => setShowAddBookingForm(!showAddBookingForm)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddBookingForm ? 'Close Form' : 'Log Phone / Walk-In Booking'}</span>
              </button>
            </div>

            {showAddBookingForm && (
              <form
                onSubmit={handleAddManualBooking}
                className="p-5 rounded-2xl border border-[#D4AF70]/40 bg-[#151515] space-y-4"
              >
                <h2 className="font-serif-display text-2xl font-semibold text-white">
                  Log New Client Booking
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Client Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newBkName}
                      onChange={(e) => setNewBkName(e.target.value)}
                      placeholder="e.g. Chief & Mrs. Ogunleye"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Phone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={newBkPhone}
                      onChange={(e) => setNewBkPhone(e.target.value)}
                      placeholder="e.g. 08063751294"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Client Email</label>
                    <input
                      type="email"
                      value={newBkEmail}
                      onChange={(e) => setNewBkEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Event Date *</label>
                    <input
                      type="date"
                      required
                      value={newBkDate}
                      onChange={(e) => setNewBkDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Event Location *</label>
                    <input
                      type="text"
                      required
                      value={newBkLocation}
                      onChange={(e) => setNewBkLocation(e.target.value)}
                      placeholder="Ota, Ogun State"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Initial Status</label>
                    <select
                      value={newBkStatus}
                      onChange={(e) =>
                        setNewBkStatus(e.target.value as 'pending' | 'confirmed')
                      }
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Service Package *</label>
                    <select
                      value={newBkService}
                      onChange={(e) => setNewBkService(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.title}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Event Type</label>
                    <input
                      type="text"
                      value={newBkEventType}
                      onChange={(e) => setNewBkEventType(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Notes / Deliverables</label>
                  <input
                    type="text"
                    value={newBkNotes}
                    onChange={(e) => setNewBkNotes(e.target.value)}
                    placeholder="Deposit received, drone coverage requested..."
                    className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBookingForm(false)}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                  >
                    Save Booking
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder="Search bookings by client name, phone, location..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#151515] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D4AF70]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#151515] border border-white/10 rounded-xl overflow-x-auto">
                {['all', 'pending', 'confirmed', 'completed', 'declined'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setBookingFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      bookingFilter === st
                        ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-10 rounded-2xl border border-white/10 bg-[#151515] text-center space-y-3">
                <p className="text-sm text-zinc-300">No bookings match this view.</p>
                <button
                  onClick={() => setShowAddBookingForm(true)}
                  className="px-4 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold cursor-pointer"
                >
                  + Log a New Booking
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border border-white/10 bg-[#151515] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="text-base font-semibold text-white">
                          {b.fullName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#D4AF70] uppercase font-mono-tabular font-semibold">
                          {b.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular text-zinc-300">
                          Event Date: {b.eventDate}
                        </span>
                      </div>

                      <p className="text-sm text-zinc-200">
                        <strong className="text-white">{b.serviceRequired}</strong> ({b.eventType}) at{' '}
                        <span className="text-zinc-300">{b.eventLocation}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-mono-tabular">
                        <a
                          href={`tel:${b.phone}`}
                          className="inline-flex items-center gap-1 hover:text-[#D4AF70]"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{b.phone}</span>
                        </a>
                        <a
                          href={`mailto:${b.email}`}
                          className="inline-flex items-center gap-1 hover:text-[#D4AF70]"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{b.email}</span>
                        </a>
                      </div>

                      {b.additionalInfo && (
                        <p className="text-xs text-zinc-300 bg-[#080808] p-2.5 rounded-lg border border-white/5">
                          Notes: {b.additionalInfo}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateBookingStatus(b.id, 'confirmed')}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-950/70 text-emerald-200 hover:bg-emerald-900'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </button>
                      <button
                        onClick={() => handleUpdateBookingStatus(b.id, 'completed')}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                          b.status === 'completed'
                            ? 'bg-white text-[#080808]'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <span>Completed</span>
                      </button>
                      <button
                        onClick={() => handleUpdateBookingStatus(b.id, 'declined')}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                          b.status === 'declined'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-950/60 text-amber-200 hover:bg-amber-900/70'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                      <a
                        href={formatWhatsAppUrl(
                          b.phone,
                          `Hello ${b.fullName}, this is CAREMEDIA regarding your ${b.serviceRequired} booking for ${b.eventDate} at ${b.eventLocation}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4AF70] text-[#080808] hover:bg-[#e2c186] text-xs font-semibold whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                      <button
                        onClick={() => handleDeleteBooking(b.id)}
                        className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-red-300 hover:border-red-500/40 cursor-pointer"
                        aria-label="Delete booking"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PORTFOLIO (100+ GALLERY & BATCH UPLOAD) */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                Portfolio Photographs &amp; 100+ Category Archive Manager
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Upload single or multiple client photographs and videos. Front page displays a sleek 6-item preview per category while visitors can click to view all 100+ uploads in the dedicated Category Archive Page.
              </p>
            </div>

            {/* Category Manager */}
            <div className="p-5 rounded-2xl border border-white/10 bg-[#151515] space-y-3">
              <h2 className="font-serif-display text-xl font-semibold text-white">
                Portfolio Categories ({categories.length})
              </h2>
              <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name (e.g. Aerial Drone, Convocation, Bridal Shower)"
                  maxLength={80}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Category</span>
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#080808] border border-white/10 text-xs text-zinc-200"
                  >
                    <span>{cat.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-zinc-500 hover:text-red-400 cursor-pointer"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload / Edit Form with Single & Multi-Photo Batch Upload */}
            <form
              id="portfolio-editor"
              onSubmit={handleSavePortfolioItem}
              className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#151515] space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-white">
                    {editingPortfolioId
                      ? 'Edit Portfolio Work'
                      : 'Upload Client Photographs or Videos'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Client images are automatically preserved in full uncropped aspect ratio so faces, crowns, and attire are 100% seen.
                  </p>
                </div>

                {/* Multi-Photo Batch Upload Trigger for 100+ pictures */}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer">
                    <Layers className="w-4 h-4" />
                    <span>
                      {batchUploading
                        ? 'Uploading Batch...'
                        : `Batch Upload Multiple Photos to "${portCategory}"`}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={batchUploading}
                      className="hidden"
                      onChange={(e) => handleBatchPhotoUpload(e.target.files)}
                    />
                  </label>

                  {editingPortfolioId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPortfolioId(null);
                        setPortTitle('');
                        setPortDesc('');
                      }}
                      className="px-3 py-2 rounded-lg bg-white/10 text-xs text-zinc-200 hover:text-white cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left Form Fields */}
                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        Work Title *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={150}
                        value={portTitle}
                        onChange={(e) => setPortTitle(e.target.value)}
                        placeholder="e.g. Royal White Wedding in Ota"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5">
                          Category *
                        </label>
                        <select
                          value={portCategory}
                          onChange={(e) => setPortCategory(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5">
                          Media Type *
                        </label>
                        <select
                          value={portMediaType}
                          onChange={(e) =>
                            setPortMediaType(e.target.value as 'photo' | 'video')
                          }
                          className="w-full px-3 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                        >
                          <option value="photo">Photograph</option>
                          <option value="video">Event Video</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      {portMediaType === 'video'
                        ? 'Video URL (YouTube, Vimeo, MP4 Link) or Upload Video File *'
                        : 'Photograph URL or Upload From Device *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={portMediaUrl}
                      onChange={(e) => {
                        setPortMediaUrl(e.target.value);
                        if (portMediaType === 'photo') {
                          setPortThumbUrl(e.target.value);
                        }
                      }}
                      placeholder={
                        portMediaType === 'video'
                          ? 'https://www.youtube.com/watch?v=... or upload video below'
                          : 'Paste image URL or upload from device below'
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                    />

                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF70]/15 border border-[#D4AF70]/40 hover:bg-[#D4AF70]/25 text-xs font-medium text-[#D4AF70] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Single Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const { vaultUrl } = await processUploadedImageFile(file);
                              if (portMediaType === 'photo') {
                                setPortMediaUrl(vaultUrl);
                              }
                              setPortThumbUrl(vaultUrl);
                              if (!portTitle.trim()) {
                                setPortTitle(
                                  file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')
                                );
                              }
                              showMessage(
                                'success',
                                'Full-resolution client image uploaded without cropping!'
                              );
                            } catch {
                              showMessage('error', 'Could not read image file.');
                            }
                          }}
                        />
                      </label>

                      {portMediaType === 'video' && (
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 hover:border-[#D4AF70] text-xs font-medium text-white cursor-pointer">
                          <Film className="w-3.5 h-3.5 text-[#D4AF70]" />
                          <span>Upload Video File (MP4/WebM)</span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const { videoVaultUrl, thumbVaultUrl } =
                                  await processUploadedVideoFile(file);
                                setPortMediaUrl(videoVaultUrl);
                                if (thumbVaultUrl) setPortThumbUrl(thumbVaultUrl);
                                showMessage('success', 'Video file uploaded and ready!');
                              } catch {
                                showMessage('error', 'Could not process video file.');
                              }
                            }}
                          />
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setPortMediaUrl(GENERATED_ASSETS.weddingLuxury);
                          setPortThumbUrl(GENERATED_ASSETS.weddingLuxury);
                        }}
                        className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                      >
                        Preset: Wedding
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPortMediaUrl(GENERATED_ASSETS.traditionalCeremony);
                          setPortThumbUrl(GENERATED_ASSETS.traditionalCeremony);
                        }}
                        className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                      >
                        Preset: Traditional
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPortMediaUrl(GENERATED_ASSETS.studioPortrait);
                          setPortThumbUrl(GENERATED_ASSETS.studioPortrait);
                        }}
                        className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                      >
                        Preset: Studio Portrait
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        Camera / Cinema Metadata
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={portExif}
                        onChange={(e) => setPortExif(e.target.value)}
                        placeholder="e.g. 85mm f/1.2 · ISO 160"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        Client / Event Credit
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={portClient}
                        onChange={(e) => setPortClient(e.target.value)}
                        placeholder="e.g. Tolu & Babajide"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Portfolio Story &amp; Description *
                    </label>
                    <textarea
                      rows={2}
                      required
                      maxLength={1000}
                      value={portDesc}
                      onChange={(e) => setPortDesc(e.target.value)}
                      placeholder="Describe the story, lighting, and atmosphere captured..."
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF70]"
                    />
                  </div>
                </div>

                {/* Right Live Preview Card (Full Uncropped Preview) */}
                <div className="md:col-span-4 space-y-3">
                  <span className="block text-xs text-zinc-400">
                    Live Front-Page Card Preview (Full Image Seen)
                  </span>
                  <div className="rounded-xl overflow-hidden border border-white/15 bg-[#080808]">
                    <div className="h-48 relative bg-[#0A0A0A]">
                      <ResilientImage
                        src={portThumbUrl || portMediaUrl}
                        alt={portTitle || 'Preview'}
                        fit="studio-full"
                        className="w-full h-full"
                      />
                      <span className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded bg-black/80 text-[11px] text-[#D4AF70]">
                        {portCategory} · {portMediaType.toUpperCase()}
                      </span>
                    </div>
                    <div className="p-3.5">
                      <p className="font-serif-display text-base font-semibold text-white truncate">
                        {portTitle || 'Project Title Preview'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                        {portDesc || 'Your project description will appear here.'}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={portFeatured}
                      onChange={(e) => setPortFeatured(e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF70]"
                    />
                    <span>Show in Front-Page Preview (Featured)</span>
                  </label>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {editingPortfolioId ? 'Save Portfolio Changes' : 'Publish to Portfolio'}
                    </span>
                  </button>
                </div>
              </div>
            </form>

            {/* Filter & Search Bar for Existing Portfolio */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={portfolioSearch}
                  onChange={(e) => setPortfolioSearch(e.target.value)}
                  placeholder="Search portfolio items by title, category, or client..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#151515] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D4AF70]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#151515] border border-white/10 rounded-xl overflow-x-auto">
                {['All', 'Featured', 'Videos', ...categories.map((c) => c.name)].map(
                  (filterName) => (
                    <button
                      key={filterName}
                      onClick={() => setPortfolioFilterCat(filterName)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        portfolioFilterCat === filterName
                          ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {filterName}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Portfolio Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredAdminPortfolio.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-[#151515] overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 bg-[#080808]">
                      <ResilientImage
                        src={item.thumbnailUrl || item.mediaUrl}
                        alt={item.title}
                        fit="studio-full"
                        className="w-full h-full"
                      />
                      <div className="absolute top-2.5 left-2.5 z-20 bg-[#080808]/85 px-2.5 py-1 rounded text-[11px] text-[#D4AF70] flex items-center gap-1">
                        {item.mediaType === 'video' ? (
                          <Film className="w-3 h-3" />
                        ) : (
                          <Camera className="w-3 h-3" />
                        )}
                        <span>{item.category}</span>
                      </div>
                    </div>

                    <div className="p-3.5">
                      <h3 className="font-serif-display text-lg font-semibold text-white line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                      {item.clientName && (
                        <p className="text-[11px] text-zinc-500 mt-1.5">
                          Client: {item.clientName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 border-t border-white/10 flex items-center justify-between gap-2 bg-[#0d0d0d]">
                    <button
                      onClick={() => handleTogglePortfolioFeatured(item)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                        item.featured
                          ? 'bg-[#D4AF70]/15 text-[#D4AF70]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Star
                        className={`w-3 h-3 ${item.featured ? 'fill-[#D4AF70]' : ''}`}
                      />
                      <span>{item.featured ? 'Front Page' : 'Archive Only'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPortfolioId(item.id);
                          setPortTitle(item.title);
                          setPortDesc(item.description);
                          setPortCategory(item.category);
                          setPortMediaType(item.mediaType);
                          setPortMediaUrl(item.mediaUrl);
                          setPortThumbUrl(item.thumbnailUrl);
                          setPortFeatured(item.featured);
                          setPortExif(item.exifInfo || '');
                          setPortClient(item.clientName || '');
                          document
                            .getElementById('portfolio-editor')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-200 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePortfolioItem(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 cursor-pointer"
                        aria-label="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DEDICATED CINEMATIC VIDEO SHOWCASE & FEATURED FILM REELS MANAGER */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                Cinematic Video Showcase &amp; Featured Film Reels Manager
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Upload event videos from your device or link YouTube/Vimeo/MP4 films, set the main showcase video, and reorder Featured Film Reels.
              </p>
            </div>

            <form
              id="video-showcase-editor"
              onSubmit={handleSaveVideoReel}
              className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#151515] space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="font-serif-display text-2xl font-semibold text-white">
                  {editingVideoId
                    ? 'Edit Featured Film Reel'
                    : 'Add New Film to Cinematic Video Showcase'}
                </h2>
                {editingVideoId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVideoId(null);
                      setVidTitle('');
                      setVidDesc('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-zinc-200 hover:text-white cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Film Reel Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={vidTitle}
                        onChange={(e) => setVidTitle(e.target.value)}
                        placeholder="e.g. Vows in Motion: Royal Wedding Film"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Film Category *
                      </label>
                      <select
                        value={vidCategory}
                        onChange={(e) => setVidCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                      >
                        <option value="Videography">Videography</option>
                        {categories
                          .filter((c) => c.name !== 'Videography')
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Video Source (YouTube, Vimeo, MP4 URL, or Upload Video File) *
                    </label>
                    <input
                      type="text"
                      required
                      value={vidUrl}
                      onChange={(e) => setVidUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or MP4 link"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF70]/15 border border-[#D4AF70]/40 hover:bg-[#D4AF70]/25 text-xs font-medium text-[#D4AF70] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {videoUploading
                            ? 'Processing Video...'
                            : 'Upload Video File (MP4/WebM/MOV)'}
                        </span>
                        <input
                          type="file"
                          accept="video/*"
                          disabled={videoUploading}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setVideoUploading(true);
                            try {
                              const { videoVaultUrl, thumbVaultUrl } =
                                await processUploadedVideoFile(file);
                              setVidUrl(videoVaultUrl);
                              if (thumbVaultUrl) setVidThumbUrl(thumbVaultUrl);
                              if (!vidTitle.trim()) {
                                setVidTitle(
                                  file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')
                                );
                              }
                              showMessage(
                                'success',
                                'Video uploaded with automatic thumbnail frame!'
                              );
                            } catch {
                              showMessage('error', 'Failed to upload video file.');
                            } finally {
                              setVideoUploading(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Video Thumbnail Cover Image (URL or Upload) *
                    </label>
                    <input
                      type="text"
                      value={vidThumbUrl}
                      onChange={(e) => setVidThumbUrl(e.target.value)}
                      placeholder="Thumbnail cover URL"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-zinc-200 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom Cover Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const { vaultUrl } = await processUploadedImageFile(file);
                              setVidThumbUrl(vaultUrl);
                              showMessage('success', 'Video cover thumbnail uploaded!');
                            } catch {
                              showMessage('error', 'Could not read cover image.');
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Cinema Specs / Duration
                      </label>
                      <input
                        type="text"
                        value={vidExif}
                        onChange={(e) => setVidExif(e.target.value)}
                        placeholder="e.g. ARRI Alexa · 4K 60fps"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Client / Event Name
                      </label>
                      <input
                        type="text"
                        value={vidClient}
                        onChange={(e) => setVidClient(e.target.value)}
                        placeholder="e.g. Zainab & Damilola"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Film Synopsis / Description *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={vidDesc}
                      onChange={(e) => setVidDesc(e.target.value)}
                      placeholder="Describe the storyline, audio, and cinematography..."
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                </div>

                {/* Right Live Video Player Preview */}
                <div className="lg:col-span-5 space-y-3">
                  <span className="block text-xs text-zinc-400">
                    Live Showcase Player Preview
                  </span>
                  <div className="rounded-xl overflow-hidden border border-white/15 bg-[#080808]">
                    <div className="aspect-video bg-black relative">
                      {previewVideoSource.type === 'iframe' ? (
                        <iframe
                          src={previewVideoSource.src}
                          title={vidTitle || 'Video preview'}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          key={previewVideoSource.src}
                          src={previewVideoSource.src}
                          controls
                          playsInline
                          className="w-full h-full object-contain bg-black"
                        />
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="font-serif-display text-lg font-semibold text-white truncate">
                        {vidTitle || 'Film Reel Preview'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                        {vidDesc || 'Film description preview...'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    <span>
                      {editingVideoId
                        ? 'Update Featured Film Reel'
                        : 'Publish to Cinematic Video Showcase'}
                    </span>
                  </button>
                </div>
              </div>
            </form>

            {/* Active Featured Film Reels Playlist Control */}
            <div className="rounded-2xl border border-white/10 bg-[#151515] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif-display text-2xl font-semibold text-white">
                    Active Featured Film Reels ({videoProjects.length})
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Reel #1 automatically loads as the main stage film in the Cinematic Video Showcase. Use the controls below to reorder, set lead film, edit, or delete.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {videoProjects.map((vid, idx) => (
                  <div
                    key={vid.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      idx === 0
                        ? 'border-[#D4AF70] bg-[#080808]'
                        : 'border-white/10 bg-[#080808]/70'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-28 h-20 rounded-lg overflow-hidden shrink-0 bg-[#111] border border-white/10">
                        <ResilientImage
                          src={vid.thumbnailUrl || vid.mediaUrl}
                          alt={vid.title}
                          fit="studio-full"
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                          <Play className="w-4 h-4 text-[#D4AF70] fill-current" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-[#D4AF70]/20 text-[#D4AF70] font-mono-tabular font-semibold">
                            Reel #{idx + 1} {idx === 0 ? '· LEAD SHOWCASE FILM' : ''}
                          </span>
                          <span className="text-zinc-400">{vid.category}</span>
                          {vid.clientName && (
                            <span className="text-zinc-500">· {vid.clientName}</span>
                          )}
                        </div>
                        <h3 className="font-serif-display text-xl font-semibold text-white">
                          {vid.title}
                        </h3>
                        <p className="text-xs text-zinc-400 line-clamp-1">
                          {vid.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {idx > 0 && (
                        <button
                          onClick={() => handleSetMainShowcaseVideo(vid.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                        >
                          Set as Lead Film
                        </button>
                      )}
                      <button
                        onClick={() => handleMoveVideoOrder(vid.id, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveVideoOrder(vid.id, 'down')}
                        disabled={idx === videoProjects.length - 1}
                        className="p-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingVideoId(vid.id);
                          setVidTitle(vid.title);
                          setVidDesc(vid.description);
                          setVidCategory(vid.category);
                          setVidUrl(vid.mediaUrl);
                          setVidThumbUrl(vid.thumbnailUrl);
                          setVidExif(vid.exifInfo || '');
                          setVidClient(vid.clientName || '');
                          setVidFeatured(vid.featured);
                          document
                            .getElementById('video-showcase-editor')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePortfolioItem(vid.id)}
                        className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-red-400 cursor-pointer"
                        title="Delete Film Reel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SERVICES MANAGER */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                Services &amp; Packages Manager
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Add, edit, upload cover photos for, or reorder CAREMEDIA photography and videography services.
              </p>
            </div>

            <form
              id="service-editor"
              onSubmit={handleSaveService}
              className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#151515] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-2xl font-semibold text-white">
                  {editingServiceId ? 'Edit Service Package' : 'Add New Service Package'}
                </h2>
                {editingServiceId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingServiceId(null);
                      setSrvTitle('');
                      setSrvDesc('');
                    }}
                    className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs text-zinc-400 mb-1">Service Title *</label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={srvTitle}
                    onChange={(e) => setSrvTitle(e.target.value)}
                    placeholder="e.g. Wedding Photography & Videography"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={srvOrder}
                    onChange={(e) => setSrvOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Cover Image URL or Upload *
                  </label>
                  <input
                    type="text"
                    required
                    value={srvImage}
                    onChange={(e) => setSrvImage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                  <label className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded bg-[#D4AF70]/15 border border-[#D4AF70]/40 text-xs text-[#D4AF70] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Cover Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { vaultUrl } = await processUploadedImageFile(file);
                          setSrvImage(vaultUrl);
                          showMessage('success', 'Service cover image uploaded!');
                        } catch {
                          showMessage('error', 'Could not read image.');
                        }
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Key Deliverables (separated by ·) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={srvDeliverables}
                    onChange={(e) => setSrvDeliverables(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Service Description *</label>
                <textarea
                  rows={2}
                  required
                  maxLength={1000}
                  value={srvDesc}
                  onChange={(e) => setSrvDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                >
                  {editingServiceId ? 'Save Service Changes' : 'Add Service Package'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-2xl border border-white/10 bg-[#151515] flex flex-col sm:flex-row items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-[#080808] border border-white/10">
                      <ResilientImage
                        src={srv.imageUrl}
                        alt={srv.title}
                        fit="studio-full"
                        className="w-full h-full"
                      />
                    </div>
                    <div>
                      <span className="font-mono-tabular text-xs text-[#D4AF70]">
                        #{String(srv.orderIndex).padStart(2, '0')}
                      </span>
                      <h3 className="font-serif-display text-xl font-semibold text-white">
                        {srv.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {srv.description}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1.5">{srv.deliverables}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button
                      onClick={() => {
                        setEditingServiceId(srv.id);
                        setSrvTitle(srv.title);
                        setSrvDesc(srv.description);
                        setSrvImage(srv.imageUrl);
                        setSrvDeliverables(srv.deliverables);
                        setSrvOrder(srv.orderIndex);
                        document
                          .getElementById('service-editor')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="p-2 text-zinc-400 hover:text-red-400 cursor-pointer"
                      aria-label="Delete service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: TESTIMONIALS MODERATION (Row of 5 Control) */}
        {activeTab === 'testimonials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                  Verified Customer Reviews Manager (Row of 5)
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Add, edit, reorder, approve, or unpublish reviews displayed in the compact 5-card row on the public website.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingTestimonialId(null);
                  setTestName('');
                  setTestRole('Wedding Client · Ota');
                  setTestReview('');
                  setTestRating(5);
                  setTestPhoto(GENERATED_ASSETS.weddingLuxury);
                  setShowAddTestimonial(!showAddTestimonial);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {showAddTestimonial && !editingTestimonialId
                    ? 'Close Form'
                    : 'Add Verified Review'}
                </span>
              </button>
            </div>

            {(showAddTestimonial || editingTestimonialId) && (
              <form
                id="testimonial-editor"
                onSubmit={handleSaveAdminTestimonial}
                className="p-5 sm:p-6 rounded-2xl border border-[#D4AF70]/40 bg-[#151515] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-serif-display text-2xl font-semibold text-white">
                    {editingTestimonialId
                      ? 'Edit Verified Customer Review'
                      : 'Add & Publish Verified Customer Review'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTestimonial(false);
                      setEditingTestimonialId(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      placeholder="e.g. Funke & Ayo Balogun"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Event / Role *</label>
                    <input
                      type="text"
                      required
                      value={testRole}
                      onChange={(e) => setTestRole(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Star Rating</label>
                    <select
                      value={testRating}
                      onChange={(e) => setTestRating(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    >
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={2}>2 Stars</option>
                      <option value={1}>1 Star</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Client Photograph (URL or Upload From Device)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <input
                      type="text"
                      value={testPhoto}
                      onChange={(e) => setTestPhoto(e.target.value)}
                      placeholder="https://... or upload photo"
                      className="flex-1 w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4AF70]/15 border border-[#D4AF70]/40 text-xs font-medium text-[#D4AF70] cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Client Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { vaultUrl } = await processUploadedImageFile(file);
                            setTestPhoto(vaultUrl);
                            showMessage('success', 'Customer photo uploaded!');
                          } catch {
                            showMessage('error', 'Could not read image.');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Customer Review *</label>
                  <textarea
                    rows={3}
                    required
                    value={testReview}
                    onChange={(e) => setTestReview(e.target.value)}
                    placeholder="Enter the client's testimonial..."
                    className="w-full px-3.5 py-2 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTestimonial(false);
                      setEditingTestimonialId(null);
                    }}
                    className="px-4 py-2 text-xs text-zinc-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#D4AF70] text-[#080808] text-xs font-semibold cursor-pointer"
                  >
                    {editingTestimonialId ? 'Save Review Changes' : 'Publish to Row of 5'}
                  </button>
                </div>
              </form>
            )}

            {/* Live Preview of Public Row of 5 */}
            <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#111111] space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#D4AF70]">
                  Live Front-Page Preview: Row of 5 Verified Customer Reviews
                </h2>
                <span className="text-xs text-zinc-400">
                  Showing first 5 approved reviews
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {testimonials
                  .filter((t) => t.approved)
                  .slice(0, 5)
                  .map((t, i) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-white/10 bg-[#080808] flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono-tabular text-[#D4AF70]">
                            Slot #{i + 1}
                          </span>
                          <div className="flex items-center gap-0.5 text-[#D4AF70]">
                            {Array.from({ length: t.rating }).map((_, s) => (
                              <Star key={s} className="w-2.5 h-2.5 fill-[#D4AF70]" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-300 italic line-clamp-3">
                          &ldquo;{t.review}&rdquo;
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[#151515] border border-white/10">
                          <ResilientImage
                            src={t.photoUrl || GENERATED_ASSETS.weddingLuxury}
                            alt={t.customerName}
                            fit="studio-full"
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {t.customerName}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {t.roleOrEvent}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-[#151515] border border-white/10 rounded-xl w-fit">
              {[
                { id: 'all', label: `All (${testimonials.length})` },
                { id: 'pending', label: `Pending (${pendingReviewsCount})` },
                { id: 'approved', label: `Approved (${approvedReviewsCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setTestimonialFilter(tab.id as 'all' | 'pending' | 'approved')
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    testimonialFilter === tab.id
                      ? 'bg-[#D4AF70] text-[#080808] font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredAdminTestimonials.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#151515] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#080808] border border-white/10">
                      <ResilientImage
                        src={t.photoUrl || GENERATED_ASSETS.weddingLuxury}
                        alt={t.customerName}
                        fit="studio-full"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="font-semibold text-white text-sm">
                          {t.customerName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t.roleOrEvent}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#D4AF70] font-mono-tabular">
                          {t.rating} / 5 Stars
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            t.approved
                              ? 'text-emerald-400 font-semibold'
                              : 'text-amber-400 font-semibold'
                          }
                        >
                          {t.approved ? 'Approved (In Row of 5)' : 'Pending Approval'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 italic">
                        &ldquo;{t.review}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleMoveTestimonialOrder(t.id, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move earlier in Row of 5"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveTestimonialOrder(t.id, 'down')}
                      disabled={idx === filteredAdminTestimonials.length - 1}
                      className="p-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move later in Row of 5"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingTestimonialId(t.id);
                        setTestName(t.customerName);
                        setTestRole(t.roleOrEvent);
                        setTestReview(t.review);
                        setTestRating(t.rating);
                        setTestPhoto(t.photoUrl || GENERATED_ASSETS.weddingLuxury);
                        setShowAddTestimonial(true);
                        document
                          .getElementById('testimonial-editor')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleTestimonialApproval(t)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        t.approved
                          ? 'bg-white/10 text-zinc-200 hover:bg-white/20'
                          : 'bg-[#D4AF70] text-[#080808] hover:bg-[#e2c186]'
                      }`}
                    >
                      {t.approved ? 'Unpublish' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDeleteTestimonial(t.id)}
                      className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-red-400 cursor-pointer"
                      aria-label="Delete testimonial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: WEBSITE CONTENT SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSiteSettings} className="space-y-6 max-w-3xl">
            <div>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                Website Content &amp; Brand Settings
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Update CAREMEDIA hero headlines, slogan, About Us story, phone number, WhatsApp, and studio address.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#151515] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Brand Name / Hero Title
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={settingsForm.heroTitle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, heroTitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Studio Location
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={settingsForm.location}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, location: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Brand Slogan</label>
                <input
                  type="text"
                  required
                  maxLength={250}
                  value={settingsForm.slogan}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, slogan: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Hero Lead Subtitle
                </label>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={settingsForm.heroSubtitle}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  About CAREMEDIA Narrative
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={3000}
                  value={settingsForm.aboutText}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, aboutText: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Primary Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={settingsForm.phone}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, phone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    International WhatsApp Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={settingsForm.whatsapp}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, whatsapp: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#080808] border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsForm(DEFAULT_SITE_SETTINGS);
                    onUpdateSiteSettings(DEFAULT_SITE_SETTINGS);
                    showMessage('success', 'Restored default website copy.');
                  }}
                  className="px-4 py-2.5 rounded-lg border border-white/15 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                >
                  Reset to Default Copy
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#D4AF70] text-[#080808] text-xs font-semibold hover:bg-[#e2c186] cursor-pointer"
                >
                  Save &amp; Publish Website Content
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
