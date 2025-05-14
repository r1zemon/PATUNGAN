
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
  assignedTo: z.array(AssignedPersonSchema).describe('A list of people assigned to this item and how many units each person is responsible for.'),
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

const BillShareEntrySchema = z.object({
  personName: z.string().describe("The name of the person."),
  totalShare: z.number().describe("The person's total calculated fair share of the bill, rounded to two decimal places. This should be a positive number or zero."),
});

const AiOutputSchema = z.array(BillShareEntrySchema).describe('An array where each entry contains a personName and their totalShare.');

// This is the type the summarizeBill wrapper function (and the app) will ultimately consume.
export type SummarizeBillOutput = RawBillSummary;

export async function summarizeBill(input: SummarizeBillInput): Promise<SummarizeBillOutput> {
  if (input.people.length === 0) {
    console.warn("summarizeBill (wrapper): No people provided, returning empty summary.");
    return {};
  }

  // Call the flow, which should return an array of {personName, totalShare}
  const aiResultArray = await summarizeBillFlow(input);

  const transformedSummary: RawBillSummary = {};
  if (aiResultArray && Array.isArray(aiResultArray)) {
    aiResultArray.forEach(entry => {
      if (entry && typeof entry.personName === 'string' && typeof entry.totalShare === 'number') {
        // Ensure totalShare is positive and rounded
        transformedSummary[entry.personName] = parseFloat(Math.max(0, entry.totalShare).toFixed(2));
      } else {
        console.warn("summarizeBill (wrapper): Invalid entry in AI output array:", entry);
      }
    });
  } else {
    console.warn("summarizeBill (wrapper): AI output was not an array or was null/undefined.");
  }

  // Ensure all people from the input list are in the final summary, defaulting to 0 if not present
  const finalSummary: RawBillSummary = {};
  let allPeopleCovered = true;
  input.people.forEach(personName => {
    if (transformedSummary[personName] !== undefined) {
      finalSummary[personName] = transformedSummary[personName];
    } else {
      finalSummary[personName] = 0; // Default to 0 if AI didn't include them
      allPeopleCovered = false; // Mark if someone was missing from AI output
    }
  });

  // Fallback logic if AI output was empty or problematic (e.g., didn't cover all people)
  const wasAiOutputProblematic = Object.keys(transformedSummary).length === 0 || !allPeopleCovered;

  if (wasAiOutputProblematic) {
    console.warn("summarizeBill (wrapper): AI output was incomplete or empty. Attempting basic fallback calculation.");
    const numberOfPeople = input.people.length;
    if (numberOfPeople > 0) {
        input.people.forEach(personName => {
            let itemSubtotal = 0;
            input.items.forEach(item => {
                item.assignedTo.forEach(assignment => {
                    if (assignment.personName === personName) {
                        itemSubtotal += item.unitPrice * assignment.count;
                    }
                });
            });

            let taxTipShare = 0;
            const totalTaxTip = (input.taxAmount || 0) + (input.tipAmount || 0);
            if (input.taxTipSplitStrategy === "SPLIT_EQUALLY") {
                taxTipShare = totalTaxTip / numberOfPeople;
            } else if (input.taxTipSplitStrategy === "PAYER_PAYS_ALL" && personName === input.payerName) {
                taxTipShare = totalTaxTip;
            }
            // Overwrite or fill finalSummary for this person with fallback
            finalSummary[personName] = parseFloat(Math.max(0, itemSubtotal + taxTipShare).toFixed(2));
        });
    }
  }
  
  console.log("summarizeBill (wrapper): Final processed summary:", JSON.stringify(finalSummary));
  return finalSummary;
}

const summarizeBillPrompt = ai.definePrompt({
  name: 'summarizeBillPrompt',
  input: {schema: SummarizeBillInputSchema},
  output: {schema: AiOutputSchema}, // AI must output an array of objects as per this schema
  prompt: `You are a bill splitting expert. Your task is to calculate each person's total fair share of a bill.
The bill includes items, and potentially tax and a tip.

Inputs provided:
- List of items: For each item, its name, unit price, total quantity, and a list of people assigned to it with the count of units they took.
- List of all people involved: Names of everyone sharing the bill. (Total number of people: {{people.length}})
- Payer's name: The person who initially paid the entire bill.
- Tax amount: Total tax for the bill. (Defaults to 0 if not provided)
- Tip amount: Total tip for the bill. (Defaults to 0 if not provided)
- Tax & Tip Split Strategy: How tax and tip should be distributed. Options:
    - "PAYER_PAYS_ALL": The payer covers all tax and tip.
    - "SPLIT_EQUALLY": Tax and tip are split equally among all people involved.

Calculation Steps:
1.  For each person, calculate their subtotal for items by summing (item.unitPrice * count_assigned_to_person_for_that_item) for all items they were assigned. Let's call this 'PersonItemSubtotal'.
2.  Determine each person's share of tax and tip:
    a.  If 'taxTipSplitStrategy' is "PAYER_PAYS_ALL":
        - For the 'payerName': Their 'PersonTaxTipShare' is (taxAmount + tipAmount).
        - For all other people: Their 'PersonTaxTipShare' is 0.
    b.  If 'taxTipSplitStrategy' is "SPLIT_EQUALLY":
        - Let N be the total number of people in the 'people' list (which is {{people.length}}).
        - For EACH person in the 'people' list: Their 'PersonTaxTipShare' is (taxAmount + tipAmount) / N.
3.  For EACH person, calculate their 'totalShare': 'PersonItemSubtotal' + 'PersonTaxTipShare'.
4.  The output MUST be a JSON array of objects. Each object must contain 'personName' (string) and 'totalShare' (number, rounded to two decimal places, positive or zero).
    Include an entry for ALL people provided in the 'people' input list, even if their totalShare is 0.

Item Details:
{{#each items}}
- Item: {{name}}
  - Unit Price: {{unitPrice}}
  - Total Quantity on Bill: {{quantity}}
  - Assigned Units:
    {{#if assignedTo.length}}
      {{#each assignedTo}}
      - {{personName}}: {{count}} unit(s)
      {{/each}}
    {{else}}
      - Not assigned to anyone.
    {{/if}}
{{/each}}

People Involved: {{#each people}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} (Count: {{people.length}})
Payer: {{payerName}}
Tax Amount: {{taxAmount}}
Tip Amount: {{tipAmount}}
Tax/Tip Split Strategy: {{taxTipSplitStrategy}}

Provide the final JSON output STRICTLY as an array of objects, each with "personName" and "totalShare".
Example:
[
  { "personName": "Alice", "totalShare": 25.00 },
  { "personName": "Bob", "totalShare": 30.50 },
  { "personName": "Charlie", "totalShare": 5.00 }
]
If a person has no items and tax/tip is split equally, their share is their portion of tax/tip. If tax/tip is paid by payer and they have no items, their share is 0. Ensure all people in 'People Involved' are in the output array.
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

// This flow's implementation now directly returns what its outputSchema (AiOutputSchema) defines.
const summarizeBillFlow = ai.defineFlow(
  {
    name: 'summarizeBillFlow',
    inputSchema: SummarizeBillInputSchema,
    outputSchema: AiOutputSchema, // Flow's output schema is an array of objects
  },
  async (input: SummarizeBillInput): Promise<z.infer<typeof AiOutputSchema>> => { // Return type matches outputSchema
    console.log("summarizeBillFlow: Input received:", JSON.stringify(input));
    const {output: aiGeneratedOutputArray} = await summarizeBillPrompt(input);
    
    if (aiGeneratedOutputArray && Array.isArray(aiGeneratedOutputArray)) {
      // Basic validation of the array structure from AI
      const validatedArray = aiGeneratedOutputArray
        .filter(entry => entry && typeof entry.personName === 'string' && typeof entry.totalShare === 'number')
        .map(entry => ({
          personName: entry.personName,
          totalShare: parseFloat(Math.max(0, entry.totalShare).toFixed(2)) // Ensure positive and rounded
        }));

      // Ensure all people from input are represented in the output array, even if with 0 share
      // This is important if the AI forgets someone.
      const peopleInOutput = new Set(validatedArray.map(p => p.personName));
      input.people.forEach(inputPersonName => {
        if (!peopleInOutput.has(inputPersonName)) {
          validatedArray.push({ personName: inputPersonName, totalShare: 0 });
        }
      });
      
      console.log("summarizeBillFlow: AI generated valid array output, after ensuring all people covered:", JSON.stringify(validatedArray));
      return validatedArray;
    } else {
      console.warn("summarizeBillFlow: AI output was not a valid array or was null/undefined. Returning default array with 0 shares for all people.");
      // Construct a default array matching the schema if AI fails badly
      return input.people.map(name => ({ personName: name, totalShare: 0 }));
    }
  }
);

