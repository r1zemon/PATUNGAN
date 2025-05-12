export interface Person {
  id: string;
  name: string;
}

export interface ScannedItem {
  id: string;
  name: string;
  price: number;
}

export interface SplitItem extends ScannedItem {
  assignedToIds: string[]; // Array of Person IDs
}

export type BillSummaryData = Record<string, number>; // Person name to amount owed
