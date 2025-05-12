"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillOutput, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person } from "./types";

// Helper to map AI output to application's ScannedItem type
interface AppScannedItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export async function handleScanReceiptAction(
  receiptDataUri: string
): Promise<{ success: boolean; data?: { items: AppScannedItem[] }; error?: string }> {
  if (!receiptDataUri) {
    return { success: false, error: "No receipt image data provided." };
  }

  if (!receiptDataUri.startsWith("data:image/")) {
    return { success: false, error: "Invalid image data format." };
  }

  try {
    console.log("handleScanReceiptAction: Calling scanReceipt flow...");
    const result: ScanReceiptOutput = await scanReceipt({ receiptDataUri });
    
    if (result && result.items !== undefined) {
      const appItems: AppScannedItem[] = result.items.map((item: AiReceiptItem, index: number) => ({
        id: `scanned_${Date.now()}_${index}`,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      }));
      console.log(`handleScanReceiptAction: Scan successful, ${appItems.length} items mapped.`);
      return { success: true, data: { items: appItems } };
    } else {
      console.error("handleScanReceiptAction: scanReceipt returned an unexpected structure:", result);
      return { success: false, error: "Received unexpected data from scanner. Please try again." };
    }
  } catch (error) { 
    console.error("handleScanReceiptAction: Critical error during scanReceipt call:", error);
    let errorMessage = "Failed to scan receipt due to an unexpected server error. Please try again.";
    if (error instanceof Error) {
        errorMessage = `Scan failed: ${error.message}`;
        if (error.cause) {
          try {
            if (typeof error.cause === 'object' && error.cause !== null && 'message' in error.cause) {
                  errorMessage += ` (Cause: ${(error.cause as Error).message})`;
            } else {
                errorMessage += ` (Cause: ${String(error.cause)})`;
            }
          } catch (e) {
              errorMessage += ` (Cause: ${String(error.cause)})`;
          }
        }
    }
    console.error("handleScanReceiptAction: Final error message to client:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function handleSummarizeBillAction(
  splitItems: SplitItem[],
  people: Person[]
): Promise<{ success: boolean; data?: SummarizeBillOutput; error?: string }> {
  if (!splitItems.length || !people.length) {
    return { success: false, error: "No items or people to summarize." };
  }

  const peopleMap = new Map(people.map(p => [p.id, p.name]));

  const itemsForAI: SummarizeBillInput["items"] = splitItems.map(item => ({
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity, // Total quantity of this item line
    分配给: item.assignedTo.map(assignment => ({
      personName: peopleMap.get(assignment.personId) || "Unknown Person",
      count: assignment.count,
    })).filter(a => a.personName !== "Unknown Person" && a.count > 0),
  }));

  const peopleNamesForAI: SummarizeBillInput["people"] = people.map(p => p.name);

  try {
    const result = await summarizeBill({ items: itemsForAI, people: peopleNamesForAI });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error summarizing bill:", error);
    let errorMessage = "Failed to summarize bill. Please try again.";
     if (error instanceof Error) {
        errorMessage = `Summarize bill failed: ${error.message}`;
         if (error.cause) {
            try {
                if (typeof error.cause === 'object' && error.cause !== null && 'message' in error.cause) {
                     errorMessage += ` (Cause: ${(error.cause as Error).message})`;
                } else {
                    errorMessage += ` (Cause: ${String(error.cause)})`;
                }
            } catch (e) {
                errorMessage += ` (Cause: ${String(error.cause)})`;
            }
        }
    }
    return { success: false, error: errorMessage };
  }
}
