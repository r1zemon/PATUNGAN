
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

  // Calculate total bill to determine if there's anything to show beyond 0 totals.
  const totalBill = people.reduce((acc, person) => acc + (summary[person.name] || 0), 0);

  if (totalBill === 0 && people.every(person => (summary[person.name] || 0) === 0)) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Bill Breakdown</CardTitle>
          <CardDescription>Amount owed by each person.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Everyone owes $0.00. Nothing to split!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Bill Breakdown</CardTitle>
        <CardDescription>Amount owed by each person.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Person</TableHead>
                <TableHead className="text-right min-w-[100px]">Amount Owed</TableHead>
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
                          <AvatarImage src={`https://placehold.co/40x40.png?text=${person.name.substring(0,1)}`} alt={person.name} data-ai-hint="profile avatar" />
                          <AvatarFallback>{person.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{person.name}</span>
                      </div>
                    </TableCell>
                    <TableCell 
                      className="text-right" 
                      style={{ 
                        color: amountOwed > 0 
                          ? 'hsl(var(--primary-foreground))' 
                          : amountOwed < 0 
                          ? 'hsl(var(--destructive))' // Example for credit, if needed
                          : undefined 
                      }}
                    >
                      {formatCurrency(amountOwed)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    