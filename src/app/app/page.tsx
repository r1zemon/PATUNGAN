
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
import { Coins, LogOut, Settings, UserCircle, Power } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DUMMY_PEOPLE: Person[] = [
  { id: "person_1", name: "Alice" },
  { id: "person_2", name: "Bob" },
  { id: "person_3", name: "Charlie" },
  { id: "person_4", name: "Diana" },
];

export default function SplitBillAppPage() {
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [people] = useState<Person[]>(DUMMY_PEOPLE); // For now, using dummy data
  const [billSummary, setBillSummary] = useState<BillSummaryData | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Demo user state - replace with actual auth later
  const [currentUser, setCurrentUser] = useState({ name: "Guest User", avatarUrl: "" }); 

  const { toast } = useToast();

  const handleScanReceipt = async (receiptDataUri: string) => {
    setIsScanning(true);
    setError(null);
    setBillSummary(null); 
    setSplitItems([]);

    const result = await handleScanReceiptAction(receiptDataUri);
    if (result.success && result.data) {
      const newSplitItems: SplitItem[] = result.data.items.map((item: ScannedItem, index: number) => ({ // Added type for item
        id: `scanned_${Date.now()}_${index}`, // Ensure unique ID generation as before
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        assignedTo: [], 
      }));
      setSplitItems(newSplitItems);
      toast({ title: "Receipt Scanned", description: `${newSplitItems.length} item lines found.` });
      if (newSplitItems.length > 0) {
        setCurrentStep(2);
      } else {
        toast({ variant: "default", title: "No items found", description: "The receipt scan didn't find any items. Try adding them manually or scanning/capturing again." });
        // Stay on step 1 or allow manual add
      }
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
    setBillSummary(null); // Invalidate summary if items change
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
    if (currentStep < 2 && splitItems.length === 0) { 
        setCurrentStep(2);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setSplitItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setBillSummary(null);
  };

  const handleCalculateSummary = async () => {
    setIsCalculating(true);
    setError(null);

    const itemsForSummary = splitItems.filter(item => item.quantity > 0 && item.unitPrice >= 0);
    if (itemsForSummary.length === 0) {
        setError("No valid items to summarize. Please add items with quantity and price.");
        toast({ variant: "destructive", title: "Summary Failed", description: "No valid items to summarize." });
        setIsCalculating(false);
        return;
    }
    
    const unassignedItems = itemsForSummary.filter(item => {
        const totalAssignedCount = item.assignedTo.reduce((sum, assignment) => sum + assignment.count, 0);
        return totalAssignedCount < item.quantity;
    });

    if (unassignedItems.length > 0) {
        const unassignedItemNames = unassignedItems.map(i => i.name).join(", ");
        toast({
            variant: "default", 
            title: "Unassigned Units",
            description: `Some units for: ${unassignedItemNames} are not fully assigned. They will be excluded from individual totals.`,
            duration: 7000,
        });
    }


    const result = await handleSummarizeBillAction(itemsForSummary, people);
    if (result.success && result.data) {
      setBillSummary(result.data);
      toast({ title: "Bill Summarized", description: "Summary calculated successfully." });
      setCurrentStep(3);
    } else {
      setError(result.error || "Failed to summarize bill.");
      toast({ variant: "destructive", title: "Summary Failed", description: result.error || "Could not calculate summary." });
    }
    setIsCalculating(false);
  };
  
  const resetApp = () => {
    setSplitItems([]);
    setBillSummary(null);
    setError(null);
    setCurrentStep(1);
    toast({ title: "Reset", description: "App state has been reset."});
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
       <header className="py-4 px-4 sm:px-6 md:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <Coins className="h-8 w-8 text-primary-foreground bg-primary p-1.5 rounded-lg shadow-sm" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Patungan
            </h1>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={currentUser.avatarUrl || `https://placehold.co/40x40.png?text=${currentUser.name.substring(0,1)}`} alt={currentUser.name} data-ai-hint="profile avatar" />
                  <AvatarFallback>{currentUser.name.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.name === "Guest User" ? "guest@example.com" : currentUser.name.toLowerCase().replace(" ", ".") + "@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Logout functionality to be implemented!")}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <main className="space-y-8">
          {error && (
            <Alert variant="destructive" className="shadow-md">
              <Power className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Scan Receipt */}
          <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm">
            <CardHeader className="bg-card/60 border-b">
              <CardTitle className="text-xl sm:text-2xl font-semibold">1. Scan Your Receipt</CardTitle>
              <CardDescription>Use your camera to scan a receipt or upload an image file. You can also add items manually in the next step.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ReceiptUploader onScan={handleScanReceipt} isScanning={isScanning} />
            </CardContent>
          </Card>

          {/* Step 2: Edit & Assign Items */}
          {(currentStep >= 2 || splitItems.length > 0) && (
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm">
              <CardHeader className="bg-card/60 border-b">
                <CardTitle className="text-xl sm:text-2xl font-semibold">2. Edit &amp; Assign Items</CardTitle>
                <CardDescription>Review scanned items, make corrections, add new ones, and assign how many units of each item each person takes.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
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
          
          {/* Step 3: Bill Summary */}
          {currentStep >= 3 && billSummary && (
             <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm">
              <CardHeader className="bg-card/60 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-semibold">3. Bill Summary</CardTitle>
                  <CardDescription>Here's who owes what. Easy peasy!</CardDescription>
                </div>
                <Button variant="outline" onClick={resetApp} size="sm">Start New Bill</Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <SummaryDisplay summary={billSummary} people={people} />
              </CardContent>
            </Card>
          )}
        </main>
        <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Patungan. All rights reserved.</p>
          <p>Powered by Next.js, Shadcn/UI, and Genkit.</p>
        </footer>
      </div>
    </div>
  );
}
