
"use client";

import { useState, useEffect } from "react";
import type { ScannedItem, SplitItem, Person, BillSummaryData } from "@/lib/types";
import { handleScanReceiptAction, handleSummarizeBillAction } from "@/lib/actions";
import { ReceiptUploader } from "@/components/receipt-uploader";
import { ItemEditor } from "@/components/item-editor";
import { SummaryDisplay } from "@/components/summary-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Coins } from "lucide-react";

const DUMMY_PEOPLE: Person[] = [
  { id: "person_1", name: "Alice" },
  { id: "person_2", name: "Bob" },
  { id: "person_3", name: "Charlie" },
  { id: "person_4", name: "Diana" },
];

export default function SplitBillPage() {
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [people] = useState<Person[]>(DUMMY_PEOPLE);
  const [billSummary, setBillSummary] = useState<BillSummaryData | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleScanReceipt = async (receiptDataUri: string) => {
    setIsScanning(true);
    setError(null);
    setBillSummary(null); 

    const result = await handleScanReceiptAction(receiptDataUri);
    if (result.success && result.data) {
      // result.data.items are of type {id, name, unitPrice, quantity}
      const newSplitItems: SplitItem[] = result.data.items.map(item => ({
        ...item, // id, name, unitPrice, quantity
        assignedTo: [], // Initialize with empty assignments
      }));
      setSplitItems(newSplitItems);
      toast({ title: "Receipt Scanned", description: `${newSplitItems.length} item lines found.` });
    } else {
      setError(result.error || "Failed to scan receipt.");
      toast({ variant: "destructive", title: "Scan Failed", description: result.error || "Could not process the receipt." });
    }
    setIsScanning(false);
  };

  const handleUpdateItem = (updatedItem: SplitItem) => {
    setSplitItems((prevItems) =>
      prevItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setBillSummary(null); 
  };

  const handleAddItem = () => {
    const newItem: SplitItem = {
      id: `manual_${Date.now()}`,
      name: "New Item",
      unitPrice: 0,
      quantity: 1,
      assignedTo: [],
    };
    setSplitItems(prevItems => [...prevItems, newItem]);
    setBillSummary(null);
  };

  const handleDeleteItem = (itemId: string) => {
    setSplitItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setBillSummary(null);
  };

  const handleCalculateSummary = async () => {
    setIsCalculating(true);
    setError(null);

    // Validate if all items are fully assigned or if user wants to proceed with unassigned items
    const partiallyAssignedItems = splitItems.filter(item => {
        const totalAssignedCount = item.assignedTo.reduce((sum, assignment) => sum + assignment.count, 0);
        return totalAssignedCount > 0 && totalAssignedCount < item.quantity;
    });

    if (partiallyAssignedItems.length > 0) {
        // For now, we'll let the AI handle potentially unassigned portions.
        // A confirmation dialog could be added here in a future iteration.
        console.warn("Some items are partially assigned:", partiallyAssignedItems.map(i => i.name));
    }


    const result = await handleSummarizeBillAction(splitItems, people);
    if (result.success && result.data) {
      setBillSummary(result.data);
      toast({ title: "Bill Summarized", description: "Summary calculated successfully." });
    } else {
      setError(result.error || "Failed to summarize bill.");
      toast({ variant: "destructive", title: "Summary Failed", description: result.error || "Could not calculate summary." });
    }
    setIsCalculating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <Coins className="h-10 w-10 text-primary-foreground bg-primary p-2 rounded-lg shadow-md" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-foreground/80 via-foreground to-primary-foreground/80">
              SplitBillScan
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Effortlessly scan your receipts, assign item quantities, and split the bill among friends.
          </p>
        </header>

        <main className="space-y-8">
          {error && (
            <Alert variant="destructive" className="shadow-md">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-xl overflow-hidden">
            <CardHeader className="bg-card/50 border-b">
              <CardTitle className="text-2xl font-semibold">1. Scan Your Receipt</CardTitle>
              <CardDescription>Upload an image of your receipt to automatically extract item lines.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ReceiptUploader onScan={handleScanReceipt} isScanning={isScanning} />
            </CardContent>
          </Card>

          {splitItems.length > 0 && (
            <Card className="shadow-xl overflow-hidden">
              <CardHeader className="bg-card/50 border-b">
                <CardTitle className="text-2xl font-semibold">2. Edit &amp; Assign Item Quantities</CardTitle>
                <CardDescription>Review scanned items, make corrections, and assign how many units of each item each person takes.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ItemEditor
                  items={splitItems}
                  people={people}
                  onUpdateItem={handleUpdateItem}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                  onCalculateSummary={handleCalculateSummary}
                  isCalculating={isCalculating}
                />
              </CardContent>
            </Card>
          )}
          
          {billSummary && (
             <Card className="shadow-xl overflow-hidden">
              <CardHeader className="bg-card/50 border-b">
                <CardTitle className="text-2xl font-semibold">3. Bill Summary</CardTitle>
                <CardDescription>Here's who owes what. Easy peasy!</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <SummaryDisplay summary={billSummary} people={people} />
              </CardContent>
            </Card>
          )}
        </main>
        <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SplitBillScan. All rights reserved.</p>
          <p>Powered by Next.js, Shadcn/ui, and Genkit.</p>
        </footer>
      </div>
    </div>
  );
}
