// Boost service for handling vibe and SOS boosts
// Uses the reports service voting system for boost functionality

import { reportsService } from './reports';

/**
 * Boost a vibe report (upvote)
 */
export const boostVibe = async (vibeId: number, userId: string): Promise<boolean> => {
  try {
    await reportsService.vote(vibeId, userId, 'upvote');
    return true;
  } catch (error) {
    console.error('Error boosting vibe:', error);
    return false;
  }
};

/**
 * Boost an SOS report (upvote)
 */
export const boostSOS = async (sosId: number, userId: string): Promise<boolean> => {
  try {
    await reportsService.vote(sosId, userId, 'upvote');
    return true;
  } catch (error) {
    console.error('Error boosting SOS:', error);
    return false;
  }
};

/**
 * Check if user has boosted a vibe report
 */
export const hasUserBoostedVibe = async (vibeId: number, userId: string): Promise<boolean> => {
  try {
    const voteType = await reportsService.getUserVote(vibeId, userId);
    return voteType === 'upvote';
  } catch (error) {
    console.error('Error checking vibe boost status:', error);
    return false;
  }
};

/**
 * Check if user has boosted an SOS report
 */
export const hasUserBoostedSOS = async (sosId: number, userId: string): Promise<boolean> => {
  try {
    const voteType = await reportsService.getUserVote(sosId, userId);
    return voteType === 'upvote';
  } catch (error) {
    console.error('Error checking SOS boost status:', error);
    return false;
  }
};

/**
 * Remove boost from a vibe report
 */
export const unboostVibe = async (vibeId: number, userId: string): Promise<boolean> => {
  try {
    // Check current vote
    const currentVote = await reportsService.getUserVote(vibeId, userId);
    if (currentVote === 'upvote') {
      // Remove the upvote by voting downvote first, then removing it
      // Actually, the vote method handles toggling - if user already upvoted, it will remove the vote
      await reportsService.vote(vibeId, userId, 'upvote');
    }
    return true;
  } catch (error) {
    console.error('Error unboosting vibe:', error);
    return false;
  }
};

/**
 * Remove boost from an SOS report
 */
export const unboostSOS = async (sosId: number, userId: string): Promise<boolean> => {
  try {
    // Check current vote
    const currentVote = await reportsService.getUserVote(sosId, userId);
    if (currentVote === 'upvote') {
      // Remove the upvote by voting the same way again (toggle behavior)
      await reportsService.vote(sosId, userId, 'upvote');
    }
    return true;
  } catch (error) {
    console.error('Error unboosting SOS:', error);
    return false;
  }
};
