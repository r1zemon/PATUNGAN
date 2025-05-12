"use server";

import { scanReceipt, ScanReceiptOutput } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillOutput, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person } from "./types";

// Helper to convert File to Base64 Data URI
const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export async function handleScanReceiptAction(
  formData: FormData
): Promise<{ success: boolean; data?: ScanReceiptOutput; error?: string }> {
  const file = formData.get("receiptImage") as File;

  if (!file || file.size === 0) {
    return { success: false, error: "No file uploaded." };
  }

  // Validate file type (optional, but good practice)
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Please upload an image (JPEG, PNG, WebP)." };
  }
  
  try {
    const receiptDataUri = await fileToDataUri(file);
    const result = await scanReceipt({ receiptDataUri });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error scanning receipt:", error);
    return { success: false, error: "Failed to scan receipt. Please try again." };
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
    return { success: false, error: "Failed to summarize bill. Please try again." };
  }
}
