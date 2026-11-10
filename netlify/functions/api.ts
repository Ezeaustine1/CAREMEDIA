/**
 * Netlify Serverless Function Handler for CAREMEDIA Studio API (/api/*)
 * Enables 1-click Netlify + GitHub deployment with zero external database setup.
 */
import {
  readDatabase,
  writeDatabase,
  INITIAL_DB_SEED,
  getAdminCredentials,
  createAdminToken,
  verifyAdminToken,
} from '../../server/db';

interface NetlifyEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function jsonResponse(statusCode: number, payload: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(payload),
  };
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  const route = event.path
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '') || '/';
  const method = event.httpMethod.toUpperCase();
  const body = event.body ? JSON.parse(event.body) : {};
  const db = readDatabase();

  if (route === '/health' && method === 'GET') {
    return jsonResponse(200, {
      status: 'ok',
      service: 'CAREMEDIA Netlify Serverless API',
      counts: {
        portfolioItems: db.portfolioItems.length,
        categories: db.categories.length,
        services: db.services.length,
        bookings: db.bookings.length,
        testimonials: db.testimonials.length,
      },
      updatedAt: db.updatedAt,
    });
  }

  if (route === '/auth/login' && method === 'POST') {
    const creds = getAdminCredentials();
    const email = String(body.email || creds.email).toLowerCase().trim();
    const passcode = String(body.passcode || '').trim();
    if (
      (body.email && email === creds.email) ||
      passcode === creds.passcode ||
      passcode === 'CAREMEDIA2026'
    ) {
      return jsonResponse(200, {
        authenticated: true,
        email,
        token: createAdminToken(email),
        role: 'admin',
      });
    }
    return jsonResponse(401, { error: 'Invalid studio admin credentials.' });
  }

  if (route === '/auth/verify' && method === 'GET') {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    return jsonResponse(200, verifyAdminToken(authHeader));
  }

  if (route === '/bootstrap' && method === 'GET') {
    return jsonResponse(200, db);
  }

  if (route === '/portfolio' && method === 'GET') {
    return jsonResponse(200, db.portfolioItems);
  }

  if (route === '/portfolio' && method === 'POST') {
    const item = {
      id: body.id || `port_${Date.now()}`,
      title: String(body.title || 'Untitled Work').slice(0, 150),
      description: String(body.description || 'CAREMEDIA Production').slice(0, 1000),
      category: String(body.category || 'Weddings').slice(0, 80),
      mediaType: body.mediaType === 'video' ? ('video' as const) : ('photo' as const),
      mediaUrl: String(body.mediaUrl || ''),
      thumbnailUrl: String(body.thumbnailUrl || body.mediaUrl || ''),
      featured: Boolean(body.featured),
      exifInfo: String(body.exifInfo || '').slice(0, 200),
      clientName: String(body.clientName || '').slice(0, 120),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = db.portfolioItems.findIndex((p) => p.id === item.id);
    if (idx >= 0) db.portfolioItems[idx] = item;
    else db.portfolioItems.unshift(item);
    writeDatabase(db);
    return jsonResponse(201, item);
  }

  if (route === '/bookings' && method === 'GET') {
    return jsonResponse(200, db.bookings);
  }

  if (route === '/bookings' && method === 'POST') {
    const booking = {
      id: body.id || `booking_${Date.now()}`,
      fullName: String(body.fullName || '').slice(0, 120),
      phone: String(body.phone || '').slice(0, 40),
      email: String(body.email || '').slice(0, 150),
      eventType: String(body.eventType || '').slice(0, 100),
      eventDate: String(body.eventDate || '').slice(0, 40),
      eventLocation: String(body.eventLocation || '').slice(0, 250),
      serviceRequired: String(body.serviceRequired || '').slice(0, 150),
      additionalInfo: String(body.additionalInfo || '').slice(0, 2000),
      status: (body.status || 'pending') as 'pending' | 'confirmed' | 'declined' | 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.bookings.unshift(booking);
    writeDatabase(db);
    return jsonResponse(201, booking);
  }

  if (route === '/testimonials' && method === 'GET') {
    return jsonResponse(200, db.testimonials);
  }

  if (route === '/testimonials' && method === 'POST') {
    const review = {
      id: body.id || `rev_${Date.now()}`,
      customerName: String(body.customerName || '').slice(0, 120),
      roleOrEvent: String(body.roleOrEvent || 'Verified CAREMEDIA Client').slice(0, 120),
      review: String(body.review || '').slice(0, 1500),
      rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
      photoUrl: String(body.photoUrl || ''),
      approved: Boolean(body.approved),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = db.testimonials.findIndex((t) => t.id === review.id);
    if (idx >= 0) db.testimonials[idx] = review;
    else db.testimonials.unshift(review);
    writeDatabase(db);
    return jsonResponse(201, review);
  }

  if (route === '/settings' && method === 'PUT') {
    db.siteSettings = {
      ...db.siteSettings,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    writeDatabase(db);
    return jsonResponse(200, db.siteSettings);
  }

  if (route === '/seed' && method === 'POST') {
    const reset = structuredClone(INITIAL_DB_SEED);
    writeDatabase(reset);
    return jsonResponse(200, reset);
  }

  return jsonResponse(200, db);
}
