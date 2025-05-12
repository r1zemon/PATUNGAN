export interface Person {
  id: string;
  name: string;
}

export interface ScannedItem {
  id: string;
  name: string;
  unitPrice: number; // Changed from price to unitPrice
  quantity: number;  // Added quantity
}

export interface SplitItem extends ScannedItem {
  // assignedToIds: string[]; // Old structure
  assignedTo: Array<{ personId: string; count: number }>; // New structure: personId and how many units they take
}

export type BillSummaryData = Record<string, number>; // Person name to amount owed
