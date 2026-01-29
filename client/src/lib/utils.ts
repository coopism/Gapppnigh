import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency: string = "AUD"): string {
  // Normalize currency codes - convert display symbols to ISO codes
  let isoCurrency = currency;
  if (currency === "A$" || currency === "AUD" || !currency) {
    isoCurrency = "AUD";
  } else if (currency === "$" || currency === "US$") {
    isoCurrency = "USD";
  }
  
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: isoCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
