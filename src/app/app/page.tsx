
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { SplitItem, Person, BillDetails, TaxTipSplitStrategy, DetailedBillSummaryData, BillCategory, ScannedItem } from "@/lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { 
  handleScanReceiptAction, 
  handleSummarizeBillAction,
  createBillAction,
  addParticipantAction,
  removeParticipantAction,
  getCurrentUserAction,
  logoutUserAction,
  getUserCategoriesAction, 
  createBillCategoryAction,
  addBillItemToDbAction, 
  updateBillItemInDbAction, 
  deleteBillItemFromDbAction,
  getBillDetailsAction,
  markSettlementsAsPaidAction,
} from "@/lib/actions";
import { supabase } from "@/lib/supabaseClient";
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
import { UserCheck, Loader2, UserPlus, ArrowRight, Trash2, Users, ScanLine, PlusCircle, Edit2, ListChecks, FilePlus, FileText, CalendarClock, FolderPlus, Tag, Percent, Landmark, Power, User, Clock, QrCode } from "lucide-react"; 
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import { LandingHeader } from "@/components/landing-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";


const DEFAULT_CATEGORIES = ["Makanan", "Transportasi", "Hiburan", "Penginapan", "Lainnya"];
const ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE = ["Makanan", "Transportasi", "Hiburan", "Penginapan"];
const OTHERS_CATEGORY_NAME_FOR_PAGE = "Lainnya";


export default function SplitBillAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();

  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bill Session State
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [currentBillName, setCurrentBillName] = useState<string>("");
  const [people, setPeople] = useState<Person[]>([]);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [billDetails, setBillDetails] = useState<BillDetails>({
    payerId: null,
    taxAmount: 0,
    tipAmount: 0,
    taxTipSplitStrategy: "SPLIT_EQUALLY",
  });
  const [detailedBillSummary, setDetailedBillSummary] = useState<DetailedBillSummaryData | null>(null);
  
  // UI and Control State
  const [isCalculating, setIsCalculating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0: Start, 1: Editing, 2: Summary
  const [personNameInput, setPersonNameInput] = useState<string>("");

  // Start New Bill Form State
  const [billNameInput, setBillNameInput] = useState<string>("");
  const [billTimingOption, setBillTimingOption] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState<string>("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  
  const [tipInputDisplayValue, setTipInputDisplayValue] = useState<string>(billDetails.tipAmount.toString());

  // ===== DATA FETCHING & SESSION MANAGEMENT =====

  const fetchInitialUserData = useCallback(async () => {
    setIsLoading(true);
    const { user, error: userError } = await getCurrentUserAction();
    setAuthUser(user);
    if (userError || !user) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: userError || "Anda harus login." });
      router.push("/login");
      setIsLoading(false);
      return;
    }

    const categoriesResult = await getUserCategoriesAction();

    if (categoriesResult.success && categoriesResult.categories) {
      // Process and set categories
      let fetchedCategories = categoriesResult.categories;
      const existingNames = new Set(fetchedCategories.map(c => c.name.toLowerCase()));
      for (const defaultCat of DEFAULT_CATEGORIES) {
        if (!existingNames.has(defaultCat.toLowerCase())) {
          const creation = await createBillCategoryAction(defaultCat);
          if (creation.success && creation.category) fetchedCategories.push(creation.category);
        }
      }
      setCategories(sortCategories(fetchedCategories));
    } else {
      toast({ variant: "destructive", title: "Gagal Memuat Kategori", description: categoriesResult.error });
    }
    setIsLoadingCategories(false);
    setIsLoading(false);
  }, [router, toast]);

  useEffect(() => {
    fetchInitialUserData();
  }, [fetchInitialUserData]);
  
  const loadBillSession = useCallback(async (billId: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const result = await getBillDetailsAction(billId);

        if (result.success && result.data) {
        const { billName, summaryData, participants, items } = result.data;

        // Authorization check: is current user part of this bill?
        if (!participants.some(p => p.profile_id === authUser?.id) && result.data.ownerId !== authUser?.id) {
            setError("Anda tidak memiliki akses ke tagihan ini.");
            toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda bukan bagian dari sesi tagihan ini." });
            router.push('/app');
            return;
        }

        setCurrentBillId(billId);
        setCurrentBillName(billName || "");
        setPeople(participants);
        setSplitItems(items);
        setBillDetails({
            payerId: summaryData?.payerId || null,
            taxAmount: summaryData?.taxAmount || 0,
            tipAmount: summaryData?.tipAmount || 0,
            taxTipSplitStrategy: summaryData?.taxTipSplitStrategy || "SPLIT_EQUALLY",
        });

        // Determine step based on whether the bill has been summarized (grandTotal > 0)
        if (summaryData && summaryData.grandTotal > 0) {
            setDetailedBillSummary(summaryData);
            setCurrentStep(2);
        } else {
            setDetailedBillSummary(null);
            setCurrentStep(1);
        }
        } else {
        setError(result.error || "Gagal memuat sesi tagihan.");
        toast({ variant: "destructive", title: "Gagal Memuat Sesi", description: result.error });
        router.push('/app');
        }
    } catch (e) {
        console.error("Critical error in loadBillSession:", e);
        setError("Terjadi kesalahan kritis saat memuat sesi.");
        toast({ variant: "destructive", title: "Kesalahan Kritis", description: "Tidak dapat memuat sesi tagihan." });
        router.push('/app');
    } finally {
        setIsLoading(false);
    }
  }, [authUser, router, toast]);

  // This effect handles initializing or loading a session based on the URL
  useEffect(() => {
    const billIdFromUrl = searchParams.get('billId');
    if (authUser && billIdFromUrl) {
      if (billIdFromUrl !== currentBillId) {
        loadBillSession(billIdFromUrl);
      }
    } else if (!billIdFromUrl) {
      // If no billId in URL, go back to the start screen
      resetAppToStart(false); // don't refetch user data
    }
  }, [searchParams, authUser, currentBillId, loadBillSession]);


  const sortCategories = (cats: BillCategory[]): BillCategory[] => {
    let orderedDefaults: BillCategory[] = [];
    let customCats: BillCategory[] = [];
    let othersCat: BillCategory | null = null;
    cats.forEach(cat => {
      if (cat.name.toLowerCase() === OTHERS_CATEGORY_NAME_FOR_PAGE.toLowerCase()) othersCat = cat;
      else if (ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.some(dn => dn.toLowerCase() === cat.name.toLowerCase())) orderedDefaults.push(cat);
      else customCats.push(cat);
    });
    orderedDefaults.sort((a, b) => ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.findIndex(n => n.toLowerCase() === a.name.toLowerCase()) - ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.findIndex(n => n.toLowerCase() === b.name.toLowerCase()));
    customCats.sort((a, b) => a.name.localeCompare(b.name));
    const final = [...orderedDefaults, ...customCats];
    if (othersCat) final.push(othersCat);
    return final;
  };
  
  const startNewBillSession = useCallback(async () => {
    if (!authUser) {
      toast({variant: "destructive", title: "Akses Ditolak", description: "Anda harus login."});
      router.push("/login");
      return;
    }
    if (!billNameInput.trim()) {
      toast({ variant: "destructive", title: "Nama Tagihan Kosong", description: "Mohon masukkan nama."});
      return;
    }
    
    let finalCategoryId = selectedCategoryId;
    if (showNewCategoryInput) {
        if (!newCategoryInput.trim()) {
            toast({ variant: "destructive", title: "Nama Kategori Baru Kosong" });
            return;
        }
        if (newCategoryInput.trim().length > 20) {
            toast({ variant: "destructive", title: "Nama Kategori Terlalu Panjang" });
            return;
        }
        const categoryResult = await createBillCategoryAction(newCategoryInput.trim());
        if (categoryResult.success && categoryResult.category) {
            finalCategoryId = categoryResult.category.id;
            // No need to manually refetch, just add to local state
            setCategories(prev => sortCategories([...prev, categoryResult.category!]));
            setSelectedCategoryId(finalCategoryId);
            setShowNewCategoryInput(false);
            setNewCategoryInput("");
        } else {
            toast({ variant: "destructive", title: "Gagal Membuat Kategori", description: categoryResult.error });
            return;
        }
    }

    if (!finalCategoryId && billTimingOption === 'now') {
        toast({ variant: "destructive", title: "Kategori Belum Dipilih" });
        return;
    }

    setIsCalculating(true); // Reuse isCalculating state for loading
    setError(null);

    const isScheduling = billTimingOption === 'schedule';
    let scheduleDateISO: string | null = null;
    if (isScheduling) {
        if (!scheduledAt) {
          toast({ variant: "destructive", title: "Jadwal Kosong" });
          setIsCalculating(false); return;
        }
        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          toast({ variant: "destructive", title: "Jadwal Tidak Valid" });
          setIsCalculating(false); return;
        }
        scheduleDateISO = scheduledDate.toISOString();
    }
    
    const result = await createBillAction(
        billNameInput.trim(), 
        finalCategoryId, 
        scheduleDateISO, 
        authUser.user_metadata.full_name || authUser.email || 'Creator'
    );
    
    if (result.success && result.billId) {
        if (isScheduling) {
            toast({ title: "Tagihan Dijadwalkan", description: `Tagihan "${billNameInput.trim()}" berhasil dijadwalkan.`});
            resetAppToStart(false);
        } else {
            toast({ title: "Sesi Tagihan Dimulai", description: `Tagihan "${billNameInput.trim()}" siap untuk diisi.`});
            router.push(`/app?billId=${result.billId}`, { scroll: false });
        }
    } else {
        setError(result.error || "Gagal memulai sesi tagihan baru.");
        toast({ variant: "destructive", title: "Inisialisasi Gagal", description: result.error });
    }
    setIsCalculating(false);
  }, [authUser, billNameInput, billTimingOption, scheduledAt, router, toast, selectedCategoryId, newCategoryInput, showNewCategoryInput]);
  
  const resetAppToStart = (shouldRefetchUser = true) => {
     setCurrentBillId(null);
     setCurrentBillName("");
     setBillNameInput("");
     setSelectedCategoryId(null);
     setNewCategoryInput("");
     setShowNewCategoryInput(false);
     setBillTimingOption("now");
     setScheduledAt("");
     setPeople([]);
     setSplitItems([]);
     setBillDetails({ payerId: null, taxAmount: 0, tipAmount: 0, taxTipSplitStrategy: "SPLIT_EQUALLY" });
     setDetailedBillSummary(null);
     setCurrentStep(0); 
     setError(null);
     if (pathname !== '/app' || searchParams.has('billId')) {
        router.push('/app', { scroll: false });
     }
     if (shouldRefetchUser) {
        fetchInitialUserData();
     }
  }

  // Set default payer without causing a server update loop
  useEffect(() => {
    if (people.length > 0 && !detailedBillSummary) {
      const payerExists = people.some(p => p.id === billDetails.payerId);
      if (!billDetails.payerId || !payerExists) {
        if (people[0]) {
          setBillDetails(prevDetails => ({ ...prevDetails, payerId: people[0].id }));
        }
      }
    }
  }, [people, detailedBillSummary, billDetails.payerId]);

  useEffect(() => { setTipInputDisplayValue(billDetails.tipAmount.toString()); }, [billDetails.tipAmount]);

  const itemsForSummary = useMemo(() => {
    return splitItems.filter(item => item.quantity > 0 && item.unitPrice >= 0);
  }, [splitItems]);


  const handleAddGuest = async () => {
    if (!currentBillId || !personNameInput.trim()) return;
    if (people.some(p => p.name.toLowerCase() === personNameInput.trim().toLowerCase())) {
      toast({ variant: "destructive", title: "Nama Duplikat" }); return;
    }
    const result = await addParticipantAction(currentBillId, personNameInput.trim(), null);
    if (result.success && result.person) {
      setPersonNameInput("");
      setPeople(prev => [...prev, result.person!]);
      toast({ title: "Tamu Ditambahkan"});
    } else {
      toast({ variant: "destructive", title: "Gagal Menambah Tamu", description: result.error });
    }
  };

  const handleRemovePerson = async (personIdToRemove: string) => {
    if (!currentBillId) return;
    
    const originalPeople = [...people];
    setPeople(prev => prev.filter(p => p.id !== personIdToRemove));
    toast({ title: "Partisipan Dihapus"});

    const result = await removeParticipantAction(personIdToRemove);
    if (!result.success) {
       toast({ variant: "destructive", title: "Gagal Menghapus Partisipan", description: result.error });
       setPeople(originalPeople); // Revert on failure
    }
  };
  
  const handleScanReceipt = async (receiptDataUri: string) => {
    if (!currentBillId) return;
    setIsScanning(true);
    setError(null);
    setDetailedBillSummary(null); 
    const result = await handleScanReceiptAction(currentBillId, receiptDataUri);

    if (!result) { 
      toast({ variant: "destructive", title: "Pemindaian Gagal", description: "Terjadi kesalahan tak terduga pada server." });
      setIsScanning(false);
      return;
    }

    if (result.success && result.data?.items) {
      toast({ title: "Struk Dipindai", description: `${result.data.items.length || 0} baris item ditambahkan.` });
       if (result.data.items.length === 0) {
        toast({ title: "Tidak ada item ditemukan" });
      }
      const newSplitItems: SplitItem[] = result.data.items.map(item => ({...item, assignedTo: []}));
      setSplitItems(prev => [...prev, ...newSplitItems]);
      
      // Auto-update tax from scan
      if (result.data.taxAmount > 0) {
        handleBillDetailsChange("taxAmount", result.data.taxAmount);
        toast({ title: `Pajak Terdeteksi: ${formatCurrency(result.data.taxAmount, 'IDR')}`, description: "Jumlah pajak telah diisi otomatis." });
      }

    } else {
      setError(result.error || "Gagal memindai struk.");
      toast({ variant: "destructive", title: "Pemindaian Gagal", description: result.error });
    }
    setIsScanning(false);
  };

  const handleUpdateItem = async (updatedItem: SplitItem) => {
    setDetailedBillSummary(null);

    const originalItems = [...splitItems];
    setSplitItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    
    const result = await updateBillItemInDbAction(updatedItem);
    if (!result.success) {
      toast({ variant: "destructive", title: "Gagal Memperbarui Item", description: result.error });
      setSplitItems(originalItems);
    }
  };

  const handleAddItem = async () => {
    if (!currentBillId) return;
    setDetailedBillSummary(null);
    const result = await addBillItemToDbAction(currentBillId, { name: "Item Baru", unitPrice: 0, quantity: 1 });
    if (result.success && result.item) {
        const newSplitItem: SplitItem = { ...result.item, assignedTo: [] };
        setSplitItems(prev => [...prev, newSplitItem]);
    } else {
        toast({ variant: "destructive", title: "Gagal Menambah Item", description: result.error });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDetailedBillSummary(null); 
    
    const originalItems = [...splitItems];
    setSplitItems(prev => prev.filter(item => item.id !== itemId));

    const result = await deleteBillItemFromDbAction(itemId);
    if (!result.success) {
      toast({ variant: "destructive", title: "Gagal Menghapus Item", description: result.error });
      setSplitItems(originalItems);
    }
  };


  const handleBillDetailsChange = async (field: keyof BillDetails, value: string | number | TaxTipSplitStrategy) => {
    if (!currentBillId) return;
    setDetailedBillSummary(null);
    const newDetails = { ...billDetails, [field]: value };
    setBillDetails(newDetails); // Optimistic update
    
    const updateToDb = {
        payer_participant_id: newDetails.payerId,
        tax_amount: newDetails.taxAmount,
        tip_amount: newDetails.tipAmount,
        tax_tip_split_strategy: newDetails.taxTipSplitStrategy,
    };
    
    // Fire and forget, optimistic update is enough here
    await supabase.from('bills').update(updateToDb).eq('id', currentBillId);
  };

  const handleCalculateSummary = async () => {
    if (!currentBillId || !billDetails.payerId) {
      toast({ variant: "destructive", title: "Gagal Menghitung", description: "Pembayar belum dipilih." });
      return;
    }
    
    if (people.length < 1) {
      toast({ variant: "destructive", title: "Partisipan Kurang", description: "Perlu minimal satu orang." });
      return;
    }
    
    setIsCalculating(true);
    setError(null);

    const result = await handleSummarizeBillAction(
      itemsForSummary, people, currentBillId, billDetails.payerId, 
      billDetails.taxAmount, billDetails.tipAmount, billDetails.taxTipSplitStrategy
    );

    if (result.success) {
      toast({ title: "Tagihan Diringkas & Disimpan" });
      loadBillSession(currentBillId); // Force a reload to get final summary state
    } else {
      setError(result.error || "Gagal meringkas tagihan.");
      toast({ variant: "destructive", title: "Ringkasan Gagal", description: result.error });
    }
    setIsCalculating(false);
  };

  const handleMarkAsPaid = async () => {
    if (!currentBillId) {
      toast({ variant: "destructive", title: "Gagal", description: "Tidak ada tagihan untuk dibayar." });
      return;
    }
    setIsPaying(true);
    const result = await markSettlementsAsPaidAction(currentBillId);
    if (result.success) {
      toast({ title: "Pembayaran Berhasil", description: "Semua tagihan telah ditandai lunas." });
      router.push('/');
    } else {
      toast({ variant: "destructive", title: "Pembayaran Gagal", description: result.error });
    }
    setIsPaying(false);
  };
  

  if (isLoading || !authUser) {
    return (
      <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
        <LandingHeader />
        <main className="relative z-10 flex flex-col items-center justify-center text-center flex-grow p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-foreground">Memuat...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <LandingHeader />
      <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
        <div className="space-y-8">
          {error && (
            <Alert variant="destructive" className="shadow-md">
              <Power className="h-4 w-4" />
              <AlertTitle>Kesalahan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentStep === 0 && ( 
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b p-6">
                <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center"><FileText className="mr-3 h-6 w-6"/>Mulai Tagihan Baru</CardTitle>
                <CardDescription>Pilih kategori, beri nama tagihan Anda, dan pilih waktu pembuatan.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                 <div className="space-y-3">
                  <Label htmlFor="billCategory">Kategori Tagihan</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                        value={selectedCategoryId || ""}
                        onValueChange={(value) => {
                            if (value === "create_new") {
                                setShowNewCategoryInput(true);
                                setSelectedCategoryId(null);
                            } else {
                                setSelectedCategoryId(value);
                                setShowNewCategoryInput(false);
                                setNewCategoryInput("");
                            }
                        }}
                        disabled={isLoadingCategories || showNewCategoryInput}
                    >
                        <SelectTrigger id="billCategory" className="flex-grow">
                            <SelectValue placeholder={isLoadingCategories ? "Memuat kategori..." : "Pilih kategori"} />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                            <SelectItem value="create_new">
                                <span className="flex items-center"><FolderPlus className="mr-2 h-4 w-4"/>Buat Kategori Baru...</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  {showNewCategoryInput && (
                    <div className="mt-2 space-y-2">
                         <Label htmlFor="newCategoryName" className="text-sm">Nama Kategori Baru (maks 20 karakter)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="newCategoryName"
                                type="text"
                                placeholder="Contoh: Makanan, Transportasi"
                                value={newCategoryInput}
                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                maxLength={20}
                                className="flex-grow"
                            />
                            <Button variant="ghost" onClick={() => {setShowNewCategoryInput(false); setNewCategoryInput(""); if(categories.length > 0 && categories[0]) setSelectedCategoryId(categories[0].id)}}>Batal</Button>
                        </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billName">Nama Tagihan</Label>
                   <div className="relative">
                     <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="billName"
                        type="text"
                        placeholder="Contoh: Makan Malam Tim, Trip ke Bali"
                        value={billNameInput}
                        onChange={(e) => setBillNameInput(e.target.value)}
                        className="flex-grow pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                    <Label>Kapan tagihan ini akan dibuat?</Label>
                    <RadioGroup value={billTimingOption} onValueChange={(value) => setBillTimingOption(value as 'now' | 'schedule')} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                            <RadioGroupItem value="now" id="timing-now" />
                            <Label htmlFor="timing-now" className="font-normal leading-tight cursor-pointer flex-1">
                                Buat Sekarang
                                <p className="text-xs text-muted-foreground">Langsung isi detail dan hitung tagihan.</p>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                            <RadioGroupItem value="schedule" id="timing-schedule" />
                            <Label htmlFor="timing-schedule" className="font-normal leading-tight cursor-pointer flex-1">
                                Jadwalkan
                                 <p className="text-xs text-muted-foreground">Simpan tagihan untuk diisi detailnya nanti.</p>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {billTimingOption === 'schedule' && (
                    <div className="space-y-2">
                        <Label htmlFor="scheduledAt">Tanggal & Waktu Penjadwalan</Label>
                        <div className="relative">
                           <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="scheduledAt"
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="pl-10"
                                min={new Date().toISOString().slice(0, 16)} 
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Pilih tanggal dan waktu di masa mendatang untuk tagihan ini.</p>
                    </div>
                )}
              </CardContent>
              <CardFooter className="p-6">
                <Button 
                    onClick={startNewBillSession} 
                    disabled={
                        (!selectedCategoryId && !showNewCategoryInput) ||
                        (showNewCategoryInput && !newCategoryInput.trim()) ||
                        !billNameInput.trim() || 
                        isCalculating || 
                        (billTimingOption === 'schedule' && !scheduledAt)
                    } 
                    className="w-full" 
                    size="lg"
                >
                  {isCalculating ? <Loader2 className="animate-spin mr-2"/> : 
                    billTimingOption === 'now' ? <ArrowRight className="mr-2 h-4 w-4" /> : <CalendarClock className="mr-2 h-4 w-4" />
                  }
                  {isCalculating ? "Memproses..." : 
                    billTimingOption === 'now' ? "Lanjut & Isi Detail Tagihan" : "Jadwalkan Tagihan"
                  } 
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {currentStep === 1 && currentBillId && ( 
            <>
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center">
                        Tagihan: <span className="text-primary ml-2">{currentBillName}</span>
                    </CardTitle>
                    <CardDescription>Masukkan semua partisipan dan item untuk membagi tagihan.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => resetAppToStart(true)}> 
                    <FilePlus className="mr-2 h-4 w-4" /> Buat Tagihan Lain
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                 <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5"/>Partisipan</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            type="text"
                            placeholder="Masukkan nama partisipan..."
                            value={personNameInput}
                            onChange={(e) => setPersonNameInput(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleAddGuest(); }}
                            className="flex-grow"
                        />
                        <Button onClick={handleAddGuest} disabled={!personNameInput.trim()} className="w-full sm:w-auto">
                            <UserPlus className="mr-2 h-4 w-4" /> Tambah Partisipan
                        </Button>
                      </div>

                      {people.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <h4 className="text-sm font-medium text-muted-foreground">Daftar Partisipan ({people.length}):</h4>
                            <div className="flex flex-wrap gap-3">
                              {people.map(person => (
                                <div key={person.id} className="flex items-center gap-2 bg-secondary text-secondary-foreground p-1.5 pr-2.5 rounded-full shadow-sm">
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={person.avatar_url || undefined} alt={person.name} />
                                    <AvatarFallback>{person.name.substring(0,1).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">{person.name}</span>
                                  {person.profile_id === authUser?.id && (
                                     <Badge variant="outline" className="text-xs bg-primary/20 text-primary-foreground border-primary/30">Anda</Badge>
                                  )}
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                      onClick={() => handleRemovePerson(person.id)}
                                      aria-label={`Hapus ${person.name}`}
                                  >
                                      <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                        </div>
                      )}
                    </div>
                </section>

                <Separator/>

                
                <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><ScanLine className="mr-2 h-5 w-5"/>Pindai Struk (Opsional)</h3>
                    <ReceiptUploader 
                        onScan={handleScanReceipt} 
                        isScanning={isScanning} 
                        onClearPreview={() => {
                            toast({ title: "Pratinjau Dihapus" });
                        }}
                    />
                </section>
                
                <Separator/>

                
                <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><Edit2 className="mr-2 h-5 w-5"/>Item Tagihan & Alokasi</h3>
                     <ItemEditor
                        items={splitItems}
                        people={people}
                        onUpdateItem={handleUpdateItem}
                        onAddItem={handleAddItem}
                        onDeleteItem={handleDeleteItem}
                    />
                </section>

                <Separator/>
                <section>
                  <h3 className="text-lg font-semibold mb-3">Detail Pembayaran Tambahan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="payer">Siapa yang Membayar?</Label>
                      <Select
                        value={billDetails.payerId || ""}
                        onValueChange={(value) => handleBillDetailsChange("payerId", value)} 
                        disabled={people.length === 0}
                      >
                        <SelectTrigger id="payer" className="w-full">
                          <SelectValue placeholder={people.length > 0 ? "Pilih pembayar" : "Tambah partisipan dahulu"} />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map(person => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                           onFocus={() => { if (billDetails.tipAmount === 0) setTipInputDisplayValue(""); }}
                           onChange={(e) => setTipInputDisplayValue(e.target.value)}
                           onBlur={(e) => handleBillDetailsChange("tipAmount", parseFloat(e.target.value) || 0)}
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
                </section>
                </CardContent>
                <CardFooter className="border-t p-6">
                    <Button 
                    onClick={handleCalculateSummary} 
                    disabled={isCalculating || !billDetails.payerId || people.length === 0 || !currentBillId} 
                    size="lg" 
                    className="w-full"
                    >
                    {isCalculating ? (
                        <Loader2 className="animate-spin mr-2" />
                    ) : (
                        <UserCheck className="mr-2" />
                    )}
                    {isCalculating ? "Menghitung..." : "Selesaikan & Lihat Ringkasan"}
                    </Button>
                </CardFooter>
            </Card>
            </>
          )}
          
          {currentStep === 2 && detailedBillSummary && ( 
             <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
               <CardHeader className="bg-card/60 border-b flex flex-row items-start justify-between p-6 gap-4">
                <div className="min-w-0"> 
                  <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center">
                    <ListChecks className="mr-3 h-6 w-6 flex-shrink-0"/>
                    <span>Ringkasan Tagihan:&nbsp;</span>
                    <span className="truncate text-primary">{currentBillName}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Ini dia siapa berutang apa. Gampang kan!
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => resetAppToStart(true)} size="sm" className="flex-shrink-0"> 
                    <FilePlus className="mr-2 h-4 w-4" /> Buat Tagihan Baru
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <SummaryDisplay summary={detailedBillSummary} people={people} />
                {detailedBillSummary.settlements && detailedBillSummary.settlements.length > 0 && (
                  <div className="mt-6 border-t pt-6 text-center">
                    <h3 className="text-lg font-semibold flex items-center justify-center mb-4"><QrCode className="mr-2 h-6 w-6"/>Selesaikan Pembayaran</h3>
                    <div className="flex justify-center mb-4">
                        <img src="https://placehold.co/250x250.png" alt="QR Code" width="250" height="250" data-ai-hint="qr code" />
                    </div>
                    <Alert className="max-w-md mx-auto text-left">
                      <AlertTitle>Perhatian!</AlertTitle>
                      <AlertDescription>
                        Akan dikenakan biaya layanan sebesar 1% untuk setiap transaksi yang diselesaikan melalui metode pembayaran ini.
                      </AlertDescription>
                    </Alert>
                    <Button onClick={handleMarkAsPaid} disabled={isPaying} size="lg" className="mt-4">
                      {isPaying ? <Loader2 className="animate-spin mr-2"/> : null}
                      {isPaying ? "Memproses..." : "Konfirmasi Semua Pembayaran Lunas"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="relative z-10 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}
