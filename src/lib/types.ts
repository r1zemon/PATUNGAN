
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

export interface PersonalItemDetail {
  itemName: string;
  quantityConsumed: number;
  unitPrice: number;
  totalItemCost: number;
}

export interface PersonalShareDetail {
  personId: string;
  personName: string;
  items: PersonalItemDetail[];
  taxShare: number;
  tipShare: number;
  subTotalFromItems: number;
  totalShare: number; // Final share from bill_participants.total_share_amount
}

export interface DetailedBillSummaryData {
  payerName: string;
  taxAmount: number; // Overall bill tax
  tipAmount: number; // Overall bill tip
  personalTotalShares: RawBillSummary; // Kept for potential simple overview
  detailedPersonalShares?: PersonalShareDetail[]; // New detailed breakdown
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
  categoryName?: string | null; 
}

export interface Notification {
  id: string;
  type: 'friend_request' | 'bill_invite' | 'generic' | 'info';
  title: string;
  description?: string;
  createdAt: string; // ISO string date
  read: boolean;
  icon?: string; // Changed from React.ElementType to string
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
}

export interface RecentBillDisplayItem {
  id: string;
  name: string | null;
  createdAt: string; // ISO string
  grandTotal: number;
  categoryName?: string | null;
  participantCount: number;
}

export interface MonthlyExpenseByCategory {
  categoryName: string; 
  totalAmount: number;
  icon?: string; 
  color?: string; 
}

export interface ExpenseChartDataPoint {
  name: string; 
  total: number; 
}

export interface DashboardData {
  monthlyExpenses: MonthlyExpenseByCategory[];
  expenseChartData: ExpenseChartDataPoint[]; 
  recentBills: RecentBillDisplayItem[];
  scheduledBills: ScheduledBillDisplayItem[];
}

// Renamed from BillDetailsForHistory to be more general
export interface FetchedBillDetails {
  billName: string | null;
  createdAt: string;
  summaryData: DetailedBillSummaryData; // This will now contain detailedPersonalShares
  participants: Person[]; // List of participants involved in this bill
}
