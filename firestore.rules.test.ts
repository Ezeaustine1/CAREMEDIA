/**
 * CAREMEDIA Firestore Rules Security Verification Suite
 * Verifies that all "Dirty Dozen" adversarial payloads are rejected (PERMISSION_DENIED).
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  docId: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Booking Create',
    collection: 'bookings',
    operation: 'create',
    auth: null,
    docId: 'booking_1',
    payload: {
      fullName: 'Adaeze Obi',
      phone: '08063751294',
      email: 'ada@example.com',
      eventType: 'Wedding',
      eventDate: '2026-12-12',
      eventLocation: 'Ota, Ogun State',
      serviceRequired: 'Wedding Photography & Videography',
      additionalInfo: 'Grand reception',
      status: 'pending',
      isAdmin: true // Ghost field
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Pre-Confirmed Booking Spoof',
    collection: 'bookings',
    operation: 'create',
    auth: null,
    docId: 'booking_2',
    payload: {
      fullName: 'Adaeze Obi',
      phone: '08063751294',
      email: 'ada@example.com',
      eventType: 'Wedding',
      eventDate: '2026-12-12',
      eventLocation: 'Ota, Ogun State',
      serviceRequired: 'Wedding Photography & Videography',
      additionalInfo: '',
      status: 'confirmed' // Must be pending on create
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Unauthenticated PII Read on Bookings',
    collection: 'bookings',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    docId: 'booking_1',
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Self-Approved Testimonial by Visitor',
    collection: 'testimonials',
    operation: 'create',
    auth: null,
    docId: 'testimonial_1',
    payload: {
      customerName: 'Tunde Bakare',
      roleOrEvent: 'Wedding Client',
      review: 'Amazing cinematography!',
      rating: 5,
      photoUrl: '',
      approved: true // Visitor cannot self-approve
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Unapproved Testimonial Read by Public Visitor',
    collection: 'testimonials',
    operation: 'get',
    auth: null,
    docId: 'unapproved_testimonial_id',
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Spoofed Admin Email with email_verified: false',
    collection: 'portfolioItems',
    operation: 'delete',
    auth: { uid: 'spoof_uid', email: 'ezehaustine1@gmail.com', email_verified: false },
    docId: 'item_1',
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Denial-of-Wallet Oversized Document ID (>128 chars)',
    collection: 'bookings',
    operation: 'create',
    auth: null,
    docId: 'a'.repeat(150),
    payload: {},
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Value Poisoning on Booking Status Update',
    collection: 'bookings',
    operation: 'update',
    auth: { uid: 'admin_uid', email: 'ezehaustine1@gmail.com', email_verified: true },
    docId: 'booking_1',
    payload: {
      status: 'invalid_status_enum'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Immutable Timestamp Tampering on Portfolio Update',
    collection: 'portfolioItems',
    operation: 'update',
    auth: { uid: 'admin_uid', email: 'ezehaustine1@gmail.com', email_verified: true },
    docId: 'item_1',
    payload: {
      createdAt: '1999-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Forged Client Timestamp on Booking Create',
    collection: 'bookings',
    operation: 'create',
    auth: null,
    docId: 'booking_3',
    payload: {
      createdAt: '2020-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Unauthorized Portfolio Upload by Non-Admin',
    collection: 'portfolioItems',
    operation: 'create',
    auth: { uid: 'user_123', email: 'visitor@example.com', email_verified: true },
    docId: 'item_99',
    payload: {
      title: 'Hacked Item'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Privilege Escalation in /admins Collection',
    collection: 'admins',
    operation: 'create',
    auth: { uid: 'user_123', email: 'visitor@example.com', email_verified: true },
    docId: 'user_123',
    payload: {
      email: 'visitor@example.com'
    },
    expectedResult: 'PERMISSION_DENIED'
  }
];
