
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
  return scanReceiptFlow(input);
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
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  },
});

const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async (input): Promise<ScanReceiptOutput> => {
    try {
      // Call the Genkit prompt.
      // `output` will be `ScanReceiptOutput | undefined`.
      // It's `undefined` if the model's response can't be parsed into `ScanReceiptOutputSchema`.
      const { output } = await scanReceiptPrompt(input);

      if (output && Array.isArray(output.items)) {
        // Successfully parsed, and `items` is an array (as per schema).
        return output;
      } else {
        // This covers cases where:
        // 1. `output` is undefined (e.g., parsing failed, model returned non-JSON or malformed JSON).
        // 2. `output` is an object, but `output.items` is not an array (model didn't adhere strictly for the `items` field,
        //    though Zod schema validation should ideally lead to `output` being undefined in such cases).
        //    This acts as a safeguard.
        console.warn(
          "ScanReceiptFlow: Prompt returned undefined output, or 'items' field was not a valid array. Defaulting to an empty items list. Received output structure (if any):",
          output // Log the actual problematic output if it's not undefined
        );
        return { items: [] }; // Adhere to ScanReceiptOutput schema by returning an empty list.
      }
    } catch (flowError) {
      // This catches errors from the `scanReceiptPrompt(input)` call itself,
      // e.g., network issues, Google AI API errors, quota issues, or unexpected errors within Genkit's processing.
      console.error(
        "ScanReceiptFlow: An error occurred during prompt execution or result processing. Defaulting to an empty items list. Error:",
        flowError
      );
      // Return a "graceful failure" state (empty items list).
      // This aligns with the prompt's instruction to return empty items for unreadable/invalid receipts
      // and provides a better user experience than a generic error.
      return { items: [] }; // Adhere to ScanReceiptOutput schema
    }
  }
);

