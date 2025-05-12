
// 'use server';
/**
 * @fileOverview Summarizes the bill for each person based on the split items.
 *
 * - summarizeBill - A function that handles the bill summarization process.
 * - SummarizeBillInput - The input type for the summarizeBill function.
 * - SummarizeBillOutput - The return type for the summarizeBill function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeBillInputSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        分配给: z.array(z.string()),
      })
    )
    .describe('A list of items with their names, prices, and people assigned to them.'),
  people: z.array(z.string()).describe('A list of people involved in the bill split.'),
});

export type SummarizeBillInput = z.infer<typeof SummarizeBillInputSchema>;

const SummarizeBillOutputSchema = z.record(z.string(), z.number()).describe('A summary of each person and their total amount owed.');

export type SummarizeBillOutput = z.infer<typeof SummarizeBillOutputSchema>;

export async function summarizeBill(input: SummarizeBillInput): Promise<SummarizeBillOutput> {
  return summarizeBillFlow(input);
}

const summarizeBillPrompt = ai.definePrompt({
  name: 'summarizeBillPrompt',
  input: {schema: SummarizeBillInputSchema},
  output: {schema: SummarizeBillOutputSchema},
  prompt: `You are a bill splitting expert. You will receive a list of items, their prices, and who they are assigned to.
Your job is to create a summary of each person and their total amount owed.

Here is the item list:
{{#each items}}
- {{name}}: \${{price}} (Assigned to: {{#if 分配给.length}}{{#each 分配给}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}N/A{{/if}})
{{/each}}

Here is the list of people involved: {{people}}

Your output should be a JSON object where the keys are the names of the people and the values are the amount they owe. Only include people in the people array in the keys. Round to two decimal places.
`,
});

const summarizeBillFlow = ai.defineFlow(
  {
    name: 'summarizeBillFlow',
    inputSchema: SummarizeBillInputSchema,
    outputSchema: SummarizeBillOutputSchema,
  },
  async input => {
    const {output} = await summarizeBillPrompt(input);
    return output!;
  }
);

