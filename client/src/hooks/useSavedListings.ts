import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "./useAuth";

interface SavedState {
  propertyIds: Set<string>;
  dealIds: Set<string>;
  isLoading: boolean;
}

let globalState: SavedState = {
  propertyIds: new Set(),
  dealIds: new Set(),
  isLoading: false,
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

async function fetchSavedIds() {
  try {
    const res = await fetch("/api/auth/saved/ids", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      globalState = {
        propertyIds: new Set(data.propertyIds || []),
        dealIds: new Set(data.dealIds || []),
        isLoading: false,
      };
      notifyListeners();
    }
  } catch {
    globalState.isLoading = false;
    notifyListeners();
  }
}

export function useSavedListings() {
  const { user } = useAuthStore();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  useEffect(() => {
    if (user && globalState.propertyIds.size === 0 && globalState.dealIds.size === 0 && !globalState.isLoading) {
      globalState.isLoading = true;
      fetchSavedIds();
    }
  }, [user]);

  const toggleSaveProperty = useCallback(
    async (propertyId: string) => {
      if (!user) return false;
      const isSaved = globalState.propertyIds.has(propertyId);
      // Optimistic update
      if (isSaved) {
        globalState.propertyIds.delete(propertyId);
      } else {
        globalState.propertyIds.add(propertyId);
      }
      notifyListeners();

      try {
        const res = await fetch(`/api/auth/saved/property/${propertyId}`, {
          method: isSaved ? "DELETE" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          // Revert on failure
          if (isSaved) {
            globalState.propertyIds.add(propertyId);
          } else {
            globalState.propertyIds.delete(propertyId);
          }
          notifyListeners();
          return false;
        }
        return true;
      } catch {
        // Revert on error
        if (isSaved) {
          globalState.propertyIds.add(propertyId);
        } else {
          globalState.propertyIds.delete(propertyId);
        }
        notifyListeners();
        return false;
      }
    },
    [user]
  );

  const toggleSaveDeal = useCallback(
    async (dealId: string) => {
      if (!user) return false;
      const isSaved = globalState.dealIds.has(dealId);
      // Optimistic update
      if (isSaved) {
        globalState.dealIds.delete(dealId);
      } else {
        globalState.dealIds.add(dealId);
      }
      notifyListeners();

      try {
        const res = await fetch(`/api/auth/saved/deal/${dealId}`, {
          method: isSaved ? "DELETE" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          if (isSaved) {
            globalState.dealIds.add(dealId);
          } else {
            globalState.dealIds.delete(dealId);
          }
          notifyListeners();
          return false;
        }
        return true;
      } catch {
        if (isSaved) {
          globalState.dealIds.add(dealId);
        } else {
          globalState.dealIds.delete(dealId);
        }
        notifyListeners();
        return false;
      }
    },
    [user]
  );

  const isPropertySaved = useCallback(
    (propertyId: string) => globalState.propertyIds.has(propertyId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState.propertyIds.size]
  );

  const isDealSaved = useCallback(
    (dealId: string) => globalState.dealIds.has(dealId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState.dealIds.size]
  );

  const refetch = useCallback(() => {
    if (user) fetchSavedIds();
  }, [user]);

  return {
    isPropertySaved,
    isDealSaved,
    toggleSaveProperty,
    toggleSaveDeal,
    savedPropertyIds: globalState.propertyIds,
    savedDealIds: globalState.dealIds,
    isLoading: globalState.isLoading,
    refetch,
  };
}
