import { v4 as uuidv4 } from "uuid";
import type { IStorage } from "./storage";

// Points earning rates
const POINTS_PER_DOLLAR = 1; // $1 spent = 1 point
const REVIEW_BONUS_POINTS = 10; // 10 points for writing a review
const POINTS_TO_CREDIT_RATIO = 100; // 100 points = $1 credit (1000 pts = $10)

// Tier thresholds based on total points earned
const TIER_THRESHOLDS = {
  Bronze: 0,
  Silver: 100,
  Gold: 500,
  Platinum: 1000,
};

export function calculateTier(totalPointsEarned: number): string {
  if (totalPointsEarned >= TIER_THRESHOLDS.Platinum) return "Platinum";
  if (totalPointsEarned >= TIER_THRESHOLDS.Gold) return "Gold";
  if (totalPointsEarned >= TIER_THRESHOLDS.Silver) return "Silver";
  return "Bronze";
}

export function getNextTierInfo(currentTier: string, totalPointsEarned: number): { nextTier: string; pointsNeeded: number } {
  const tiers = ["Bronze", "Silver", "Gold", "Platinum"];
  const currentIndex = tiers.indexOf(currentTier);
  
  if (currentIndex === tiers.length - 1) {
    return { nextTier: "Platinum", pointsNeeded: 0 }; // Already at max tier
  }
  
  const nextTier = tiers[currentIndex + 1];
  const nextThreshold = TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS];
  const pointsNeeded = nextThreshold - totalPointsEarned;
  
  return { nextTier, pointsNeeded };
}

export async function awardBookingPoints(
  storage: IStorage,
  userId: string,
  bookingId: string,
  totalPrice: number,
  hotelName: string
): Promise<{ success: boolean; pointsAwarded: number }> {
  try {
    // Calculate points (totalPrice is in cents, so divide by 100 first)
    const pointsToAward = Math.floor((totalPrice / 100) * POINTS_PER_DOLLAR);
    
    if (pointsToAward <= 0) {
      return { success: false, pointsAwarded: 0 };
    }

    // Get or create user rewards record
    let rewards = await storage.getUserRewards(userId);
    if (!rewards) {
      rewards = await storage.createUserRewards({
        id: uuidv4(),
        userId,
        totalPointsEarned: 0,
        currentPoints: 0,
        creditBalance: 0,
        tier: "Bronze",
      });
    }

    // Update rewards
    const newTotalPoints = rewards.totalPointsEarned + pointsToAward;
    const newCurrentPoints = rewards.currentPoints + pointsToAward;
    const newTier = calculateTier(newTotalPoints);

    await storage.updateUserRewards(userId, {
      totalPointsEarned: newTotalPoints,
      currentPoints: newCurrentPoints,
      tier: newTier,
    });

    // Create transaction record
    await storage.createRewardsTransaction({
      id: uuidv4(),
      userId,
      type: "EARN",
      points: pointsToAward,
      description: `Earned ${pointsToAward} points from stay at ${hotelName}`,
      bookingId,
    });

    return { success: true, pointsAwarded: pointsToAward };
  } catch (error) {
    console.error("Error awarding booking points:", error);
    return { success: false, pointsAwarded: 0 };
  }
}

export async function awardReviewPoints(
  storage: IStorage,
  userId: string,
  reviewId: string,
  hotelName: string
): Promise<{ success: boolean; pointsAwarded: number }> {
  try {
    // Get or create user rewards record
    let rewards = await storage.getUserRewards(userId);
    if (!rewards) {
      rewards = await storage.createUserRewards({
        id: uuidv4(),
        userId,
        totalPointsEarned: 0,
        currentPoints: 0,
        creditBalance: 0,
        tier: "Bronze",
      });
    }

    // Update rewards
    const newTotalPoints = rewards.totalPointsEarned + REVIEW_BONUS_POINTS;
    const newCurrentPoints = rewards.currentPoints + REVIEW_BONUS_POINTS;
    const newTier = calculateTier(newTotalPoints);

    await storage.updateUserRewards(userId, {
      totalPointsEarned: newTotalPoints,
      currentPoints: newCurrentPoints,
      tier: newTier,
    });

    // Create transaction record
    await storage.createRewardsTransaction({
      id: uuidv4(),
      userId,
      type: "EARN",
      points: REVIEW_BONUS_POINTS,
      description: `Earned ${REVIEW_BONUS_POINTS} points for reviewing ${hotelName}`,
      reviewId,
    });

    return { success: true, pointsAwarded: REVIEW_BONUS_POINTS };
  } catch (error) {
    console.error("Error awarding review points:", error);
    return { success: false, pointsAwarded: 0 };
  }
}

export async function convertPointsToCredit(
  storage: IStorage,
  userId: string,
  pointsToConvert: number
): Promise<{ success: boolean; creditAdded: number; message?: string }> {
  try {
    const rewards = await storage.getUserRewards(userId);
    if (!rewards) {
      return { success: false, creditAdded: 0, message: "Rewards account not found" };
    }

    if (rewards.currentPoints < pointsToConvert) {
      return { success: false, creditAdded: 0, message: "Insufficient points" };
    }

    if (pointsToConvert < 100) {
      return { success: false, creditAdded: 0, message: "Minimum 100 points required to convert (100 pts = $1)" };
    }

    // Calculate credit (100 points = $1 = 100 cents)
    const creditToAdd = Math.floor(pointsToConvert / POINTS_TO_CREDIT_RATIO) * 100;
    const pointsUsed = Math.floor(pointsToConvert / POINTS_TO_CREDIT_RATIO) * POINTS_TO_CREDIT_RATIO;

    // Update rewards
    await storage.updateUserRewards(userId, {
      currentPoints: rewards.currentPoints - pointsUsed,
      creditBalance: rewards.creditBalance + creditToAdd,
    });

    // Create transaction record
    await storage.createRewardsTransaction({
      id: uuidv4(),
      userId,
      type: "CONVERT_TO_CREDIT",
      points: -pointsUsed,
      description: `Converted ${pointsUsed} points to $${(creditToAdd / 100).toFixed(2)} credit`,
    });

    return { success: true, creditAdded: creditToAdd, message: `Converted ${pointsUsed} points to $${(creditToAdd / 100).toFixed(2)} credit` };
  } catch (error) {
    console.error("Error converting points to credit:", error);
    return { success: false, creditAdded: 0, message: "Conversion failed" };
  }
}

export async function applyCreditToBooking(
  storage: IStorage,
  userId: string,
  bookingAmount: number
): Promise<{ success: boolean; creditUsed: number; finalAmount: number }> {
  try {
    const rewards = await storage.getUserRewards(userId);
    if (!rewards || rewards.creditBalance <= 0) {
      return { success: true, creditUsed: 0, finalAmount: bookingAmount };
    }

    // Use as much credit as possible (up to booking amount)
    const creditToUse = Math.min(rewards.creditBalance, bookingAmount);
    const finalAmount = bookingAmount - creditToUse;

    // Update credit balance
    await storage.updateUserRewards(userId, {
      creditBalance: rewards.creditBalance - creditToUse,
    });

    // Create transaction record
    await storage.createRewardsTransaction({
      id: uuidv4(),
      userId,
      type: "REDEEM",
      points: 0, // No points used, just credit
      description: `Used $${(creditToUse / 100).toFixed(2)} credit on booking`,
    });

    return { success: true, creditUsed: creditToUse, finalAmount };
  } catch (error) {
    console.error("Error applying credit to booking:", error);
    return { success: false, creditUsed: 0, finalAmount: bookingAmount };
  }
}

export async function applyPromoCode(
  storage: IStorage,
  userId: string,
  code: string
): Promise<{ success: boolean; promoCode?: any; message?: string }> {
  try {
    const promoCode = await storage.getPromoCodeByCode(code);
    
    if (!promoCode) {
      return { success: false, message: "Invalid promo code" };
    }

    if (!promoCode.isActive) {
      return { success: false, message: "Promo code is no longer active" };
    }

    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return { success: false, message: "Promo code has expired" };
    }

    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return { success: false, message: "Promo code has reached maximum uses" };
    }

    // Check if user already used this code
    const alreadyUsed = await storage.hasUserUsedPromoCode(userId, promoCode.id);
    if (alreadyUsed) {
      return { success: false, message: "You have already used this promo code" };
    }

    // Record usage
    await storage.createPromoCodeUsage({
      id: uuidv4(),
      userId,
      promoCodeId: promoCode.id,
    });

    // Update promo code usage count
    await storage.incrementPromoCodeUsage(promoCode.id);

    // If it's a points promo code, award points
    if (promoCode.type === "POINTS") {
      let rewards = await storage.getUserRewards(userId);
      if (!rewards) {
        rewards = await storage.createUserRewards({
          id: uuidv4(),
          userId,
          totalPointsEarned: 0,
          currentPoints: 0,
          creditBalance: 0,
          tier: "Bronze",
        });
      }

      const newTotalPoints = rewards.totalPointsEarned + promoCode.value;
      const newCurrentPoints = rewards.currentPoints + promoCode.value;
      const newTier = calculateTier(newTotalPoints);

      await storage.updateUserRewards(userId, {
        totalPointsEarned: newTotalPoints,
        currentPoints: newCurrentPoints,
        tier: newTier,
      });

      await storage.createRewardsTransaction({
        id: uuidv4(),
        userId,
        type: "EARN",
        points: promoCode.value,
        description: `Earned ${promoCode.value} points from promo code ${code}`,
      });

      return { 
        success: true, 
        promoCode, 
        message: `Promo code applied! You earned ${promoCode.value} points!` 
      };
    }

    return { success: true, promoCode, message: "Promo code applied successfully!" };
  } catch (error) {
    console.error("Error applying promo code:", error);
    return { success: false, message: "Failed to apply promo code" };
  }
}

