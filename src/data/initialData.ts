import heroStudioImg from '../assets/images/hero_cinematic_studio_1794304124634.jpg';
import aboutPhotographerImg from '../assets/images/about_photographer_work_1794304125647.jpg';
import weddingLuxuryImg from '../assets/images/portfolio_wedding_luxury_1794304126095.jpg';
import traditionalCeremonyImg from '../assets/images/portfolio_traditional_ceremony_1794304126449.jpg';
import studioPortraitImg from '../assets/images/portfolio_studio_portrait_1794304127416.jpg';

export const GENERATED_ASSETS = {
  heroStudio: heroStudioImg,
  aboutPhotographer: aboutPhotographerImg,
  weddingLuxury: weddingLuxuryImg,
  traditionalCeremony: traditionalCeremonyImg,
  studioPortrait: studioPortraitImg,
};

export interface PortfolioItemData {
  id: string;
  title: string;
  description: string;
  category: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  thumbnailUrl: string;
  featured: boolean;
  exifInfo: string;
  clientName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

export interface ServiceItemData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  deliverables: string;
  orderIndex: number;
}

export interface BookingData {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
  serviceRequired: string;
  additionalInfo: string;
  status: 'pending' | 'confirmed' | 'declined' | 'completed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TestimonialData {
  id: string;
  customerName: string;
  roleOrEvent: string;
  review: string;
  rating: number;
  photoUrl: string;
  approved: boolean;
  createdAt?: unknown;
}

export interface SiteSettingsData {
  heroTitle: string;
  slogan: string;
  heroSubtitle: string;
  aboutText: string;
  phone: string;
  whatsapp: string;
  location: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  heroTitle: 'CAREMEDIA',
  slogan: 'Capturing Moments. Creating Memories. Telling Stories.',
  heroSubtitle: 'Professional Photography & Videography Services in Ota, Ogun State & Across Nigeria.',
  aboutText:
    'At CAREMEDIA, we believe every moment has a story worth preserving. We specialise in capturing beautiful memories through professional photography and cinematic videography. From intimate celebrations to grand events and corporate productions, we are committed to delivering exceptional visual experiences that last a lifetime.',
  phone: '08063751294',
  whatsapp: '+2348063751294',
  location: 'Ota, Ogun State, Nigeria',
};

export const DEFAULT_CATEGORIES: CategoryData[] = [
  { id: 'cat_weddings', name: 'Weddings', slug: 'weddings' },
  { id: 'cat_birthdays', name: 'Birthdays', slug: 'birthdays' },
  { id: 'cat_traditional', name: 'Traditional Ceremonies', slug: 'traditional-ceremonies' },
  { id: 'cat_corporate', name: 'Corporate Events', slug: 'corporate-events' },
  { id: 'cat_portraits', name: 'Portraits', slug: 'portraits' },
  { id: 'cat_outdoor', name: 'Outdoor Photography', slug: 'outdoor-photography' },
  { id: 'cat_videography', name: 'Videography', slug: 'videography' },
];

export const DEFAULT_SERVICES: ServiceItemData[] = [
  {
    id: 'srv_1',
    title: 'Wedding Photography & Videography',
    description:
      'Full-day luxury bridal and reception storytelling with multi-camera 4K cinema rigs, aerial drone coverage, and heirloom fine-art photo books.',
    imageUrl: weddingLuxuryImg,
    deliverables: '4K Feature Film · 600+ Master Stills · Drone Aerials · Luxury Album',
    orderIndex: 1,
  },
  {
    id: 'srv_2',
    title: 'Birthday Photography & Video Coverage',
    description:
      'Editorial milestone birthday portraits and vibrant party coverage capturing every toast, entrance, and celebration in crisp cinema quality.',
    imageUrl: studioPortraitImg,
    deliverables: 'Studio Pre-Shoot · Event Coverage · Highlight Reel · Retouched Gallery',
    orderIndex: 2,
  },
  {
    id: 'srv_3',
    title: 'Traditional Marriage Ceremonies',
    description:
      'Authentic cultural storytelling honouring rich Nigerian heritage, royal Aso-Oke attire, family rites, and vibrant traditional festivities.',
    imageUrl: traditionalCeremonyImg,
    deliverables: 'Cultural Documentary · Family Portraits · Same-Day Edit · Full Gallery',
    orderIndex: 3,
  },
  {
    id: 'srv_4',
    title: 'Corporate Event Coverage',
    description:
      'Executive conferences, gala dinners, product launches, and brand summits documented with broadcast-ready precision and rapid turnaround.',
    imageUrl: heroStudioImg,
    deliverables: 'Keynote Stills · Press Kit Delivery · Executive Interviews · Event Recap Film',
    orderIndex: 4,
  },
  {
    id: 'srv_5',
    title: 'Church and Religious Event Coverage',
    description:
      'Multi-camera live production, crusades, conventions, thanksgivings, and sacred celebrations captured with reverence and acoustic clarity.',
    imageUrl: heroStudioImg,
    deliverables: 'Multi-Cam Switching · Worship Highlights · Congregation Stills · Full Archive',
    orderIndex: 5,
  },
  {
    id: 'srv_6',
    title: 'Graduation Photography',
    description:
      'Celebrate academic excellence with distinguished convocation portraits, family sessions, and campus editorial shoots.',
    imageUrl: studioPortraitImg,
    deliverables: 'Studio & Campus Session · Framed Prints · Digital High-Res Collection',
    orderIndex: 6,
  },
  {
    id: 'srv_7',
    title: 'Portrait and Studio Photography',
    description:
      'Sculpted studio lighting and medium-format clarity for executive headshots, family portraits, fashion lookbooks, and personal branding.',
    imageUrl: studioPortraitImg,
    deliverables: 'Bespoke Lighting Setup · Wardrobe Consultation · Magazine-Grade Retouching',
    orderIndex: 7,
  },
  {
    id: 'srv_8',
    title: 'Outdoor Photography',
    description:
      'Golden-hour location sessions across scenic Nigerian landscapes, architectural landmarks, and botanical gardens.',
    imageUrl: weddingLuxuryImg,
    deliverables: 'Location Scouting · Natural & Off-Camera Flash · Fine-Art Color Grading',
    orderIndex: 8,
  },
  {
    id: 'srv_9',
    title: 'Product and Brand Photography',
    description:
      'High-conversion commercial imagery for luxury fashion, cosmetics, culinary brands, and e-commerce campaigns.',
    imageUrl: aboutPhotographerImg,
    deliverables: 'Macro Detail Shots · Creative Set Design · Commercial Licensing',
    orderIndex: 9,
  },
  {
    id: 'srv_10',
    title: 'Documentary and Event Filming',
    description:
      'Narrative-driven documentary production, cinema interviews, behind-the-scenes stories, and brand legacy films.',
    imageUrl: aboutPhotographerImg,
    deliverables: 'Cinema Camera Package · Master Audio · Color-Graded 4K Master',
    orderIndex: 10,
  },
];

export const DEFAULT_PORTFOLIO_ITEMS: PortfolioItemData[] = [
  {
    id: 'port_1',
    title: 'The Royal Lagos & Ota White Wedding Symphony',
    description:
      'An unforgettable evening of crystal chandeliers, bespoke bridal couture, and emotional vows captured in full-frame editorial detail.',
    category: 'Weddings',
    mediaType: 'photo',
    mediaUrl: weddingLuxuryImg,
    thumbnailUrl: weddingLuxuryImg,
    featured: true,
    exifInfo: '85mm f/1.2 · ISO 160 · 1/250s',
    clientName: 'Tolu & Babajide',
  },
  {
    id: 'port_2',
    title: 'Crowns of Gold: Yoruba Traditional Engagement',
    description:
      'Handwoven champagne gold Aso-Oke and royal coral beads photographed with rich studio strobes and warm skin-tone color science.',
    category: 'Traditional Ceremonies',
    mediaType: 'photo',
    mediaUrl: traditionalCeremonyImg,
    thumbnailUrl: traditionalCeremonyImg,
    featured: true,
    exifInfo: '50mm f/1.4 · Profoto B10X · ISO 100',
    clientName: 'Adesuwa & Olumide',
  },
  {
    id: 'port_3',
    title: 'Executive Presence: Charcoal Studio Monochrome & Gold',
    description:
      'Sculpted three-point studio portrait session crafted for C-suite leadership and luxury personal branding.',
    category: 'Portraits',
    mediaType: 'photo',
    mediaUrl: studioPortraitImg,
    thumbnailUrl: studioPortraitImg,
    featured: true,
    exifInfo: '105mm Macro · f/2.8 · ISO 64',
    clientName: 'Chidinma Okafor',
  },
  {
    id: 'port_4',
    title: 'Grand Ballroom Cinema Production',
    description:
      'Cinematic multi-cam gimbal tracking during a black-tie gala and luxury celebration in Ogun State.',
    category: 'Corporate Events',
    mediaType: 'photo',
    mediaUrl: heroStudioImg,
    thumbnailUrl: heroStudioImg,
    featured: true,
    exifInfo: '35mm Cinema Prime · T1.5 · 4K DCI',
    clientName: 'Meridian Holdings Gala',
  },
  {
    id: 'port_5',
    title: 'Behind the Lens: Commercial Film Direction',
    description:
      'Precision cinema rig operation and studio lighting choreography for commercial brand storytelling.',
    category: 'Outdoor Photography',
    mediaType: 'photo',
    mediaUrl: aboutPhotographerImg,
    thumbnailUrl: aboutPhotographerImg,
    featured: false,
    exifInfo: '24-70mm f/2.8 · Golden Hour · ISO 200',
    clientName: 'CAREMEDIA Originals',
  },
  {
    id: 'port_6',
    title: 'Golden Jubilee Milestone Celebration',
    description:
      'Editorial portrait and grand reception coverage for a 50th birthday celebration surrounded by family and dignitaries.',
    category: 'Birthdays',
    mediaType: 'photo',
    mediaUrl: studioPortraitImg,
    thumbnailUrl: studioPortraitImg,
    featured: false,
    exifInfo: '85mm f/1.4 · Studio Strobe · ISO 100',
    clientName: 'Chief Mrs. Folake Adeyemi',
  },
  {
    id: 'port_7',
    title: 'Vows in Motion: The Royal Wedding Feature Film',
    description:
      'A sweeping cinematic wedding highlight film combining aerial drone cinematography, emotional vows, and vibrant reception energy.',
    category: 'Videography',
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: weddingLuxuryImg,
    featured: true,
    exifInfo: 'ARRI Alexa Mini · 4K 60fps · Anamorphic',
    clientName: 'Zainab & Damilola',
  },
  {
    id: 'port_8',
    title: 'Heritage & Drums: Traditional Ceremony Cinema Reel',
    description:
      'Rich cultural rhythms, royal entrances, and ancestral blessings captured with cinema prime lenses and master sound design.',
    category: 'Videography',
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: traditionalCeremonyImg,
    featured: true,
    exifInfo: 'RED V-Raptor · 4K DCI · Master Audio',
    clientName: 'Ngozi & Kolawole',
  },
  {
    id: 'port_9',
    title: 'Visionaries: Corporate Brand & Event Documentary',
    description:
      'High-impact commercial documentary showcasing executive keynotes, production scale, and brand innovation across Nigeria.',
    category: 'Videography',
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: heroStudioImg,
    featured: true,
    exifInfo: 'Sony FX6 · 35mm T1.5 · Dolby Stereo',
    clientName: 'West Africa Leadership Summit',
  },
];

export const DEFAULT_TESTIMONIALS: TestimonialData[] = [
  {
    id: 'test_1',
    customerName: 'Tolu & Babajide Adesanya',
    roleOrEvent: 'Luxury White Wedding · Ota & Ikeja',
    review:
      'CAREMEDIA turned our wedding weekend into a cinema masterpiece. Every single photograph looks like a Vogue spread, and our highlight film still brings tears to our families’ eyes.',
    rating: 5,
    photoUrl: weddingLuxuryImg,
    approved: true,
  },
  {
    id: 'test_2',
    customerName: 'Engr. Olumide & Adesuwa',
    roleOrEvent: 'Traditional Marriage · Ogun State',
    review:
      'The way CAREMEDIA captured the colours of our champagne gold Aso-Oke and coral beads was extraordinary. They directed our extended family effortlessly and delivered ahead of schedule.',
    rating: 5,
    photoUrl: traditionalCeremonyImg,
    approved: true,
  },
  {
    id: 'test_3',
    customerName: 'Chidinma Okafor',
    roleOrEvent: 'Executive Portraits & Summit',
    review:
      'We commissioned CAREMEDIA for our executive board portraits and annual conference film. The studio lighting, composition, and audio clarity elevated our entire corporate brand.',
    rating: 5,
    photoUrl: studioPortraitImg,
    approved: true,
  },
  {
    id: 'test_4',
    customerName: 'Pastor & Mrs. Emmanuel Kalu',
    roleOrEvent: 'Church Convention & Anniversary',
    review:
      'Multi-camera live coverage and photography for our 3-day convention in Ota was flawless. Every worship moment and congregation portrait was delivered in crisp 4K.',
    rating: 5,
    photoUrl: heroStudioImg,
    approved: true,
  },
  {
    id: 'test_5',
    customerName: 'Chief Mrs. Folake Adeyemi',
    roleOrEvent: '50th Golden Jubilee Celebration',
    review:
      'From my studio birthday portrait session to the grand reception film, CAREMEDIA gave me royal treatment. Every guest complimented the crew’s professionalism and speed.',
    rating: 5,
    photoUrl: aboutPhotographerImg,
    approved: true,
  },
];

export function formatWhatsAppUrl(phoneInput: string, message: string): string {
  const cleanDigits = phoneInput.replace(/[^0-9]/g, '');
  const intlNumber = cleanDigits.startsWith('0')
    ? `234${cleanDigits.slice(1)}`
    : cleanDigits.startsWith('234')
    ? cleanDigits
    : '2348063751294';
  return `https://wa.me/${intlNumber}?text=${encodeURIComponent(message)}`;
}
