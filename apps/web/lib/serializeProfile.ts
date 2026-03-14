/**
 * Shared utility for serializing profile data from Prisma (BigInt → number)
 */

export function serializeProfile(profile: any) {
  return {
    ...profile,
    firstSeenAt: profile.firstSeenAt ? Number(profile.firstSeenAt) : null,
    lastInteractionAt: profile.lastInteractionAt ? Number(profile.lastInteractionAt) : null,
    lastAnalyzedAt: profile.lastAnalyzedAt ? Number(profile.lastAnalyzedAt) : null,
    lastPhotoAnalyzedAt: profile.lastPhotoAnalyzedAt ? Number(profile.lastPhotoAnalyzedAt) : null,
    lastPredictionAt: profile.lastPredictionAt ? Number(profile.lastPredictionAt) : null,
    expert_panel_timestamp: profile.expert_panel_timestamp ? Number(profile.expert_panel_timestamp) : null,
    createdAt: profile.createdAt ? Number(profile.createdAt) : null,
    updatedAt: profile.updatedAt ? Number(profile.updatedAt) : null,
  };
}
