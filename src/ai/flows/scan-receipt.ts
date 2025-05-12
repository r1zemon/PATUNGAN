// Scans a receipt image and extracts item details.
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
  name: z.string().describe('The name of the individual item. If the original line item was for "3x Apples", this should be "Apple".'),
  price: z.number().describe('The numerical unit price of the individual item (e.g., 12500). If an original line item was for "3x Apples" at 30000 total, this should be "Apple" with a price of 10000.'),
  quantity: z.number().describe('The quantity of this specific item entry. This will typically be 1, as multiple-quantity line items should be expanded into individual items. For example, if a receipt says "3x Apples", the output should contain three items, each with quantity 1.').default(1),
});

const ScanReceiptOutputSchema = z.object({
  items: z.array(ReceiptItemSchema).describe('A list of individual items extracted from the receipt. If a line item on the receipt has a quantity N > 1 (e.g., "3x Apples"), this list should contain N separate entries for "Apple", each with its unit price and quantity 1.'),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  console.log("scanReceipt (wrapper): Calling scanReceiptFlow.");
  try {
    const result = await scanReceiptFlow(input);
    console.log("scanReceipt (wrapper): scanReceiptFlow completed with result:", JSON.stringify(result));
    // Ensure all items have a quantity, defaulting to 1 if not provided by the model
    const itemsWithQuantity = result.items.map(item => ({
      ...item,
      quantity: item.quantity === undefined ? 1 : Number(item.quantity) || 1, // Ensure quantity is a number and defaults to 1
      price: Number(item.price) || 0 // Ensure price is a number
    }));
    return { items: itemsWithQuantity };
  } catch (e) {
    console.error("scanReceipt (wrapper): Error calling scanReceiptFlow:", e);
    return { items: [] };
  }
}

const scanReceiptPrompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: {schema: ScanReceiptInputSchema},
  output: {schema: ScanReceiptOutputSchema},
  prompt: `You are an expert receipt processing AI. Your task is to analyze the provided receipt image and extract a list of **individual items**.

For each line item on the receipt:
1.  Identify the item name.
2.  Identify the quantity of that item. If no quantity is specified, assume it is 1.
3.  Identify the price. This could be a unit price or a total price for a quantity.
4.  For each item found, you MUST output an entry in the 'items' array.
    - The 'name' field should be the singular item name (e.g., "Mie Gacoan" from "3x Mie Gacoan", "Susu Kotak" from "Susu Kotak 2 pcs").
    - The 'price' field MUST be the **unit price** of the item. If the receipt shows a total price for multiple units, calculate the unit price.
    - The 'quantity' field for each item entry in the output array MUST always be 1. You will expand multi-quantity line items into individual item entries.

    Example: If receipt says "3x Mie Gacoan Total 30000", you should output three items like this:
        { "name": "Mie Gacoan", "price": 10000, "quantity": 1 },
        { "name": "Mie Gacoan", "price": 10000, "quantity": 1 },
        { "name": "Mie Gacoan", "price": 10000, "quantity": 1 }

    Example: If receipt says "Susu Kotak 2 pcs @ 5000", you should output two items like this:
        { "name": "Susu Kotak", "price": 5000, "quantity": 1 },
        { "name": "Susu Kotak", "price": 5000, "quantity": 1 }

    Example: If receipt says "Nasi Goreng 15000", you should output one item:
        { "name": "Nasi Goreng", "price": 15000, "quantity": 1 }


Prices might be formatted with commas as thousands separators (e.g., 20,000) or periods (e.g., 12.500 or 12.500,00). Ignore currency symbols like 'Rp' or 'IDR'. Convert all prices to a simple numerical value (e.g., 20000, 12500). The 'price' field in your output MUST be a number.

Please adhere strictly to the output JSON schema provided, ensuring each item in the 'items' array has 'name', 'price', and 'quantity' (which should be 1).
If the image is not a receipt, or if no items can be clearly identified, return an empty list of items by outputting: {"items": []}.
If there are any issues determining item names or prices accurately, it is better to omit problematic items than to provide incorrect data.

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
      
      if (output) {
        console.log("ScanReceiptFlow: Prompt output received. Checking structure. Output keys:", Object.keys(output));
        if (output.items) {
          console.log("ScanReceiptFlow: 'items' key exists. IsArray:", Array.isArray(output.items), "Length:", Array.isArray(output.items) ? output.items.length : "N/A");
          if (Array.isArray(output.items) && output.items.length > 0) {
             console.log("ScanReceiptFlow: First item example (if any):", JSON.stringify(output.items[0]));
          }
          // Ensure all items have a quantity, defaulting to 1, and price is a number
          const processedItems = output.items.map(item => ({
            ...item,
            name: String(item.name || "Unknown Item"),
            price: Number(item.price) || 0,
            quantity: item.quantity === undefined ? 1 : Number(item.quantity) || 1,
          }));
          console.log(`ScanReceiptFlow: Successfully parsed and processed output. Number of items: ${processedItems.length}`);
          return { items: processedItems };

        } else {
          console.log("ScanReceiptFlow: 'items' key MISSING in output.");
        }
      } else {
        console.log("ScanReceiptFlow: Prompt output is null or undefined. This usually means the model could not conform to the schema or an error occurred within the prompt execution.");
      }

      // If output is not valid or 'items' key is missing, return empty items.
      console.warn(
        "ScanReceiptFlow: Prompt returned undefined, null, or malformed output (expected 'items' array). Defaulting to empty items list."
      );
      return { items: [] };

    } catch (flowError) {
      console.error("ScanReceiptFlow: Caught error during prompt execution or result processing. Defaulting to empty items list.");
      if (flowError instanceof Error) {
        console.error("Flow Error Name:", flowError.name);
        console.error("Flow Error Message:", flowError.message);
        if (flowError.cause) {
            try {
                const causeString = String(flowError.cause);
                console.error("Flow Error Cause:", causeString.substring(0, 1000) + (causeString.length > 1000 ? "..." : ""));
                if (typeof flowError.cause === 'object' && flowError.cause !== null) {
                    const causeObj = flowError.cause as any;
                    if (causeObj.message) console.error("Flow Error Cause Message:", causeObj.message);
                    if (causeObj.stack) console.error("Flow Error Cause Stack (first 500 chars):", String(causeObj.stack).substring(0,500));
                    if (causeObj.name === 'CandidatesError' && causeObj.response?.data) {
                         console.error("CandidatesError Response Data:", JSON.stringify(causeObj.response.data, null, 2));
                    }
                }
            } catch (e) {
                console.error("Flow Error Cause (could not stringify or convert to string):", flowError.cause);
            }
        } else {
           console.error("Flow Error Stack (first 500 chars):", String(flowError.stack).substring(0,500));
        }
      } else {
        try {
          console.error("Full Flow Error Object (non-Error type):", JSON.stringify(flowError, null, 2));
        } catch (e) {
          console.error("Full Flow Error Object (non-Error type, could not stringify JSON):", flowError);
        }
      }
      return { items: [] };
    }
  }
);
