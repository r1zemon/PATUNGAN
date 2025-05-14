
"use client";

import { useState, useEffect, useMemo } from "react";
import type { SplitItem, Person, BillDetails, TaxTipSplitStrategy, RawBillSummary, DetailedBillSummaryData } from "@/lib/types";
import { handleScanReceiptAction, handleSummarizeBillAction } from "@/lib/actions";
import { ReceiptUploader } from "@/components/receipt-uploader";
import { ItemEditor } from "@/components/item-editor";
import { SummaryDisplay } from "@/components/summary-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Coins, LogOut, Settings, UserCircle, Power, Info, Percent, Landmark, UserCheck, Loader2 } from "lucide-react";
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
  const [people] = useState<Person[]>(DUMMY_PEOPLE); 
  const [billDetails, setBillDetails] = useState<BillDetails>({
    payerId: null,
    taxAmount: 0,
    tipAmount: 0,
    taxTipSplitStrategy: "SPLIT_EQUALLY",
  });
  const [detailedBillSummary, setDetailedBillSummary] = useState<DetailedBillSummaryData | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [currentUser, setCurrentUser] = useState({ name: "Guest User", avatarUrl: "" }); 

  const { toast } = useToast();

  // State for input display values to manage "0" clearing UX
  const [taxInputDisplayValue, setTaxInputDisplayValue] = useState<string>(billDetails.taxAmount.toString());
  const [tipInputDisplayValue, setTipInputDisplayValue] = useState<string>(billDetails.tipAmount.toString());

  useEffect(() => {
    if (people.length > 0 && !billDetails.payerId) {
      setBillDetails(prev => ({ ...prev, payerId: people[0].id }));
    }
  }, [people, billDetails.payerId]);

  // Sync display values when billDetails.taxAmount or billDetails.tipAmount change from other sources (e.g., resetApp)
  useEffect(() => {
    setTaxInputDisplayValue(billDetails.taxAmount.toString());
  }, [billDetails.taxAmount]);

  useEffect(() => {
    setTipInputDisplayValue(billDetails.tipAmount.toString());
  }, [billDetails.tipAmount]);

  const itemsForSummary = useMemo(() => {
    return splitItems.filter(item => item.quantity > 0 && item.unitPrice >= 0);
  }, [splitItems]);

  const resetApp = () => {
    setSplitItems([]);
    setBillDetails({
      payerId: people.length > 0 ? people[0].id : null,
      taxAmount: 0,
      tipAmount: 0,
      taxTipSplitStrategy: "SPLIT_EQUALLY",
    });
    // The useEffects above will update taxInputDisplayValue and tipInputDisplayValue
    setDetailedBillSummary(null);
    setError(null);
    setCurrentStep(1);
    toast({ title: "Reset", description: "Status aplikasi telah direset."});
  }

  const handleScanReceipt = async (receiptDataUri: string) => {
    setIsScanning(true);
    setError(null);
    setDetailedBillSummary(null); 
    setSplitItems([]);

    const result = await handleScanReceiptAction(receiptDataUri);
    if (result.success && result.data) {
      const newSplitItems: SplitItem[] = result.data.items.map(item => ({ 
        id: item.id, 
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        assignedTo: [], 
      }));
      setSplitItems(newSplitItems);
      toast({ title: "Struk Dipindai", description: `${newSplitItems.length} baris item ditemukan.` });
      if (newSplitItems.length > 0) {
        setCurrentStep(2);
      } else {
        toast({ variant: "default", title: "Tidak ada item ditemukan", description: "Pemindaian struk tidak menemukan item apapun. Coba tambahkan manual atau pindai/ambil foto ulang." });
      }
    } else {
      setError(result.error || "Gagal memindai struk.");
      toast({ variant: "destructive", title: "Pemindaian Gagal", description: result.error || "Tidak dapat memproses struk." });
    }
    setIsScanning(false);
  };

  const handleUpdateItem = (updatedItem: SplitItem) => {
    setSplitItems((prevItems) =>
      prevItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setDetailedBillSummary(null); 
  };

  const handleAddItem = () => {
    const newItem: SplitItem = {
      id: `manual_${Date.now()}`,
      name: "Item Baru",
      unitPrice: 0,
      quantity: 1,
      assignedTo: [],
    };
    setSplitItems(prevItems => [...prevItems, newItem]);
    setDetailedBillSummary(null);
    if (currentStep < 2 && splitItems.length === 0) { 
        setCurrentStep(2);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setSplitItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setDetailedBillSummary(null);
  };

  const handleBillDetailsChange = (field: keyof BillDetails, value: string | number | TaxTipSplitStrategy) => {
    setBillDetails(prev => ({ ...prev, [field]: value }));
    setDetailedBillSummary(null);
  };

  const handleCalculateSummary = async () => {
    if (!billDetails.payerId) {
      setError("Mohon pilih siapa yang membayar tagihan.");
      toast({ variant: "destructive", title: "Gagal Menghitung", description: "Pembayar belum dipilih." });
      return;
    }
    
    setIsCalculating(true);
    setError(null);

    if (itemsForSummary.length === 0) {
        setError("Tidak ada item valid untuk diringkas. Mohon tambahkan item dengan kuantitas dan harga.");
        toast({ variant: "destructive", title: "Ringkasan Gagal", description: "Tidak ada item valid untuk diringkas." });
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
            title: "Unit Belum Dialokasikan",
            description: `Beberapa unit untuk: ${unassignedItemNames} belum sepenuhnya dialokasikan. Ini akan dikecualikan dari total individu.`,
            duration: 7000,
        });
    }

    const payerName = people.find(p => p.id === billDetails.payerId)?.name;
    if (!payerName) {
      setError("Data pembayar tidak valid.");
      toast({ variant: "destructive", title: "Kesalahan Data", description: "Tidak dapat menemukan nama pembayar." });
      setIsCalculating(false);
      return;
    }

    const result = await handleSummarizeBillAction(
      itemsForSummary, 
      people, 
      payerName,
      billDetails.taxAmount,
      billDetails.tipAmount,
      billDetails.taxTipSplitStrategy
    );

    if (result.success && result.data) {
      const rawSummary = result.data;
      const detailedSummary: DetailedBillSummaryData = {
        payerName: payerName,
        taxAmount: billDetails.taxAmount,
        tipAmount: billDetails.tipAmount,
        personalTotalShares: rawSummary,
        settlements: [],
        grandTotal: 0,
      };

      let currentGrandTotal = 0;
      Object.values(rawSummary).forEach(share => currentGrandTotal += share);
      detailedSummary.grandTotal = currentGrandTotal;
      
      for (const person of people) {
        const personShare = rawSummary[person.name] || 0;
        if (person.id !== billDetails.payerId && personShare > 0) {
          detailedSummary.settlements.push({
            from: person.name,
            to: payerName,
            amount: personShare,
          });
        }
      }
      
      setDetailedBillSummary(detailedSummary);
      toast({ title: "Tagihan Diringkas", description: "Ringkasan berhasil dihitung." });
      setCurrentStep(3);
    } else {
      setError(result.error || "Gagal meringkas tagihan.");
      toast({ variant: "destructive", title: "Ringkasan Gagal", description: result.error || "Tidak dapat menghitung ringkasan." });
    }
    setIsCalculating(false);
  };
  
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
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Fungsi Logout akan diimplementasikan!")}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
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
              <AlertTitle>Kesalahan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
            <CardHeader className="bg-card/60 border-b">
              <CardTitle className="text-xl sm:text-2xl font-semibold">1. Pindai Struk Anda</CardTitle>
              <CardDescription>Gunakan kamera untuk memindai struk atau unggah file gambar. Anda juga bisa menambahkan item manual di langkah berikutnya.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ReceiptUploader 
                onScan={handleScanReceipt} 
                isScanning={isScanning} 
                onClearPreview={resetApp} 
              />
            </CardContent>
          </Card>

          {(currentStep >= 2 || splitItems.length > 0) && (
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b">
                <CardTitle className="text-xl sm:text-2xl font-semibold">2. Edit Item, Alokasi & Detail Pembayaran</CardTitle>
                <CardDescription>Tinjau item yang dipindai, koreksi, tambahkan baru, alokasikan ke orang, tentukan pembayar, pajak, dan tip.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <ItemEditor
                  items={splitItems}
                  people={people}
                  onUpdateItem={handleUpdateItem}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                  onCalculateSummary={handleCalculateSummary}
                  isCalculating={isCalculating}
                />
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Detail Pembayaran Tambahan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="payer">Siapa yang Membayar?</Label>
                      <Select
                        value={billDetails.payerId || ""}
                        onValueChange={(value) => handleBillDetailsChange("payerId", value)}
                      >
                        <SelectTrigger id="payer" className="w-full">
                          <SelectValue placeholder="Pilih pembayar" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map(person => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxAmount">Jumlah Pajak (Rp)</Label>
                      <div className="relative">
                         <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="taxAmount" 
                          type="number" 
                          placeholder="Contoh: 15000"
                          value={taxInputDisplayValue}
                          onFocus={() => {
                            if (billDetails.taxAmount === 0) {
                              setTaxInputDisplayValue("");
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTaxInputDisplayValue(val);
                            handleBillDetailsChange("taxAmount", parseFloat(val) || 0);
                          }}
                          onBlur={() => {
                            setTaxInputDisplayValue(billDetails.taxAmount.toString());
                          }}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipAmount">Jumlah Tip (Rp)</Label>
                       <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="tipAmount" 
                          type="number" 
                          placeholder="Contoh: 10000"
                          value={tipInputDisplayValue}
                           onFocus={() => {
                            if (billDetails.tipAmount === 0) {
                              setTipInputDisplayValue("");
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTipInputDisplayValue(val);
                            handleBillDetailsChange("tipAmount", parseFloat(val) || 0);
                          }}
                          onBlur={() => {
                            setTipInputDisplayValue(billDetails.tipAmount.toString());
                          }}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bagaimana Pajak & Tip Dibagi?</Label>
                    <RadioGroup
                      value={billDetails.taxTipSplitStrategy}
                      onValueChange={(value) => handleBillDetailsChange("taxTipSplitStrategy", value as TaxTipSplitStrategy)}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1">
                        <RadioGroupItem value="PAYER_PAYS_ALL" id="payer_pays_all" />
                        <Label htmlFor="payer_pays_all" className="font-normal leading-tight cursor-pointer">
                          Pembayar menanggung semua Pajak & Tip
                          <p className="text-xs text-muted-foreground">Total pajak dan tip akan ditambahkan hanya ke bagian pembayar.</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1">
                        <RadioGroupItem value="SPLIT_EQUALLY" id="split_equally" />
                        <Label htmlFor="split_equally" className="font-normal leading-tight cursor-pointer">
                          Bagi rata Pajak & Tip ke semua orang
                          <p className="text-xs text-muted-foreground">Total pajak dan tip akan dibagi rata di antara semua peserta.</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                 <Button 
                  onClick={handleCalculateSummary} 
                  disabled={isCalculating || itemsForSummary.length === 0 || !billDetails.payerId} 
                  size="lg" 
                  className="w-full mt-6"
                >
                  {isCalculating ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <UserCheck className="mr-2" />
                  )}
                  {isCalculating ? "Menghitung..." : "Hitung & Lihat Ringkasan Tagihan"}
                </Button>
              </CardContent>
            </Card>
          )}
          
          {currentStep >= 3 && detailedBillSummary && (
             <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-semibold">3. Ringkasan Tagihan</CardTitle>
                  <CardDescription>Ini dia siapa berutang apa. Gampang kan!</CardDescription>
                </div>
                <Button variant="outline" onClick={resetApp} size="sm">Buat Tagihan Baru</Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <SummaryDisplay summary={detailedBillSummary} people={people} />
              </CardContent>
            </Card>
          )}
        </main>
        <footer className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
          <p>Ditenagai oleh Next.js, Shadcn/UI, dan Genkit.</p>
        </footer>
      </div>
    </div>
  );
}

