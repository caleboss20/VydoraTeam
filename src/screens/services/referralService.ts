/**
 * Referral growth — share code, track invites, soft Pro rewards.
 * GET /api/v1/referrals/me · POST /api/v1/referrals/redeem
 */
import { apiRequest } from './apiClient';

export type ReferralFriend = {
  userId: string;
  name: string;
  initials: string;
  color: string;
  joinedAt: string;
};

export type ReferralStats = {
  code: string;
  webLink: string;
  deepLink: string;
  invitedCount: number;
  rewardDays: number;
  isPro: boolean;
  proUntil: string | null;
  recentFriends: ReferralFriend[];
};

export const referralService = {
  me: () => apiRequest<ReferralStats>('/referrals/me'),

  redeem: (code: string) =>
    apiRequest<void>('/referrals/redeem', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    }),
};
