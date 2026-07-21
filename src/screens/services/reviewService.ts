/**
 * Guest review links — create (auth) + watch/comment (public, skipAuth).
 */
import { apiRequest } from './apiClient';

export type ReviewLinkResponse = {
  id: string;
  token: string;
  urlPath: string;
  createdAt: string;
  revoked: boolean;
};

export type ReviewCommentResponse = {
  id: string;
  reviewLinkId?: string;
  authorName: string;
  text: string;
  timestampSeconds: number;
  createdAt: string;
};

export type GuestReviewPayload = {
  projectName: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  comments: ReviewCommentResponse[];
};

export function reviewDeepLink(token: string): string {
  return `vydora://review/${token}`;
}

export function reviewWebLink(token: string): string {
  return `https://vydora.io/review/${token}`;
}

export const reviewService = {
  createLink: (projectId: string) =>
    apiRequest<ReviewLinkResponse>(`/projects/${projectId}/review-links`, {
      method: 'POST',
    }),

  listLinks: (projectId: string) =>
    apiRequest<ReviewLinkResponse[]>(`/projects/${projectId}/review-links`),

  revokeLink: (projectId: string, linkId: string) =>
    apiRequest<void>(`/projects/${projectId}/review-links/${linkId}`, {
      method: 'DELETE',
    }),

  listGuestComments: (projectId: string) =>
    apiRequest<ReviewCommentResponse[]>(`/projects/${projectId}/review-comments`),

  getGuest: (token: string) =>
    apiRequest<GuestReviewPayload>(`/review/${token}`, {
      method: 'GET',
      skipAuth: true,
      skipRefresh: true,
    }),

  postGuestComment: (
    token: string,
    body: { authorName: string; text: string; timestampSeconds: number }
  ) =>
    apiRequest<ReviewCommentResponse>(`/review/${token}/comments`, {
      method: 'POST',
      skipAuth: true,
      skipRefresh: true,
      body: JSON.stringify(body),
    }),
};
