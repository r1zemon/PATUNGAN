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
      price: z.number().describe('The price of the item.'),
    })
  ).describe('A list of items extracted from the receipt.'),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  console.log("scanReceipt (wrapper): Calling scanReceiptFlow.");
  try {
    const result = await scanReceiptFlow(input);
    console.log("scanReceipt (wrapper): scanReceiptFlow completed.");
    return result;
  } catch (e) {
    console.error("scanReceipt (wrapper): Error calling scanReceiptFlow. This should ideally not happen if flow handles its errors.", e);
    // This path should ideally not be hit if scanReceiptFlow correctly handles all its internal errors and returns ScanReceiptOutput.
    // If it is hit, it means a more fundamental error occurred in Genkit or the flow definition.
    return { items: [] }; // Fallback to ensure type consistency
  }
}

const scanReceiptPrompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: {schema: ScanReceiptInputSchema},
  output: {schema: ScanReceiptOutputSchema},
  prompt: `You are an expert receipt scanner. Your task is to analyze the provided receipt image and extract a list of items, including their names and prices.
Please adhere strictly to the output JSON schema provided.
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
    // temperature: 0.1, // For potentially more deterministic JSON output
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
      console.log("ScanReceiptFlow: Received raw output from prompt. Attempting to stringify:", typeof output);
      
      // Log carefully as output might be undefined or complex
      try {
        console.log("ScanReceiptFlow: Raw output object:", JSON.stringify(output, null, 2));
      } catch (stringifyError) {
        console.warn("ScanReceiptFlow: Could not stringify raw output. Output:", output);
      }

      if (output && Array.isArray(output.items)) {
        console.log(`ScanReceiptFlow: Successfully parsed output. Number of items: ${output.items.length}`);
        return output;
      } else {
        console.warn(
          "ScanReceiptFlow: Prompt returned undefined, null, or malformed output (expected 'items' array). Defaulting to empty items list. Received output (logged above)."
        );
        return { items: [] };
      }
    } catch (flowError) {
      console.error("ScanReceiptFlow: Caught error during prompt execution or result processing. Defaulting to empty items list.");
      if (flowError instanceof Error) {
        console.error("Flow Error Message:", flowError.message);
        console.error("Flow Error Stack:", flowError.stack);
        if (flowError.cause) {
          try {
            console.error("Flow Error Cause:", JSON.stringify(flowError.cause, null, 2));
          } catch (e) {
            console.error("Flow Error Cause (could not stringify JSON):", flowError.cause);
          }
        }
      } else {
        // Attempt to log non-Error objects
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