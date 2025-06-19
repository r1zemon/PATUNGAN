

export interface Person {
  id: string;
  name: string;
}

export interface ScannedItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface SplitItem extends ScannedItem {
  assignedTo: Array<{ personId: string; count: number }>;
}

// Raw output from summarizeBill AI flow
export type RawBillSummary = Record<string, number>; // Person name to their total fair share of the bill

export type TaxTipSplitStrategy = "PAYER_PAYS_ALL" | "SPLIT_EQUALLY";

export interface BillDetails {
  payerId: string | null;
  taxAmount: number;
  tipAmount: number;
  taxTipSplitStrategy: TaxTipSplitStrategy;
}

export interface Settlement {
  from: string; // Person name
  to: string;   // Person name (usually the payer)
  amount: number;
}

export interface DetailedBillSummaryData {
  payerName: string;
  taxAmount: number;
  tipAmount: number;
  personalTotalShares: RawBillSummary; // Each person's calculated total share
  settlements: Settlement[];
  grandTotal: number;
}

export interface BillCategory { // New type
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface BillHistoryEntry {
  id: string;
  name: string | null;
  createdAt: string; // ISO string date
  grandTotal: number | null;
  payerName: string | null;
  participantCount: number;
  scheduled_at?: string | null;
  categoryName?: string | null; // New optional field
}

export interface Notification {
  id: string;
  type: 'friend_request' | 'bill_invite' | 'generic' | 'info';
  title: string;
  description?: string;
  createdAt: string; // ISO string date
  read: boolean;
  icon?: React.ElementType; // Lucide icon component
  link?: string;
  sender?: {
    name: string;
    avatarUrl?: string;
  };
}

// ===== DASHBOARD TYPES =====
export interface ScheduledBillDisplayItem {
  id: string;
  name: string | null;
  scheduled_at: string; // ISO string
  categoryName?: string | null;
  participantCount: number;
  // Add participant avatars array if needed for UI
  // participantAvatars?: string[]; 
}

export interface RecentBillDisplayItem {
  id: string;
  name: string | null;
  createdAt: string; // ISO string
  grandTotal: number;
  categoryName?: string | null;
  participantCount: number;
  // participantAvatars?: string[];
}

export interface MonthlyExpenseByCategory {
  categoryName: string; // e.g., "Makanan", "Transportasi", "Lainnya"
  totalAmount: number;
  icon?: React.ElementType; // Lucide icon for display
  color?: string; // Hex color for chart/display consistency
}

export interface ExpenseChartDataPoint {
  name: string; // Label for the axis (e.g., month name, date, category name)
  total: number; // Value for the bar/line
}

export interface DashboardData {
  monthlyExpenses: MonthlyExpenseByCategory[];
  expenseChartData: ExpenseChartDataPoint[]; // For a specific period, e.g., this month by day, or last 6 months by month
  recentBills: RecentBillDisplayItem[];
  scheduledBills: ScheduledBillDisplayItem[];
}
