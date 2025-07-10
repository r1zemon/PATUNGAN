// Scans a receipt image and extracts item details including quantity, unit price, and total tax.
//
// - scanReceipt - Extracts item details from a receipt image.
// - ScanReceiptInput - Input schema for the receipt scanning.
// - ScanReceiptOutput - Output schema for the extracted receipt details.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanReceiptInputSchema = z.object({
  receiptDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptInput = z.infer<typeof ScanReceiptInputSchema>;

const ReceiptItemSchema = z.object({
  name: z.string().describe('The name of the item line (e.g., "Apple", "Mie Gacoan").'),
  unitPrice: z.number().describe('The numerical unit price of the item (e.g., for "3x Apples at 30000 total", unitPrice is 10000). If only total price is available, calculate the unit price. If price is per item, this is that price.'),
  quantity: z.number().describe('The quantity of this item on the line (e.g., for "3x Apples", quantity is 3). If no quantity is specified, assume 1.').default(1),
});
export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;

const ScanReceiptOutputSchema = z.object({
  items: z.array(ReceiptItemSchema).describe('A list of items extracted from the receipt, with their name, quantity, and unit price.'),
  taxAmount: z.number().optional().describe("The total tax amount found on the receipt (e.g., PPN, Tax). If not found, this should be 0.").default(0),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  console.log("scanReceipt (wrapper): Calling scanReceiptFlow.");
  try {
    const result = await scanReceiptFlow(input);
    console.log("scanReceipt (wrapper): scanReceiptFlow completed with result:", JSON.stringify(result));
    
    const validatedItems = result.items.map(item => ({
      name: String(item.name || "Unknown Item"),
      unitPrice: Number(item.unitPrice) || 0,
      quantity: item.quantity === undefined ? 1 : Number(item.quantity) || 1,
    }));

    const validatedTax = Number(result.taxAmount) || 0;

    return { items: validatedItems, taxAmount: validatedTax };
  } catch (e) {
    console.error("scanReceipt (wrapper): Error calling scanReceiptFlow:", e);
    return { items: [], taxAmount: 0 };
  }
}

const scanReceiptPrompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: {schema: ScanReceiptInputSchema},
  output: {schema: ScanReceiptOutputSchema},
  prompt: `You are an expert receipt processing AI. Your task is to analyze the provided receipt image and extract a list of line items and the total tax amount.

For each line item on the receipt:
1.  Identify the item name (e.g., "Mie Gacoan", "Susu Kotak").
2.  Identify the quantity of that item on the line (e.g., if it says "3x Mie Gacoan", the quantity is 3). If no quantity is explicitly mentioned for an item, assume it is 1.
3.  Identify the unit price.
    - If the receipt shows "3x Mie Gacoan Total 30000", the item name is "Mie Gacoan", quantity is 3, and unit price is 10000.
    - If the receipt shows "Susu Kotak 2 pcs @ 5000", the item name is "Susu Kotak", quantity is 2, and unit price is 5000.
    - If the receipt shows "Nasi Goreng 15000" (implying quantity 1), the item name is "Nasi Goreng", quantity is 1, and unit price is 15000.
    - Do NOT expand multi-quantity items into individual entries. Extract them as a single line item with its corresponding quantity and unit price.

For the entire receipt:
1.  Identify the total tax amount. Look for keywords like "Tax", "PPN", "Pajak". The 'taxAmount' field should be a single number representing this total. If no tax is explicitly listed, set 'taxAmount' to 0.

Prices might be formatted with commas as thousands separators (e.g., 20,000) or periods (e.g., 12.500 or 12.500,00). Ignore currency symbols like 'Rp' or 'IDR'. Convert all prices to a simple numerical value (e.g., 20000, 12500). All output fields for prices and quantities MUST be numbers.

Please adhere strictly to the output JSON schema provided.
If the image is not a receipt, or if no items can be clearly identified, return an empty list of items and tax 0 by outputting: {"items": [], "taxAmount": 0}.
If there are any issues determining item names, unit prices, or quantities accurately, it is better to omit problematic items than to provide incorrect data.

Receipt Image: {{media url=receiptDataUri}}`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
    temperature: 0.1, // Very low temperature for deterministic JSON and calculation.
  },
});

const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async (input): Promise<ScanReceiptOutput> => {
    console.log(`ScanReceiptFlow: Started. Input receiptDataUri (first 100 chars): ${input.receiptDataUri.substring(0,100)}...`);
    try {
      console.log("ScanReceiptFlow: Attempting to call scanReceiptPrompt...");
      const { output } = await scanReceiptPrompt(input);
      
      if (output && output.items) {
        console.log("ScanReceiptFlow: Prompt output received. Items count:", output.items.length);
        if (output.items.length > 0) {
             console.log("ScanReceiptFlow: First item example:", JSON.stringify(output.items[0]));
        }
        const processedItems = output.items.map(item => ({
          name: String(item.name || "Unknown Item"),
          unitPrice: Number(item.unitPrice) || 0,
          quantity: item.quantity === undefined ? 1 : Number(item.quantity) || 1,
        }));
        
        const processedTax = Number(output.taxAmount) || 0;
        console.log(`ScanReceiptFlow: Successfully parsed. Items: ${processedItems.length}, Tax: ${processedTax}`);
        return { items: processedItems, taxAmount: processedTax };
      } else {
        console.warn("ScanReceiptFlow: Prompt returned null, undefined, or 'items' key was missing. Defaulting to empty list and 0 tax.");
        return { items: [], taxAmount: 0 };
      }
    } catch (flowError) {
      console.error("ScanReceiptFlow: Caught error during prompt execution or result processing. Defaulting to empty list and 0 tax.", flowError);
      if (flowError instanceof Error) {
        console.error("Flow Error Name:", flowError.name);
        console.error("Flow Error Message:", flowError.message);
        if (flowError.cause) {
            try {
                const causeString = String(flowError.cause);
                console.error("Flow Error Cause (first 1000 chars):", causeString.substring(0, 1000) + (causeString.length > 1000 ? "..." : ""));
            } catch (e) {
                console.error("Flow Error Cause (could not stringify):", flowError.cause);
            }
        }
      }
      return { items: [], taxAmount: 0 };
    }
  }
);
