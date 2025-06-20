
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { SplitItem, Person, BillDetails, TaxTipSplitStrategy, DetailedBillSummaryData, BillCategory } from "@/lib/types";
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
  createBillCategoryAction 
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
import { Home, LogOut, Settings, UserCircle, Power, Info, Percent, Landmark, UserCheck, Loader2, UserPlus, ArrowRight, Trash2, Users, ScanLine, PlusCircle, Edit2, ListChecks, FilePlus, FileText, CalendarClock, FolderPlus, Tag } from "lucide-react"; 
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
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
import { NotificationBell } from "@/components/notification-bell";

interface Profile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string; 
}

const DEFAULT_CATEGORIES = ["Makanan", "Transportasi", "Hiburan", "Penginapan", "Lainnya"];
const ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE = ["Makanan", "Transportasi", "Hiburan", "Penginapan"];
const OTHERS_CATEGORY_NAME_FOR_PAGE = "Lainnya";


export default function SplitBillAppPage() {
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [billNameInput, setBillNameInput] = useState<string>("");
  const [currentBillName, setCurrentBillName] = useState<string>("");

  const [billTimingOption, setBillTimingOption] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const [people, setPeople] = useState<Person[]>([]);
  const [personNameInput, setPersonNameInput] = useState<string>("");

  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
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
  const [currentStep, setCurrentStep] = useState(0); 

  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isInitializingBill, setIsInitializingBill] = useState(false);

  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState<string>("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);


  const { toast } = useToast();
  const router = useRouter();

  const [taxInputDisplayValue, setTaxInputDisplayValue] = useState<string>(billDetails.taxAmount.toString());
  const [tipInputDisplayValue, setTipInputDisplayValue] = useState<string>(billDetails.tipAmount.toString());

  const fetchUserAndCategories = useCallback(async () => {
    setIsLoadingUser(true);
    setIsLoadingCategories(true);
    const { user, profile, error: userError } = await getCurrentUserAction();
    if (userError) {
      console.error("Error fetching user data:", userError);
    }
    setAuthUser(user);
    setUserProfile(profile);
    setIsLoadingUser(false);
    if (!user) {
        toast({variant: "destructive", title: "Akses Ditolak", description: "Anda harus login untuk menggunakan aplikasi."});
        router.push("/login");
        setIsLoadingCategories(false);
        return;
    }

    let fetchedCategories: BillCategory[] = [];
    const categoriesResult = await getUserCategoriesAction();
    if (categoriesResult.success && categoriesResult.categories) {
      fetchedCategories = categoriesResult.categories;
    } else {
      toast({ variant: "destructive", title: "Gagal Memuat Kategori", description: categoriesResult.error });
    }

    const existingCategoryNamesLower = fetchedCategories.map(cat => cat.name.toLowerCase());
    
    for (const defaultCatName of DEFAULT_CATEGORIES) {
      if (!existingCategoryNamesLower.includes(defaultCatName.toLowerCase())) {
        const creationResult = await createBillCategoryAction(defaultCatName);
        if (creationResult.success && creationResult.category) {
          fetchedCategories.push(creationResult.category);
        } else {
          console.warn(`Failed to create default category "${defaultCatName}": ${creationResult.error}`);
        }
      }
    }
    
    // Custom sorting for categories
    let orderedDefaults: BillCategory[] = [];
    let customCats: BillCategory[] = [];
    let othersCat: BillCategory | null = null;

    fetchedCategories.forEach(cat => {
      if (cat.name === OTHERS_CATEGORY_NAME_FOR_PAGE) {
        othersCat = cat;
      } else if (ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.includes(cat.name)) {
        orderedDefaults.push(cat);
      } else {
        customCats.push(cat);
      }
    });

    orderedDefaults.sort((a, b) => ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.indexOf(a.name) - ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.indexOf(b.name));
    customCats.sort((a, b) => a.name.localeCompare(b.name));

    const finalSortedCategories = [...orderedDefaults, ...customCats];
    if (othersCat) {
      finalSortedCategories.push(othersCat);
    }
    
    setCategories(finalSortedCategories);
    setIsLoadingCategories(false);

  }, [router, toast]);

  useEffect(() => {
    fetchUserAndCategories();
  }, [fetchUserAndCategories]);

  const startNewBillSession = useCallback(async () => {
    if (!authUser) { 
      setError("Pengguna tidak terautentikasi. Mohon login untuk membuat tagihan.");
      toast({variant: "destructive", title: "Akses Ditolak", description: "Anda harus login untuk menggunakan aplikasi."});
      router.push("/login");
      return;
    }
    if (!billNameInput.trim()) {
      toast({ variant: "destructive", title: "Nama Tagihan Kosong", description: "Mohon masukkan nama untuk tagihan Anda."});
      return;
    }
    
    let finalCategoryId = selectedCategoryId;

    if (showNewCategoryInput) {
        if (!newCategoryInput.trim()) {
            toast({ variant: "destructive", title: "Nama Kategori Baru Kosong", description: "Mohon masukkan nama untuk kategori baru atau pilih yang sudah ada."});
            return;
        }
        if (newCategoryInput.trim().length > 20) {
             toast({ variant: "destructive", title: "Nama Kategori Terlalu Panjang", description: "Nama kategori maksimal 20 karakter."});
            return;
        }
        const categoryResult = await createBillCategoryAction(newCategoryInput.trim());
        if (categoryResult.success && categoryResult.category) {
            finalCategoryId = categoryResult.category.id;
            // After creating a new category, re-fetch and re-sort categories
            await fetchUserAndCategories(); // This will re-sort and update the `categories` state
            setSelectedCategoryId(finalCategoryId); 
            setShowNewCategoryInput(false);
            setNewCategoryInput("");
            toast({ title: "Kategori Baru Ditambahkan", description: `Kategori "${categoryResult.category.name}" berhasil dibuat.`});
        } else {
            toast({ variant: "destructive", title: "Gagal Membuat Kategori", description: categoryResult.error || "Tidak dapat menyimpan kategori baru." });
            return; 
        }
    }

    if (!finalCategoryId && billTimingOption === 'now') { 
        toast({ variant: "destructive", title: "Kategori Belum Dipilih", description: "Mohon pilih atau buat kategori untuk tagihan ini."});
        return;
    }


    setIsInitializingBill(true);
    setError(null);

    if (billTimingOption === 'schedule') {
      if (!scheduledAt) {
        toast({ variant: "destructive", title: "Jadwal Kosong", description: "Mohon pilih tanggal dan waktu untuk penjadwalan."});
        setIsInitializingBill(false);
        return;
      }
      try {
        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          throw new Error("Format tanggal jadwal tidak valid.");
        }
        if (scheduledDate <= new Date()) {
          toast({ variant: "destructive", title: "Jadwal Tidak Valid", description: "Waktu yang dijadwalkan harus di masa mendatang."});
          setIsInitializingBill(false);
          return;
        }

        const result = await createBillAction(billNameInput.trim(), finalCategoryId, scheduledDate.toISOString());
        if (result.success && result.billId) {
          toast({ 
            title: "Tagihan Dijadwalkan", 
            description: `Tagihan "${billNameInput.trim()}" berhasil dijadwalkan untuk ${format(scheduledDate, "dd MMMM yyyy 'pukul' HH:mm", { locale: IndonesianLocale })}.`
          });
          resetAppToStart(); 
        } else {
          setError(result.error || "Gagal menjadwalkan tagihan.");
          toast({ variant: "destructive", title: "Penjadwalan Gagal", description: result.error || "Tidak dapat membuat tagihan terjadwal di database." });
        }
      } catch (e: any) {
         setError(e.message || "Kesalahan saat memproses jadwal.");
         toast({ variant: "destructive", title: "Kesalahan Jadwal", description: e.message || "Tidak dapat memproses waktu yang dijadwalkan." });
      }
    } else { 
      const result = await createBillAction(billNameInput.trim(), finalCategoryId, null);
      if (result.success && result.billId) {
        setCurrentBillId(result.billId);
        setCurrentBillName(billNameInput.trim());
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
        toast({ title: "Sesi Tagihan Dimulai", description: `Tagihan "${billNameInput.trim()}" siap untuk diisi.`});
      } else {
        setError(result.error || "Gagal memulai sesi tagihan baru.");
        toast({ variant: "destructive", title: "Inisialisasi Gagal", description: result.error || "Tidak dapat membuat tagihan baru di database." });
      }
    }
    setIsInitializingBill(false);
  }, [authUser, billNameInput, billTimingOption, scheduledAt, router, toast, selectedCategoryId, newCategoryInput, showNewCategoryInput, fetchUserAndCategories]);
  
  const resetAppToStart = () => {
     setCurrentBillId(null);
     setCurrentBillName("");
     setBillNameInput("");
     setSelectedCategoryId(null);
     setNewCategoryInput("");
     setShowNewCategoryInput(false);
     setBillTimingOption("now");
     setScheduledAt("");
     setPeople([]);
     setPersonNameInput("");
     setSplitItems([]);
     setBillDetails({ payerId: null, taxAmount: 0, tipAmount: 0, taxTipSplitStrategy: "SPLIT_EQUALLY" });
     setDetailedBillSummary(null);
     setCurrentStep(0); 
     setError(null);
     if (!authUser) {
        toast({variant: "destructive", title: "Pengguna Tidak Login", description: "Silakan login untuk menggunakan aplikasi."})
        router.push("/login");
     }
     if (authUser) {
        fetchUserAndCategories(); 
     }
  }

  useEffect(() => {
    if (people.length > 0) {
      const payerExists = people.some(p => p.id === billDetails.payerId);
      if (!billDetails.payerId || !payerExists) {
        setBillDetails(prev => ({ ...prev, payerId: people[0].id }));
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
      setPeople(prev => [...prev, result.person!]);
      setPersonNameInput("");
      toast({ title: "Orang Ditambahkan", description: `${result.person.name} telah ditambahkan.`});
    } else {
      toast({ variant: "destructive", title: "Gagal Menambah Orang", description: result.error || "Tidak dapat menyimpan orang ke database." });
    }
  };

  const handleRemovePerson = async (personIdToRemove: string) => {
    if (!currentBillId) return;
    const result = await removeParticipantAction(personIdToRemove);
    if (result.success) {
      const personRemoved = people.find(p => p.id === personIdToRemove);
      setPeople(prev => prev.filter(p => p.id !== personIdToRemove));
      setSplitItems(prevItems => prevItems.map(item => ({
        ...item,
        assignedTo: item.assignedTo.filter(a => a.personId !== personIdToRemove)
      })));
      toast({ title: "Orang Dihapus", description: `${personRemoved?.name || 'Orang tersebut'} telah dihapus.`});
      if (billDetails.payerId === personIdToRemove) {
        setBillDetails(prev => ({ ...prev, payerId: people.length > 1 ? people.find(p => p.id !== personIdToRemove)!.id : null }));
      }
    } else {
       toast({ variant: "destructive", title: "Gagal Menghapus Orang", description: result.error || "Tidak dapat menghapus orang dari database." });
    }
  };
  
  const handleScanReceipt = async (receiptDataUri: string) => {
    setIsScanning(true);
    setError(null);
    setDetailedBillSummary(null); 
    
    const result = await handleScanReceiptAction(receiptDataUri);
    if (result.success && result.data) {
      const newSplitItems: SplitItem[] = result.data.items.map(item => ({ 
        id: item.id, 
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        assignedTo: [], 
      }));
      setSplitItems(prev => [...prev, ...newSplitItems]); 
      toast({ title: "Struk Dipindai", description: `${newSplitItems.length} baris item ditambahkan.` });
       if (newSplitItems.length === 0) {
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
    if (!currentBillId) {
      setError("Sesi tagihan tidak ditemukan. Mohon coba mulai tagihan baru.");
      toast({ variant: "destructive", title: "Gagal Menghitung", description: "Sesi tagihan tidak valid." });
      return;
    }
    if (!billDetails.payerId) {
      setError("Mohon pilih siapa yang membayar tagihan.");
      toast({ variant: "destructive", title: "Gagal Menghitung", description: "Pembayar belum dipilih." });
      return;
    }
    if (people.length < 2) {
      toast({ variant: "destructive", title: "Partisipan Kurang", description: "Perlu minimal dua orang untuk membagi tagihan." });
      return;
    }
    
    setIsCalculating(true);
    setError(null);

    if (itemsForSummary.length === 0 && billDetails.taxAmount === 0 && billDetails.tipAmount === 0) {
        setError("Tidak ada item, pajak, atau tip untuk diringkas.");
        toast({ variant: "destructive", title: "Ringkasan Gagal", description: "Tidak ada yang bisa diringkas." });
        setIsCalculating(false);
        const payer = people.find(p => p.id === billDetails.payerId);
        setDetailedBillSummary({ 
            payerName: payer?.name || "Pembayar",
            taxAmount: 0, tipAmount: 0, grandTotal: 0,
            personalTotalShares: people.reduce((acc, p) => ({...acc, [p.name]: 0}), {}),
            settlements: []
        });
        await handleSummarizeBillAction( 
          [], people, currentBillId, billDetails.payerId, 0, 0, billDetails.taxTipSplitStrategy
        );
        setCurrentStep(2); 
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

    const result = await handleSummarizeBillAction(
      itemsForSummary, 
      people, 
      currentBillId,
      billDetails.payerId, 
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
      
      for (const person of people) {
        const personShare = rawSummary[person.name] || 0; 
        if (person.id !== billDetails.payerId && personShare > 0) {
          detailedSummary.settlements.push({
            from: person.name,
            to: payer ? payer.name : "Pembayar Tidak Diketahui",
            amount: personShare,
          });
        }
      }
      
      setDetailedBillSummary(detailedSummary);
      toast({ title: "Tagihan Diringkas & Disimpan", description: "Ringkasan berhasil dihitung dan tagihan ini akan muncul di riwayat." });
      setCurrentStep(2); 
    } else {
      setError(result.error || "Gagal meringkas tagihan.");
      toast({ variant: "destructive", title: "Ringkasan Gagal", description: result.error || "Tidak dapat menghitung ringkasan." });
    }
    setIsCalculating(false);
  };

  const handleLogout = async () => {
    const { success, error: logoutErr } = await logoutUserAction();
    if (success) {
      toast({ title: "Logout Berhasil" });
      setAuthUser(null);
      setUserProfile(null);
      resetAppToStart(); 
      router.push("/");
    } else {
      toast({ variant: "destructive", title: "Logout Gagal", description: logoutErr });
    }
  };
  
  if (isLoadingUser || isLoadingCategories) {
    return (
      <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
        <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6"> 
            <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <Image src="/logo.png" alt="Patungan Logo" width={56} height={56} className="rounded-lg shadow-sm" data-ai-hint="logo company"/>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Patungan</h1>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
               <Button variant="ghost" className="rounded-md p-1 sm:p-1.5 h-auto" disabled>
                  <Home className="h-10 w-10" />
              </Button>
            </div>
          </div>
        </header>
        <main className="relative z-10 flex flex-col items-center justify-center text-center flex-grow p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-foreground">
                {isLoadingUser ? "Memuat data pengguna..." : "Memuat kategori..."}
            </p>
        </main>
      </div>
    );
  }

  const displayName = userProfile?.username || userProfile?.full_name || authUser?.email || "Pengguna";
  const avatarInitial = displayName ? displayName.substring(0,1).toUpperCase() : "P";
  const shortDisplayName = userProfile?.username || (userProfile?.full_name ? userProfile.full_name.split(' ')[0] : (authUser?.email ? authUser.email.split('@')[0] : "Pengguna"));


  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6"> 
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <Image src="/logo.png" alt="Patungan Logo" width={56} height={56} className="rounded-lg shadow-sm" data-ai-hint="logo company"/>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Patungan
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" className="rounded-md p-1 sm:p-1.5 h-auto" onClick={() => router.push('/')} disabled={!authUser} aria-label="Kembali ke Beranda">
                <Home className="h-10 w-10" />
            </Button>
            {authUser && <NotificationBell authUser={authUser} />}
            {authUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1.5 sm:gap-2 rounded-md p-1 sm:p-1.5 h-auto">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                      <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} data-ai-hint="profile avatar"/>
                      <AvatarFallback>{avatarInitial}</AvatarFallback>
                    </Avatar>
                     <span className="hidden sm:inline text-xs sm:text-sm font-medium text-foreground truncate max-w-[70px] xs:max-w-[100px] md:max-w-[120px] group-hover:text-foreground/80 transition-colors">
                      {shortDisplayName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.full_name || displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {authUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/app/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast({title: "Info", description: "Pengaturan belum diimplementasikan."})}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/login')} variant="outline" size="sm">
                Masuk / Daftar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
        {!authUser && !isLoadingUser && (
             <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                <CardHeader className="bg-card/60 border-b">
                    <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center">
                        <Info className="mr-3 h-6 w-6 text-primary"/> Selamat Datang di Patungan!
                    </CardTitle>
                    <CardDescription>Untuk memulai membagi tagihan, silakan masuk atau daftar terlebih dahulu.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
                     <Button onClick={() => router.push('/login')} className="w-full sm:w-auto" size="lg">
                        Masuk
                    </Button>
                    <Button onClick={() => router.push('/signup')} variant="outline" className="w-full sm:w-auto" size="lg">
                        Daftar Akun Baru
                    </Button>
                </CardContent>
             </Card>
        )}

        {authUser && (
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
                        isInitializingBill || 
                        (billTimingOption === 'schedule' && !scheduledAt)
                    } 
                    className="w-full" 
                    size="lg"
                >
                  {isInitializingBill ? <Loader2 className="animate-spin mr-2"/> : 
                    billTimingOption === 'now' ? <ArrowRight className="mr-2 h-4 w-4" /> : <CalendarClock className="mr-2 h-4 w-4" />
                  }
                  {isInitializingBill ? "Memproses..." : 
                    billTimingOption === 'now' ? "Lanjut & Isi Detail Tagihan" : "Jadwalkan Tagihan"
                  } 
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {currentStep === 1 && currentBillId && ( 
            <>
            <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <CardHeader className="bg-card/60 border-b p-6">
                <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center">
                    Tagihan: <span className="text-primary ml-2">{currentBillName}</span>
                </CardTitle>
                <CardDescription>Masukkan semua detail untuk tagihan ini.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                
                <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5"/>Partisipan</h3>
                    <div className="flex space-x-2">
                    <Input
                        type="text"
                        placeholder="Nama Orang"
                        value={personNameInput}
                        onChange={(e) => setPersonNameInput(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleAddPerson(); }}
                        className="flex-grow"
                    />
                    <Button onClick={handleAddPerson} variant="outline" disabled={!personNameInput.trim()}>
                        <UserPlus className="mr-2 h-4 w-4" /> Tambah
                    </Button>
                    </div>
                    {people.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Daftar Orang ({people.length}):</h4>
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
                </section>

                <Separator/>

                
                <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><ScanLine className="mr-2 h-5 w-5"/>Pindai Struk (Opsional)</h3>
                    <ReceiptUploader 
                        onScan={handleScanReceipt} 
                        isScanning={isScanning} 
                        onClearPreview={() => {
                            toast({ title: "Pratinjau Dihapus", description: "Anda dapat memindai atau mengunggah struk baru."});
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
                        onCalculateSummary={() => {}} 
                        isCalculating={false} 
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
                </section>
                </CardContent>
                <CardFooter className="border-t p-6">
                    <Button 
                    onClick={handleCalculateSummary} 
                    disabled={isCalculating || (itemsForSummary.length === 0 && billDetails.taxAmount === 0 && billDetails.tipAmount === 0) || !billDetails.payerId || people.length < 2 || !currentBillId} 
                    size="lg" 
                    className="w-full"
                    >
                    {isCalculating ? (
                        <Loader2 className="animate-spin mr-2" />
                    ) : (
                        <UserCheck className="mr-2" />
                    )}
                    {isCalculating ? "Menghitung..." : "Hitung & Lihat Ringkasan Tagihan"}
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
                <Button variant="outline" onClick={resetAppToStart} size="sm" disabled={!authUser} className="flex-shrink-0"> 
                    <FilePlus className="mr-2 h-4 w-4" /> Buat Tagihan Baru
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <SummaryDisplay summary={detailedBillSummary} people={people} />
              </CardContent>
            </Card>
          )}
        </div>
        )}
      </main>
      <footer className="relative z-10 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}

    
