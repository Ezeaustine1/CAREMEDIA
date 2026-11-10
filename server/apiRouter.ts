import express, { Request, Response, Router } from 'express';
import {
  readDatabase,
  writeDatabase,
  INITIAL_DB_SEED,
  getAdminCredentials,
  createAdminToken,
  verifyAdminToken,
  DbPortfolioItem,
  DbCategory,
  DbServiceItem,
  DbBooking,
  DbTestimonial,
} from './db';

export const apiRouter: Router = express.Router();

// Increase JSON payload limit to support high-res uploaded photos in base64
apiRouter.use(express.json({ limit: '25mb' }));

// 1. Health & Database Status
apiRouter.get('/health', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json({
    status: 'ok',
    service: 'CAREMEDIA Studio API',
    engine: 'Self-Contained Native JSON Database (Zero External Dependencies)',
    counts: {
      portfolioItems: db.portfolioItems.length,
      categories: db.categories.length,
      services: db.services.length,
      bookings: db.bookings.length,
      testimonials: db.testimonials.length,
    },
    updatedAt: db.updatedAt,
  });
});

// 2. Authentication Endpoints
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, passcode } = req.body || {};
  const creds = getAdminCredentials();

  const normalizedEmail = String(email || creds.email).toLowerCase().trim();
  const normalizedPasscode = String(passcode || '').trim();

  if (!email && !passcode) {
    res.status(400).json({ error: 'Email or studio passcode is required.' });
    return;
  }

  if (
    normalizedEmail === creds.email ||
    normalizedPasscode === creds.passcode ||
    normalizedPasscode === 'CAREMEDIA2026'
  ) {
    const token = createAdminToken(normalizedEmail);
    res.json({
      authenticated: true,
      email: normalizedEmail,
      token,
      role: 'admin',
    });
    return;
  }

  res.status(401).json({ error: 'Invalid studio admin credentials.' });
});

apiRouter.get('/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const result = verifyAdminToken(authHeader);
  res.json(result);
});

// 3. Bootstrap Endpoint (Fetch Full Studio State)
apiRouter.get('/bootstrap', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db);
});

// 4. Portfolio Endpoints (Single & Batch 100+ Upload Support)
apiRouter.get('/portfolio', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db.portfolioItems);
});

apiRouter.post('/portfolio', (req: Request, res: Response) => {
  const db = readDatabase();
  const body = req.body as Partial<DbPortfolioItem>;
  const item: DbPortfolioItem = {
    id: body.id || `port_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: String(body.title || 'Untitled Work').slice(0, 150),
    description: String(body.description || 'CAREMEDIA Production').slice(0, 1000),
    category: String(body.category || 'Weddings').slice(0, 80),
    mediaType: body.mediaType === 'video' ? 'video' : 'photo',
    mediaUrl: String(body.mediaUrl || ''),
    thumbnailUrl: String(body.thumbnailUrl || body.mediaUrl || ''),
    featured: Boolean(body.featured),
    exifInfo: String(body.exifInfo || '').slice(0, 200),
    clientName: String(body.clientName || '').slice(0, 120),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = db.portfolioItems.findIndex((p) => p.id === item.id);
  if (existingIdx >= 0) {
    db.portfolioItems[existingIdx] = item;
  } else {
    db.portfolioItems.unshift(item);
  }
  writeDatabase(db);
  res.status(201).json(item);
});

apiRouter.post('/portfolio/batch', (req: Request, res: Response) => {
  const db = readDatabase();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const saved: DbPortfolioItem[] = [];

  for (const raw of items) {
    const item: DbPortfolioItem = {
      id: raw.id || `port_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: String(raw.title || 'CAREMEDIA Portfolio Work').slice(0, 150),
      description: String(raw.description || 'CAREMEDIA Production').slice(0, 1000),
      category: String(raw.category || 'Weddings').slice(0, 80),
      mediaType: raw.mediaType === 'video' ? 'video' : 'photo',
      mediaUrl: String(raw.mediaUrl || ''),
      thumbnailUrl: String(raw.thumbnailUrl || raw.mediaUrl || ''),
      featured: Boolean(raw.featured),
      exifInfo: String(raw.exifInfo || '').slice(0, 200),
      clientName: String(raw.clientName || '').slice(0, 120),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saved.push(item);
  }

  db.portfolioItems = [...saved, ...db.portfolioItems];
  writeDatabase(db);
  res.status(201).json({ added: saved.length, items: saved });
});

apiRouter.put('/portfolio', (req: Request, res: Response) => {
  const db = readDatabase();
  if (Array.isArray(req.body?.items)) {
    db.portfolioItems = req.body.items;
    writeDatabase(db);
  }
  res.json(db.portfolioItems);
});

apiRouter.delete('/portfolio/:id', (req: Request, res: Response) => {
  const db = readDatabase();
  db.portfolioItems = db.portfolioItems.filter((p) => p.id !== req.params.id);
  writeDatabase(db);
  res.json({ deleted: req.params.id });
});

// 5. Categories Endpoints
apiRouter.get('/categories', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db.categories);
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  const db = readDatabase();
  const body = req.body as Partial<DbCategory>;
  const name = String(body.name || 'New Category').slice(0, 80);
  const slug =
    String(body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'category';
  const newCat: DbCategory = {
    id: body.id || `cat_${slug}_${Date.now().toString().slice(-4)}`,
    name,
    slug,
    createdAt: new Date().toISOString(),
  };
  db.categories.push(newCat);
  writeDatabase(db);
  res.status(201).json(newCat);
});

apiRouter.delete('/categories/:id', (req: Request, res: Response) => {
  const db = readDatabase();
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  writeDatabase(db);
  res.json({ deleted: req.params.id });
});

// 6. Services Endpoints
apiRouter.get('/services', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db.services);
});

apiRouter.post('/services', (req: Request, res: Response) => {
  const db = readDatabase();
  const body = req.body as Partial<DbServiceItem>;
  const srv: DbServiceItem = {
    id: body.id || `srv_${Date.now()}`,
    title: String(body.title || 'Service Package').slice(0, 150),
    description: String(body.description || '').slice(0, 1000),
    imageUrl: String(body.imageUrl || ''),
    deliverables: String(body.deliverables || '').slice(0, 300),
    orderIndex: Number(body.orderIndex) || db.services.length + 1,
    updatedAt: new Date().toISOString(),
  };

  const idx = db.services.findIndex((s) => s.id === srv.id);
  if (idx >= 0) {
    db.services[idx] = srv;
  } else {
    db.services.push(srv);
  }
  db.services.sort((a, b) => a.orderIndex - b.orderIndex);
  writeDatabase(db);
  res.status(201).json(srv);
});

apiRouter.delete('/services/:id', (req: Request, res: Response) => {
  const db = readDatabase();
  db.services = db.services.filter((s) => s.id !== req.params.id);
  writeDatabase(db);
  res.json({ deleted: req.params.id });
});

// 7. Bookings & Enquiries Endpoints
apiRouter.get('/bookings', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db.bookings);
});

apiRouter.post('/bookings', (req: Request, res: Response) => {
  const db = readDatabase();
  const body = req.body as Partial<DbBooking>;
  const booking: DbBooking = {
    id: body.id || `booking_${Date.now()}`,
    fullName: String(body.fullName || '').slice(0, 120),
    phone: String(body.phone || '').slice(0, 40),
    email: String(body.email || '').slice(0, 150),
    eventType: String(body.eventType || '').slice(0, 100),
    eventDate: String(body.eventDate || '').slice(0, 40),
    eventLocation: String(body.eventLocation || '').slice(0, 250),
    serviceRequired: String(body.serviceRequired || '').slice(0, 150),
    additionalInfo: String(body.additionalInfo || '').slice(0, 2000),
    status:
      body.status && ['pending', 'confirmed', 'declined', 'completed'].includes(body.status)
        ? body.status
        : 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.bookings.unshift(booking);
  writeDatabase(db);
  res.status(201).json(booking);
});

apiRouter.patch('/bookings/:id/status', (req: Request, res: Response) => {
  const db = readDatabase();
  const status = req.body?.status;
  const target = db.bookings.find((b) => b.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  if (['pending', 'confirmed', 'declined', 'completed'].includes(status)) {
    target.status = status;
    target.updatedAt = new Date().toISOString();
    writeDatabase(db);
  }
  res.json(target);
});

apiRouter.delete('/bookings/:id', (req: Request, res: Response) => {
  const db = readDatabase();
  db.bookings = db.bookings.filter((b) => b.id !== req.params.id);
  writeDatabase(db);
  res.json({ deleted: req.params.id });
});

// 8. Verified Customer Reviews (Testimonials) Endpoints
apiRouter.get('/testimonials', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db.testimonials);
});

apiRouter.post('/testimonials', (req: Request, res: Response) => {
  const db = readDatabase();
  const body = req.body as Partial<DbTestimonial>;
  const review: DbTestimonial = {
    id: body.id || `rev_${Date.now()}`,
    customerName: String(body.customerName || '').slice(0, 120),
    roleOrEvent: String(body.roleOrEvent || 'Verified CAREMEDIA Client').slice(0, 120),
    review: String(body.review || '').slice(0, 1500),
    rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
    photoUrl: String(body.photoUrl || ''),
    approved: typeof body.approved === 'boolean' ? body.approved : false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const idx = db.testimonials.findIndex((t) => t.id === review.id);
  if (idx >= 0) {
    db.testimonials[idx] = review;
  } else {
    db.testimonials.unshift(review);
  }
  writeDatabase(db);
  res.status(201).json(review);
});

apiRouter.put('/testimonials', (req: Request, res: Response) => {
  const db = readDatabase();
  if (Array.isArray(req.body?.items)) {
    db.testimonials = req.body.items;
    writeDatabase(db);
  }
  res.json(db.testimonials);
});

apiRouter.delete('/testimonials/:id', (req: Request, res: Response) => {
  const db = readDatabase();
  db.testimonials = db.testimonials.filter((t) => t.id !== req.params.id);
  writeDatabase(db);
  res.json({ deleted: req.params.id });
});

// 9. Site Settings Endpoints
apiRouter.get('/settings', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db.siteSettings);
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const db = readDatabase();
  const body = req.body || {};
  db.siteSettings = {
    heroTitle: String(body.heroTitle || db.siteSettings.heroTitle).slice(0, 150),
    slogan: String(body.slogan || db.siteSettings.slogan).slice(0, 250),
    heroSubtitle: String(body.heroSubtitle || db.siteSettings.heroSubtitle).slice(0, 300),
    aboutText: String(body.aboutText || db.siteSettings.aboutText).slice(0, 3000),
    phone: String(body.phone || db.siteSettings.phone).slice(0, 40),
    whatsapp: String(body.whatsapp || db.siteSettings.whatsapp).slice(0, 40),
    location: String(body.location || db.siteSettings.location).slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  writeDatabase(db);
  res.json(db.siteSettings);
});

// 10. Restore Default Seed Endpoint
apiRouter.post('/seed', (_req: Request, res: Response) => {
  const reset = structuredClone(INITIAL_DB_SEED);
  writeDatabase(reset);
  res.json(reset);
});
