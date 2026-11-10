# CAREMEDIA Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: All paths not explicitly matched in `firestore.rules` are denied for both `read` and `write`.
2. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates its document ID with `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
3. **Admin Authentication & Email Verification**: Admin privileges require a signed-in user whose UID exists in `/admins/{uid}` OR whose verified email (`request.auth.token.email_verified == true`) matches the bootstrapped owner email (`ezehaustine1@gmail.com`). Unverified emails are always rejected.
4. **PII Isolation on Bookings**: `/bookings/{bookingId}` contains client PII (`fullName`, `phone`, `email`). Read operations (`get`, `list`) are strictly restricted to `isAdmin()`. Public visitors can only `create` a booking with `status == 'pending'`, exact schema keys, bounded field lengths, and server timestamps (`createdAt == request.time && updatedAt == request.time`).
5. **Testimonial Moderation Gate**: Public visitors can `create` a testimonial in `/testimonials/{testimonialId}` only if `approved == false`, `rating >= 1 && rating <= 5`, and timestamps equal `request.time`. Public `get` and `list` queries are strictly restricted to documents where `resource.data.approved == true` (unless `isAdmin()`).
6. **Public Showcase Integrity**: `/portfolioItems/{itemId}`, `/categories/{categoryId}`, `/services/{serviceId}`, and `/siteSettings/{settingId}` are publicly readable (`get`, `list`), but `create`, `update`, and `delete` are strictly restricted to `isAdmin()` with full schema blueprint validation (`isValid[Entity]`), immutable `createdAt`, and `updatedAt == request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Booking Create**: `{ fullName: "Ada", ..., status: "pending", isAdmin: true }` -> Rejected by `hasOnly`.
2. **Pre-Confirmed Booking Spoof**: `{ fullName: "Ada", ..., status: "confirmed" }` by anonymous visitor -> Rejected because `incoming().status == 'pending'` is required on create.
3. **Unauthenticated PII Read on Bookings**: Non-admin attempting `get` or `list` on `/bookings` -> Rejected because `allow get, list` requires `isAdmin()`.
4. **Self-Approved Testimonial**: Visitor submitting `/testimonials/t1` with `{ approved: true, ... }` -> Rejected because non-admin create requires `incoming().approved == false`.
5. **Unapproved Testimonial Scraping**: Visitor running `list` on `/testimonials` without `where('approved', '==', true)` -> Rejected by `allow list: if resource.data.approved == true || isAdmin()`.
6. **Spoofed Admin Email (Unverified)**: Attacker with `email: 'ezehaustine1@gmail.com'` and `email_verified: false` attempting to delete a portfolio item -> Rejected by `request.auth.token.email_verified == true`.
7. **Denial-of-Wallet Oversized ID**: Creating `/bookings/<200-char-id>` -> Rejected by `isValidId(bookingId)`.
8. **Value Poisoning on Booking Status Update**: Admin updating `status` to `"hacked_status"` -> Rejected by `isValidBooking(incoming())` enum check.
9. **Immutable Timestamp Tampering**: Admin updating a portfolio item while mutating `createdAt` -> Rejected by `incoming().createdAt == existing().createdAt`.
10. **Forged Client Timestamp on Create**: Submitting a booking with a past or future `createdAt` -> Rejected by `incoming().createdAt == request.time`.
11. **Unauthorized Portfolio Upload**: Non-admin attempting to create or update `/portfolioItems/item1` -> Rejected by `isAdmin()`.
12. **Privilege Escalation in `/admins`**: Non-admin attempting to write `/admins/{theirUid}` -> Rejected by `isAdmin()`.
