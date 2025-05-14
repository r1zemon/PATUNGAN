
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { SplitItem, Person, BillDetails, TaxTipSplitStrategy, RawBillSummary, DetailedBillSummaryData } from "@/lib/types";
import { 
  handleScanReceiptAction, 
  handleSummarizeBillAction,
  createBillAction,
  addParticipantAction,
  removeParticipantAction
} from "@/lib/actions";
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
import { Home, Coins, LogOut, Settings, UserCircle, Power, Info, Percent, Landmark, UserCheck, Loader2, UserPlus, ArrowRight, Trash2, Users, ScanLine, PlusCircle, Edit2, ListChecks, FilePlus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export default function SplitBillAppPage() {
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [isBillCreating, setIsBillCreating] = useState(false);

  const [people, setPeople] = useState<Person[]>([]); // Person.id akan menjadi ID dari tabel bill_participants
  const [personNameInput, setPersonNameInput] = useState<string>("");

  const [splitItems, setSplitItems] = useState<SplitItem[]>([]); // SplitItem.id masih client-side
  const [billDetails, setBillDetails] = useState<BillDetails>({
    payerId: null, // Ini akan menjadi ID dari tabel bill_participants
    taxAmount: 0,
    tipAmount: 0,
    taxTipSplitStrategy: "SPLIT_EQUALLY",
  });
  const [detailedBillSummary, setDetailedBillSummary] = useState<DetailedBillSummaryData | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Add People

  const [currentUser, setCurrentUser] = useState({ name: "Guest User", avatarUrl: "" }); 

  const { toast } = useToast();

  const [taxInputDisplayValue, setTaxInputDisplayValue] = useState<string>(billDetails.taxAmount.toString());
  const [tipInputDisplayValue, setTipInputDisplayValue] = useState<string>(billDetails.tipAmount.toString());

  const initializeNewBill = useCallback(async () => {
    setIsBillCreating(true);
    setError(null);
    const result = await createBillAction("Tagihan Baru"); // Nama default untuk bill
    if (result.success && result.billId) {
      setCurrentBillId(result.billId);
      setPeople([]);
      setPersonNameInput("");
      setSplitItems([]);
      setBillDetails({
        payerId: null,
        taxAmount: 0,
        tipAmount: 0,
        taxTipSplitStrategy: "SPLIT_EQUALLY",
      });
      setDetailedBillSummary(null);
      setCurrentStep(1);
      toast({ title: "Sesi Tagihan Baru Dimulai", description: `ID Tagihan: ${result.billId}`});
    } else {
      setError(result.error || "Gagal memulai sesi tagihan baru.");
      toast({ variant: "destructive", title: "Inisialisasi Gagal", description: result.error || "Tidak dapat membuat tagihan baru di database." });
    }
    setIsBillCreating(false);
  }, [toast]);
  
  // Panggil initializeNewBill saat komponen dimuat pertama kali
  useEffect(() => {
    initializeNewBill();
  }, [initializeNewBill]);

  const resetApp = () => {
    initializeNewBill(); // Memanggil fungsi yang sudah ada untuk membuat bill baru
  }

  // Update payerId jika people list berubah atau payer adalah removed
  useEffect(() => {
    if (people.length > 0) {
      const payerExists = people.some(p => p.id === billDetails.payerId);
      if (!billDetails.payerId || !payerExists) {
        setBillDetails(prev => ({ ...prev, payerId: people[0].id })); // Default ke orang pertama
      }
    } else {
      setBillDetails(prev => ({ ...prev, payerId: null }));
    }
  }, [people, billDetails.payerId]);

  useEffect(() => {
    setTaxInputDisplayValue(billDetails.taxAmount.toString());
  }, [billDetails.taxAmount]);

  useEffect(() => {
    setTipInputDisplayValue(billDetails.tipAmount.toString());
  }, [billDetails.tipAmount]);

  const itemsForSummary = useMemo(() => {
    return splitItems.filter(item => item.quantity > 0 && item.unitPrice >= 0);
  }, [splitItems]);


  const handleAddPerson = async () => {
    if (!currentBillId) {
      toast({ variant: "destructive", title: "Tagihan Belum Siap", description: "Sesi tagihan belum terinisialisasi. Mohon tunggu atau coba reset." });
      return;
    }
    if (personNameInput.trim() === "") {
      toast({ variant: "destructive", title: "Nama Kosong", description: "Nama orang tidak boleh kosong." });
      return;
    }
    if (people.some(p => p.name.toLowerCase() === personNameInput.trim().toLowerCase())) {
      toast({ variant: "destructive", title: "Nama Duplikat", description: "Nama orang tersebut sudah ada dalam daftar." });
      return;
    }
    
    const result = await addParticipantAction(currentBillId, personNameInput.trim());
    if (result.success && result.person) {
      setPeople(prev => [...prev, result.person!]); // person.id sekarang adalah dari DB
      setPersonNameInput("");
      toast({ title: "Orang Ditambahkan", description: `${result.person.name} telah ditambahkan dan disimpan.`});
    } else {
      toast({ variant: "destructive", title: "Gagal Menambah Orang", description: result.error || "Tidak dapat menyimpan orang ke database." });
    }
  };

  const handleRemovePerson = async (personIdToRemove: string) => {
    const result = await removeParticipantAction(personIdToRemove);
    if (result.success) {
      setPeople(prev => prev.filter(p => p.id !== personIdToRemove));
      setSplitItems(prevItems => prevItems.map(item => ({
        ...item,
        assignedTo: item.assignedTo.filter(a => a.personId !== personIdToRemove)
      })));
      toast({ title: "Orang Dihapus", description: "Orang tersebut telah dihapus dari daftar dan database."});
      if (billDetails.payerId === personIdToRemove) {
        setBillDetails(prev => ({ ...prev, payerId: people.length > 1 ? people.find(p => p.id !== personIdToRemove)!.id : null }));
      }
    } else {
       toast({ variant: "destructive", title: "Gagal Menghapus Orang", description: result.error || "Tidak dapat menghapus orang dari database." });
    }
  };
  
  const proceedToScanStep = () => {
    if (people.length === 0) {
      toast({ variant: "destructive", title: "Belum Ada Orang", description: "Mohon tambahkan minimal satu orang untuk melanjutkan." });
      return;
    }
     if (!currentBillId) {
      toast({ variant: "destructive", title: "Tagihan Belum Siap", description: "Mohon tunggu sesi tagihan terinisialisasi." });
      return;
    }
    setCurrentStep(2);
  };


  const handleScanReceipt = async (receiptDataUri: string) => {
    setIsScanning(true);
    setError(null);
    setDetailedBillSummary(null); 
    setSplitItems([]); // Kosongkan item lokal saat scan baru

    // TODO: Sebelum menyimpan item baru, mungkin perlu menghapus item lama dari DB untuk billId ini
    // Untuk saat ini, kita hanya mengisi state splitItems

    const result = await handleScanReceiptAction(receiptDataUri);
    if (result.success && result.data) {
      const newSplitItems: SplitItem[] = result.data.items.map(item => ({ 
        id: item.id, // Ini masih ID client-side dari hasil scan
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        assignedTo: [], 
      }));
      setSplitItems(newSplitItems);
      toast({ title: "Struk Dipindai", description: `${newSplitItems.length} baris item ditemukan.` });
      if (newSplitItems.length > 0) {
        setCurrentStep(3); 
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
    // TODO: Action untuk update item di DB jika item sudah disimpan
  };

  const handleAddItem = () => {
    const newItem: SplitItem = {
      id: `manual_${Date.now()}`, // ID Client-side
      name: "Item Baru",
      unitPrice: 0,
      quantity: 1,
      assignedTo: [],
    };
    setSplitItems(prevItems => [...prevItems, newItem]);
    setDetailedBillSummary(null);
    if (currentStep < 3 && people.length > 0) { 
        setCurrentStep(3); 
    }
    // TODO: Action untuk add item di DB jika user sudah siap menyimpan
  };

  const handleDeleteItem = (itemId: string) => {
    setSplitItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setDetailedBillSummary(null);
     // TODO: Action untuk delete item di DB jika item sudah disimpan
  };

  const handleBillDetailsChange = (field: keyof BillDetails, value: string | number | TaxTipSplitStrategy) => {
    setBillDetails(prev => ({ ...prev, [field]: value }));
    setDetailedBillSummary(null);
  };

  const handleCalculateSummary = async () => {
    if (!currentBillId) {
      setError("Sesi tagihan tidak ditemukan. Mohon coba reset.");
      toast({ variant: "destructive", title: "Gagal Menghitung", description: "Sesi tagihan tidak valid." });
      return;
    }
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
    
    // TODO: Sebelum memanggil handleSummarizeBillAction, kita perlu menyimpan splitItems ke DB
    // dan mendapatkan ID DB mereka. Untuk sekarang, kita masih pakai ID client-side untuk itemsForSummary.
    // Ini perlu disesuaikan jika `handleSummarizeBillAction` memerlukan ID item dari DB.

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

    const result = await handleSummarizeBillAction(
      itemsForSummary, 
      people, // people sudah berisi ID dari bill_participants
      currentBillId,
      billDetails.payerId, // Ini adalah ID bill_participant
      billDetails.taxAmount,
      billDetails.tipAmount,
      billDetails.taxTipSplitStrategy
    );

    if (result.success && result.data) {
      const rawSummary = result.data;
      const payer = people.find(p => p.id === billDetails.payerId);

      const detailedSummary: DetailedBillSummaryData = {
        payerName: payer ? payer.name : "Pembayar Tidak Diketahui",
        taxAmount: billDetails.taxAmount,
        tipAmount: billDetails.tipAmount,
        personalTotalShares: rawSummary,
        settlements: [],
        grandTotal: 0,
      };

      let currentGrandTotal = 0;
      Object.values(rawSummary).forEach(share => currentGrandTotal += share);
      detailedSummary.grandTotal = currentGrandTotal;
      
      // Buat settlement dari rawSummary (yang namanya sudah dimapping dengan ID bill_participants di action)
      for (const person of people) {
        const personShare = rawSummary[person.name] || 0; // Akses dengan nama, karena itu output AI
        if (person.id !== billDetails.payerId && personShare > 0) {
          detailedSummary.settlements.push({
            from: person.name,
            to: payer ? payer.name : "Pembayar Tidak Diketahui",
            amount: personShare,
          });
        }
      }
      
      setDetailedBillSummary(detailedSummary);
      toast({ title: "Tagihan Diringkas", description: "Ringkasan berhasil dihitung dan disimpan." });
      setCurrentStep(4); 
    } else {
      setError(result.error || "Gagal meringkas tagihan.");
      toast({ variant: "destructive", title: "Ringkasan Gagal", description: result.error || "Tidak dapat menghitung ringkasan." });
    }
    setIsCalculating(false);
  };
  
  if (isBillCreating && !currentBillId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Memulai sesi tagihan baru...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
       <header className="py-4 px-4 sm:px-6 md:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/app" onClick={(e) => { e.preventDefault(); resetApp(); }} className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <Coins className="h-8 w-8 text-primary-foreground bg-primary p-1.5 rounded-lg shadow-sm" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Patungan
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
             <Button variant="outline" onClick={resetApp} size="sm" className="hidden sm:inline-flex">
                <FilePlus className="mr-2 h-4 w-4" /> Tagihan Baru
            </Button>
            <Link href="/" passHref>
              <Button variant="ghost" size="icon" aria-label="Kembali ke Beranda">
                <Home className="h-5 w-5" />
              </Button>
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
                 <DropdownMenuItem onClick={resetApp} className="sm:hidden">
                    <FilePlus className="mr-2 h-4 w-4" />
                    <span>Tagihan Baru</span>
                  </DropdownMenuItem>
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

          {/* Step 1: Add People */}
          {currentStep === 1 && (
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b">
                <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center"><Users className="mr-3 h-6 w-6"/>1. Tambah Orang</CardTitle>
                <CardDescription>Masukkan nama orang-orang yang akan ikut patungan. Data disimpan ke database.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Nama Orang"
                    value={personNameInput}
                    onChange={(e) => setPersonNameInput(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleAddPerson(); }}
                    className="flex-grow"
                    disabled={!currentBillId}
                  />
                  <Button onClick={handleAddPerson} variant="outline" disabled={!currentBillId || !personNameInput.trim()}>
                    <UserPlus className="mr-2 h-4 w-4" /> Tambah
                  </Button>
                </div>
                {people.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Daftar Orang:</h4>
                    <div className="flex flex-wrap gap-2">
                      {people.map(person => (
                        <Badge key={person.id} variant="secondary" className="py-1 px-3 text-sm flex items-center gap-2 shadow-sm">
                          {person.name}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={() => handleRemovePerson(person.id)}
                            aria-label={`Hapus ${person.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={proceedToScanStep} disabled={people.length === 0 || !currentBillId} className="w-full" size="lg">
                  Lanjut ke Scan Struk <ArrowRight className="ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Step 2: Scan Receipt */}
          {currentStep >= 2 && (
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b">
                <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center"><ScanLine className="mr-3 h-6 w-6"/>2. Pindai Struk Anda</CardTitle>
                <CardDescription>Gunakan kamera untuk memindai struk atau unggah file gambar. Anda juga bisa menambahkan item manual di langkah berikutnya.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ReceiptUploader 
                  onScan={handleScanReceipt} 
                  isScanning={isScanning} 
                  onClearPreview={() => {
                    setSplitItems([]); 
                    // Tidak mereset seluruh app, hanya item dari scan
                  }}
                />
              </CardContent>
               {currentStep === 2 && splitItems.length === 0 && (
                <CardFooter className="border-t pt-4">
                    <Button onClick={handleAddItem} variant="outline" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Lewati Pindai & Tambah Item Manual
                    </Button>
                </CardFooter>
            )}
            </Card>
          )}

          {/* Step 3: Edit Items, Assign & Payment Details */}
          {currentStep >= 3 && (
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b">
                <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center"><Edit2 className="mr-3 h-6 w-6"/>3. Edit Item, Alokasi & Detail Pembayaran</CardTitle>
                <CardDescription>Tinjau item, koreksi, tambahkan baru, alokasikan ke orang, tentukan pembayar, pajak, dan tip.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <ItemEditor
                  items={splitItems}
                  people={people}
                  onUpdateItem={handleUpdateItem}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                  isCalculating={isCalculating} // isCalculating dan onCalculateSummary tidak lagi dipakai di sini
                />
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Detail Pembayaran Tambahan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="payer">Siapa yang Membayar?</Label>
                      <Select
                        value={billDetails.payerId || ""}
                        onValueChange={(value) => handleBillDetailsChange("payerId", value)} // value adalah participant.id
                        disabled={people.length === 0}
                      >
                        <SelectTrigger id="payer" className="w-full">
                          <SelectValue placeholder={people.length > 0 ? "Pilih pembayar" : "Tambah orang dulu"} />
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
                      <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1 cursor-pointer">
                        <RadioGroupItem value="PAYER_PAYS_ALL" id="payer_pays_all" />
                        <Label htmlFor="payer_pays_all" className="font-normal leading-tight cursor-pointer flex-1">
                          Pembayar menanggung semua Pajak & Tip
                          <p className="text-xs text-muted-foreground">Total pajak dan tip akan ditambahkan hanya ke bagian pembayar.</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1 cursor-pointer">
                        <RadioGroupItem value="SPLIT_EQUALLY" id="split_equally" />
                        <Label htmlFor="split_equally" className="font-normal leading-tight cursor-pointer flex-1">
                          Bagi rata Pajak & Tip ke semua orang
                          <p className="text-xs text-muted-foreground">Total pajak dan tip akan dibagi rata di antara semua peserta.</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                 <Button 
                  onClick={handleCalculateSummary} 
                  disabled={isCalculating || itemsForSummary.length === 0 || !billDetails.payerId || people.length === 0 || !currentBillId} 
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
          
          {/* Step 4: Bill Summary */}
          {currentStep >= 4 && detailedBillSummary && (
             <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center"><ListChecks className="mr-3 h-6 w-6"/>4. Ringkasan Tagihan</CardTitle>
                  <CardDescription>Ini dia siapa berutang apa. Gampang kan!</CardDescription>
                </div>
                <Button variant="outline" onClick={resetApp} size="sm">
                    <FilePlus className="mr-2 h-4 w-4" /> Buat Tagihan Baru
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <SummaryDisplay summary={detailedBillSummary} people={people} />
              </CardContent>
            </Card>
          )}
        </main>
        <footer className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
          <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
        </footer>
      </div>
    </div>
  );
}
