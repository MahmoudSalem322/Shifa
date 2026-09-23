import { reviewHandler } from '@/lib/server/review-donation';

/* POST /api/donations/{id}/approve { note? } */
export const POST = reviewHandler('approved');
