import { reviewHandler } from '@/lib/server/review-donation';

/* POST /api/donations/{id}/reject { reason } */
export const POST = reviewHandler('rejected');
