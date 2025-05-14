
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "IDR"): string {
  // Use 'id-ID' locale for Indonesian Rupiah formatting
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency, // Keep currency code flexible, though default to IDR
    minimumFractionDigits: 0, // No decimals for IDR usually
    maximumFractionDigits: 2, // Allow decimals if other currencies are used
  }).format(amount);
}
