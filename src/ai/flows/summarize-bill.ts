
// 'use server';
/**
 * @fileOverview Summarizes the bill for each person based on the split items,
 * considering items with quantities and assignments of counts to people.
 *
 * - summarizeBill - A function that handles the bill summarization process.
 * - SummarizeBillInput - The input type for the summarizeBill function.
 * - SummarizeBillOutput - The return type for the summarizeBill function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  people: z.array(z.string()).describe('A list of all people involved in the bill split.'),
});

export type SummarizeBillInput = z.infer<typeof SummarizeBillInputSchema>;

const SummarizeBillOutputSchema = z.record(z.string(), z.number()).describe('A summary of each person and their total amount owed. Keys are person names from the input people list.');

export type SummarizeBillOutput = z.infer<typeof SummarizeBillOutputSchema>;

export async function summarizeBill(input: SummarizeBillInput): Promise<SummarizeBillOutput> {
  return summarizeBillFlow(input);
}

const summarizeBillPrompt = ai.definePrompt({
  name: 'summarizeBillPrompt',
  input: {schema: SummarizeBillInputSchema},
  output: {schema: SummarizeBillOutputSchema},
  prompt: `You are a bill splitting expert. You will receive a list of items, their unit prices, total quantities, and how many units of each item are assigned to specific people.
Your job is to create a summary of each person and their total amount owed.
The total amount for a person for an item is (item.unitPrice * assigned_count_for_that_person). Sum these amounts for all items for each person.

Here is the item list:
{{#each items}}
- {{name}}: \${{unitPrice}} per unit (Total quantity on bill: {{quantity}})
  Assigned:
  {{#if 分配给.length}}
    {{#each 分配给}}
    - {{personName}}: {{count}} unit(s)
    {{/each}}
  {{else}}
    - Not assigned to anyone.
  {{/if}}
{{/each}}

Here is the list of ALL people involved: {{#join people ", "}}{{/join}}

Your output should be a JSON object where the keys are the names of the people (from the provided 'people' list) and the values are the total amount they owe.
If a person from the 'people' list is not assigned to any item, their total owed should be 0.
Round all total amounts to two decimal places.
Ensure all people in the 'people' list are present as keys in the output JSON, even if their amount owed is 0.
`,
});

const summarizeBillFlow = ai.defineFlow(
  {
    name: 'summarizeBillFlow',
    inputSchema: SummarizeBillInputSchema,
    outputSchema: SummarizeBillOutputSchema,
  },
  async (input: SummarizeBillInput): Promise<SummarizeBillOutput> => {
    const {output} = await summarizeBillPrompt(input);
    
    // Ensure all people from the input list are in the output, defaulting to 0 if not present
    const result: SummarizeBillOutput = {};
    input.people.forEach(personName => {
      result[personName] = output?.[personName] ?? 0;
    });
    
    return result;
  }
);
