"use server";

import { scanReceipt, ScanReceiptOutput } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillOutput, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person } from "./types";

export async function handleScanReceiptAction(
  receiptDataUri: string
): Promise<{ success: boolean; data?: ScanReceiptOutput; error?: string }> {
  if (!receiptDataUri) {
    return { success: false, error: "No receipt image data provided." };
  }

  // Basic validation for data URI format (can be more robust)
  if (!receiptDataUri.startsWith("data:image/")) {
    return { success: false, error: "Invalid image data format." };
  }

  try {
    console.log("handleScanReceiptAction: Calling scanReceipt flow with data URI...");
    const result = await scanReceipt({ receiptDataUri });
    
    if (result && result.items !== undefined) {
      console.log(`handleScanReceiptAction: Scan successful, ${result.items.length} items found.`);
      return { success: true, data: result };
    } else {
      console.error("handleScanReceiptAction: scanReceipt returned an unexpected structure:", result);
      return { success: false, error: "Received unexpected data from scanner. Please try again." };
    }
  } catch (error) { 
    console.error("handleScanReceiptAction: Critical error during scanReceipt call:", error);
    
    let errorMessage = "Failed to scan receipt due to an unexpected server error. Please try again.";
    if (error instanceof Error) {
        errorMessage = `Scan failed: ${error.message}`;
        // Attempt to get more details from Genkit or underlying errors
        if (error.cause) {
            try {
                // Check if cause is an object and has a message property
                if (typeof error.cause === 'object' && error.cause !== null && 'message' in error.cause) {
                     errorMessage += ` (Cause: ${(error.cause as Error).message})`;
                } else {
                    errorMessage += ` (Cause: ${JSON.stringify(error.cause)})`;
                }
            } catch (e) {
                errorMessage += ` (Cause: ${String(error.cause)})`;
            }
        }
    } else if (typeof error === 'string') {
        errorMessage = `Scan failed: ${error}`;
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
    price: item.price,
    分配给: item.assignedToIds.map(id => peopleMap.get(id) || "Unknown Person").filter(name => name !== "Unknown Person"),
  }));

  const peopleNamesForAI: SummarizeBillInput["people"] = people.map(p => p.name);

  if (itemsForAI.some(item => item.分配给.length === 0 && item.price > 0)) {
     // This is a soft check, the AI might handle it, but it's good to be aware.
     // console.warn("Some items with price are not assigned to anyone.");
  }

  try {
    const result = await summarizeBill({ items: itemsForAI, people: peopleNamesForAI });
    return { success: true, data: result };
  } catch (error)
   {
    console.error("Error summarizing bill:", error);
    let errorMessage = "Failed to summarize bill. Please try again.";
    if (error instanceof Error) {
        errorMessage = `Summarize bill failed: ${error.message}`;
         if (error.cause) {
            try {
                if (typeof error.cause === 'object' && error.cause !== null && 'message' in error.cause) {
                     errorMessage += ` (Cause: ${(error.cause as Error).message})`;
                } else {
                    errorMessage += ` (Cause: ${JSON.stringify(error.cause)})`;
                }
            } catch (e) {
                errorMessage += ` (Cause: ${String(error.cause)})`;
            }
        }
    } else if (typeof error === 'string') {
        errorMessage = `Summarize bill failed: ${error}`;
    }
    return { success: false, error: errorMessage };
  }
}
