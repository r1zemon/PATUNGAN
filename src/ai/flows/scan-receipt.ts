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

const ScanReceiptOutputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('The name of the item.'),
      price: z.number().describe('The numerical price of the item (e.g., 12500, not "12.500" or "12,500 IDR").'),
    })
  ).describe('A list of items extracted from the receipt.'),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  console.log("scanReceipt (wrapper): Calling scanReceiptFlow.");
  try {
    const result = await scanReceiptFlow(input);
    console.log("scanReceipt (wrapper): scanReceiptFlow completed with result:", JSON.stringify(result));
    return result;
  } catch (e) {
    console.error("scanReceipt (wrapper): Error calling scanReceiptFlow. This should ideally not happen if flow handles its errors.", e);
    // This path implies a fundamental issue or an unhandled rejection not caught by the flow's internal try/catch.
    // To fulfill the Promise<ScanReceiptOutput> contract and signal error to the action layer,
    // re-throwing is one option, but the action layer expects a resolved promise.
    // Returning a specific error structure within ScanReceiptOutput might be another, but the current design is simpler.
    // For now, maintain the existing behavior of returning empty items, but acknowledge this is a fallback.
    // The action layer's handling of the response from this function is key.
    return { items: [] }; 
  }
}

const scanReceiptPrompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: {schema: ScanReceiptInputSchema},
  output: {schema: ScanReceiptOutputSchema},
  prompt: `You are an expert receipt processing AI. Your task is to analyze the provided receipt image, which may be from various regions including Indonesia, and extract a list of items. For each item, identify its name and its total price.
- Item Name: Extract the descriptive name of the item. If an item has a quantity (e.g., "2x Apple"), extract the name as "Apple".
- Item Price: Extract the final price for the item listed. Prices might be formatted with commas as thousands separators (e.g., 20,000) or periods (e.g., 12.500 or 12.500,00). Some receipts might show price per unit and total price; use the total price for the line item. Ignore currency symbols like 'Rp' or 'IDR'. Convert the price to a simple numerical value (e.g., 20000, 12500). Ensure this is a number.

Please adhere strictly to the output JSON schema provided, ensuring the 'price' field is a number.
If the image is not a receipt, or if no items can be clearly identified, return an empty list of items by outputting: {"items": []}.

Receipt Image: {{media url=receiptDataUri}}`,
  config: {
    // model: ai.getModel(), // Uses default model from genkit.ts
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
    temperature: 0.2, // Lower temperature for more deterministic JSON output
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
      // console.log("ScanReceiptFlow: Received raw output from prompt. Type:", typeof output);
      
      // Avoid overly verbose logging of the entire output object if it's large or complex
      // Instead, focus on the critical parts for debugging.
      if (output) {
        console.log("ScanReceiptFlow: Prompt output received. Checking structure. Output keys:", Object.keys(output));
        if (output.items) {
          console.log("ScanReceiptFlow: 'items' key exists. IsArray:", Array.isArray(output.items), "Length:", Array.isArray(output.items) ? output.items.length : "N/A");
          if (Array.isArray(output.items) && output.items.length > 0) {
             console.log("ScanReceiptFlow: First item example (if any):", JSON.stringify(output.items[0]));
          }
        } else {
          console.log("ScanReceiptFlow: 'items' key MISSING in output.");
        }
      } else {
        console.log("ScanReceiptFlow: Prompt output is null or undefined.");
      }


      if (output && Array.isArray(output.items)) {
        // Further validation can be added here if needed, e.g., check if prices are numbers
        const allPricesAreNumbers = output.items.every(item => typeof item.price === 'number' && !isNaN(item.price));
        if (!allPricesAreNumbers) {
          console.warn("ScanReceiptFlow: Some items have non-numeric prices despite schema. Output:", JSON.stringify(output.items.filter(item => typeof item.price !== 'number')));
          // Depending on strictness, could return { items: [] } or try to filter valid items.
          // For now, rely on Zod to have caught this at the prompt level, making `output` null if non-compliant.
        }
        console.log(`ScanReceiptFlow: Successfully parsed output. Number of items: ${output.items.length}`);
        return output;
      } else {
        console.warn(
          "ScanReceiptFlow: Prompt returned undefined, null, or malformed output (expected 'items' array). Defaulting to empty items list. Raw output (if any) logged above."
        );
        return { items: [] };
      }
    } catch (flowError) {
      console.error("ScanReceiptFlow: Caught error during prompt execution or result processing. Defaulting to empty items list.");
      if (flowError instanceof Error) {
        console.error("Flow Error Name:", flowError.name);
        console.error("Flow Error Message:", flowError.message);
        // console.error("Flow Error Stack:", flowError.stack); // Stack can be very verbose
        if (flowError.cause) {
          try {
            // Log cause carefully, it might be large or circular
            const causeString = String(flowError.cause);
            console.error("Flow Error Cause:", causeString.substring(0, 500) + (causeString.length > 500 ? "..." : ""));
          } catch (e) {
            console.error("Flow Error Cause (could not stringify or convert to string):", flowError.cause);
          }
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
