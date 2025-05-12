"use client";

import type { BillSummaryData, Person } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils"; // Assuming you'll create this utility

interface SummaryDisplayProps {
  summary: BillSummaryData | null;
  people: Person[]; // To display all people, even if they owe 0
}

export function SummaryDisplay({ summary, people }: SummaryDisplayProps) {
  if (!summary) {
    return <p className="text-muted-foreground">Bill summary will be shown here once calculated.</p>;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Bill Breakdown</CardTitle>
        <CardDescription>Amount owed by each person.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="text-right">Amount Owed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => {
              const amountOwed = summary[person.name] || 0;
              return (
                <TableRow key={person.id} className={amountOwed > 0 ? "font-medium" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://picsum.photos/seed/${person.name}/40/40`} alt={person.name} data-ai-hint="profile avatar" />
                        <AvatarFallback>{person.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{person.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" style={{ color: amountOwed > 0 ? 'hsl(var(--accent-foreground))' : undefined }}>
                    {formatCurrency(amountOwed)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
