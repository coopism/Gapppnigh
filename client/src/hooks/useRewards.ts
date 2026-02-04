import { useState, useEffect } from "react";
import { useAuthStore } from "./useAuth";

interface RewardsData {
  id: string;
  userId: string;
  totalPointsEarned: number;
  currentPoints: number;
  creditBalance: number;
  tier: string;
  nextTier: string;
  pointsToNextTier: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  userId: string;
  type: string;
  points: number;
  description: string;
  bookingId?: string;
  reviewId?: string;
  createdAt: string;
}

interface Review {
  id: string;
  userId: string;
  bookingId: string;
  hotelName: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: string;
}

export function useRewards() {
  const { user, csrfToken } = useAuthStore();
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = async () => {
    if (!user) return;
    
    try {
      const res = await fetch("/api/auth/rewards", {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setRewards(data.rewards);
      } else {
        setError("Failed to load rewards");
      }
    } catch (err) {
      setError("Failed to load rewards");
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      const res = await fetch("/api/auth/rewards/transactions", {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
  };

  const fetchReviews = async () => {
    if (!user) return;
    
    try {
      const res = await fetch("/api/auth/reviews", {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  const convertPointsToCredit = async (points: number): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch("/api/auth/rewards/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ points }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        await fetchRewards();
        await fetchTransactions();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Conversion failed" };
      }
    } catch (err) {
      return { success: false, message: "Failed to convert points" };
    }
  };

  const applyPromoCode = async (code: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch("/api/auth/promo-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        await fetchRewards();
        await fetchTransactions();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Invalid promo code" };
      }
    } catch (err) {
      return { success: false, message: "Failed to apply promo code" };
    }
  };

  const submitReview = async (
    bookingId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; message?: string; pointsAwarded?: number }> => {
    try {
      const res = await fetch("/api/auth/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        await fetchRewards();
        await fetchTransactions();
        await fetchReviews();
        return { 
          success: true, 
          message: data.message,
          pointsAwarded: data.pointsAwarded,
        };
      } else {
        return { success: false, message: data.message || "Failed to submit review" };
      }
    } catch (err) {
      return { success: false, message: "Failed to submit review" };
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchRewards(),
        fetchTransactions(),
        fetchReviews(),
      ]);
      setIsLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  return {
    rewards,
    transactions,
    reviews,
    isLoading,
    error,
    convertPointsToCredit,
    applyPromoCode,
    submitReview,
    refetch: async () => {
      await Promise.all([
        fetchRewards(),
        fetchTransactions(),
        fetchReviews(),
      ]);
    },
  };
}
