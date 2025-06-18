

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

export interface BillHistoryEntry {
  id: string;
  name: string | null;
  createdAt: string; // ISO string date
  grandTotal: number | null;
  payerName: string | null;
  participantCount: number;
}
