
'use server';
/**
 * @fileOverview Summarizes the bill for each person based on the split items,
 * considering items with quantities, assignments, payer, tax, tip, and split strategy.
 *
 * - summarizeBill - A function that handles the bill summarization process.
 * - SummarizeBillInput - The input type for the summarizeBill function.
 * - SummarizeBillOutput - The return type for the summarizeBill function (RawBillSummary from types.ts).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RawBillSummary } from '@/lib/types'; // Using RawBillSummary for output type

const AssignedPersonSchema = z.object({
  personName: z.string().describe('The name of the person.'),
  count: z.number().describe('The number of units of this item assigned to this person.'),
});

const ItemDetailSchema = z.object({
  name: z.string().describe('The name of the item.'),
  unitPrice: z.number().describe('The price for a single unit of this item.'),
  quantity: z.number().describe('The total quantity of this item on the bill line (e.g., if the line was "3x Apples", quantity is 3).'),
  分配给: z.array(AssignedPersonSchema).describe('A list of people assigned to this item and how many units each person is responsible for.'),
});

const SummarizeBillInputSchema = z.object({
  items: z
    .array(ItemDetailSchema)
    .describe('A list of items with their names, unit prices, total quantities, and how many units are assigned to each person.'),
  people: z.array(z.string()).describe('A list of all people (names) involved in the bill split.'),
  payerName: z.string().describe('The name of the person who paid the entire bill initially.'),
  taxAmount: z.number().optional().default(0).describe('The total amount of tax for the bill.'),
  tipAmount: z.number().optional().default(0).describe('The total amount of tip for the bill.'),
  taxTipSplitStrategy: z.enum(["PAYER_PAYS_ALL", "SPLIT_EQUALLY"]).describe('Strategy for splitting tax and tip: "PAYER_PAYS_ALL" (payer bears all tax/tip) or "SPLIT_EQUALLY" (tax/tip is split equally among all people).'),
});

export type SummarizeBillInput = z.infer<typeof SummarizeBillInputSchema>;

// Define the AI output schema as an array of objects
const BillShareEntrySchema = z.object({
  personName: z.string().describe("The name of the person."),
  totalShare: z.number().describe("The person's total calculated fair share of the bill, rounded to two decimal places. This should be a positive number or zero."),
});

const AiOutputSchema = z.array(BillShareEntrySchema).describe('An array where each entry contains a personName and their totalShare.');


export type SummarizeBillOutput = RawBillSummary; // Alias to RawBillSummary, the flow will transform AiOutputSchema to this.


export async function summarizeBill(input: SummarizeBillInput): Promise<SummarizeBillOutput> {
  // Basic validation
  if (input.people.length === 0) {
    return {}; // Or throw error
  }
  return summarizeBillFlow(input);
}

const summarizeBillPrompt = ai.definePrompt({
  name: 'summarizeBillPrompt',
  input: {schema: SummarizeBillInputSchema},
  output: {schema: AiOutputSchema}, // AI will output an array of objects
  prompt: `You are a bill splitting expert. Your task is to calculate each person's total fair share of a bill.
The bill includes items, and potentially tax and a tip.

Inputs provided:
- List of items: For each item, its name, unit price, total quantity, and a list of people assigned to it with the count of units they took.
- List of all people involved: Names of everyone sharing the bill.
- Payer's name: The person who initially paid the entire bill.
- Tax amount: Total tax for the bill. (Defaults to 0 if not provided)
- Tip amount: Total tip for the bill. (Defaults to 0 if not provided)
- Tax & Tip Split Strategy: How tax and tip should be distributed. Options:
    - "PAYER_PAYS_ALL": The payer covers all tax and tip.
    - "SPLIT_EQUALLY": Tax and tip are split equally among all people involved.

Calculation Steps:
1.  For each person, calculate their subtotal for items: Sum of (item.unitPrice * count_assigned_to_person_for_that_item) for all items they were assigned.
2.  Calculate the total shared cost: taxAmount + tipAmount.
3.  Distribute the total shared cost (tax + tip) based on 'taxTipSplitStrategy':
    a.  If "PAYER_PAYS_ALL":
        - Each person's share of tax/tip is 0, EXCEPT for the payerName, whose share of tax/tip is (taxAmount + tipAmount).
    b.  If "SPLIT_EQUALLY":
        - If there are N people in the 'people' list, each person's share of tax/tip is (taxAmount + tipAmount) / N.
4.  For each person, calculate their total fair share: (Their subtotal for items) + (Their share of tax/tip from step 3).
5.  The output MUST be a JSON array of objects. Each object must contain 'personName' (string) and 'totalShare' (number, positive or zero, rounded to two decimal places).
    Include an entry for ALL people provided in the 'people' input list, even if their totalShare is 0.

Item Details:
{{#each items}}
- Item: {{name}}
  - Unit Price: {{unitPrice}}
  - Total Quantity on Bill: {{quantity}}
  - Assigned Units:
    {{#if 分配给.length}}
      {{#each 分配给}}
      - {{personName}}: {{count}} unit(s)
      {{/unless}}
    {{else}}
      - Not assigned to anyone.
    {{/if}}
{{/each}}

People Involved: {{#each people}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Payer: {{payerName}}
Tax Amount: {{taxAmount}}
Tip Amount: {{tipAmount}}
Tax/Tip Split Strategy: {{taxTipSplitStrategy}}

Provide the final JSON output as an array of objects, each with "personName" and "totalShare".
Example:
[
  { "personName": "Alice", "totalShare": 25.00 },
  { "personName": "Bob", "totalShare": 30.50 },
  { "personName": "Charlie", "totalShare": 5.00 }
]
If a person has no items and tax/tip is split equally, their share is their portion of tax/tip. If tax/tip is paid by payer and they have no items, their share is 0.
`,
  config: {
    temperature: 0.0, // For precise calculation
     safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  }
});

const summarizeBillFlow = ai.defineFlow(
  {
    name: 'summarizeBillFlow',
    inputSchema: SummarizeBillInputSchema,
    outputSchema: AiOutputSchema, // Flow now internally expects an array of objects from the prompt
  },
  async (input: SummarizeBillInput): Promise<SummarizeBillOutput> => { // Returns RawBillSummary
    console.log("summarizeBillFlow: Input received:", JSON.stringify(input));
    const {output: aiGeneratedOutputArray} = await summarizeBillPrompt(input); // This is Array<{personName: string, totalShare: number}> | undefined
    
    const transformedSummary: RawBillSummary = {};
    if (aiGeneratedOutputArray) {
      aiGeneratedOutputArray.forEach(entry => {
        if (entry && typeof entry.personName === 'string' && typeof entry.totalShare === 'number') {
          transformedSummary[entry.personName] = entry.totalShare;
        } else {
          console.warn("summarizeBillFlow: Invalid entry in AI output array:", entry);
        }
      });
    } else {
      console.warn("summarizeBillFlow: AI output array was null or undefined.");
    }
    
    // Ensure all people from the input list are in the output, defaulting to 0 if not present from AI
    // and ensure positive values as per schema description.
    const result: SummarizeBillOutput = {};
    const numberOfPeople = input.people.length;

    input.people.forEach(personName => {
      let calculatedShare = transformedSummary[personName] ?? 0; // Use transformed summary
      
      // Fallback logic / simple calculation if AI fails or to verify basic cases
      // This is a simplified client-side calculation for robustness, AI should ideally handle all complexities.
      if ((!aiGeneratedOutputArray || aiGeneratedOutputArray.length === 0) && numberOfPeople > 0 && Object.keys(transformedSummary).length === 0) {
        console.warn("AI output was effectively empty, attempting basic calculation for person:", personName);
        let itemSubtotal = 0;
        input.items.forEach(item => {
          item.分配给.forEach(assignment => {
            if (assignment.personName === personName) {
              itemSubtotal += item.unitPrice * assignment.count;
            }
          });
        });

        let taxTipShare = 0;
        const totalTaxTip = (input.taxAmount || 0) + (input.tipAmount || 0);
        if (input.taxTipSplitStrategy === "SPLIT_EQUALLY" && numberOfPeople > 0) {
          taxTipShare = totalTaxTip / numberOfPeople;
        } else if (input.taxTipSplitStrategy === "PAYER_PAYS_ALL" && personName === input.payerName) {
          taxTipShare = totalTaxTip;
        }
        calculatedShare = itemSubtotal + taxTipShare;
      }
      
      // Ensure positive and two decimal places
      result[personName] = parseFloat(Math.max(0, calculatedShare).toFixed(2));
    });
    
    console.log("summarizeBillFlow: Processed output (transformed to Record<string, number>):", JSON.stringify(result));
    return result; // Return the RawBillSummary format
  }
);

