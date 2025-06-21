
export interface Person {
  id: string; // Ini bisa jadi participant_id atau user_id (profile_id)
  name: string;
  avatar_url?: string | null; // Tambahkan untuk avatar di summary jika partisipan adalah user
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

export type SettlementStatus = 'unpaid' | 'paid' | 'pending' | 'failed';

export interface Settlement {
  fromId: string;
  from: string; // Person name
  toId: string;
  to: string;   // Person name (usually the payer)
  amount: number;
  status: SettlementStatus;
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
  icon?: React.ElementType;
  link?: string;
  sender?: {
    name: string;
    avatar_url?: string;
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

export interface FetchedBillDetails {
  billName: string | null;
  createdAt: string;
  summaryData: DetailedBillSummaryData;
  participants: Person[];
}

// ===== SOCIAL/FRIENDSHIP TYPES =====
export interface UserProfileBasic {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface FriendRequestDisplay extends UserProfileBasic {
  requestId: string;
  requestedAt: string; // ISO string date
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}

export interface FriendDisplay extends UserProfileBasic {
  friendshipId: string;
  since: string; // ISO string date
}
