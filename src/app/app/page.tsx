

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { SplitItem, Person, BillDetails, TaxTipSplitStrategy, DetailedBillSummaryData, BillCategory, ScannedItem, FriendDisplay } from "@/lib/types";
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
  getFriendsAction
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
import { UserCheck, Loader2, UserPlus, ArrowRight, Trash2, Users, ScanLine, PlusCircle, Edit2, ListChecks, FilePlus, FileText, CalendarClock, FolderPlus, Tag, Percent, Landmark, Power, User, Users2, Clock } from "lucide-react"; 
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import { LandingHeader } from "@/components/landing-header";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";


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
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isInitializingBill, setIsInitializingBill] = useState(false);

  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState<string>("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  // State for friends and invite dialog
  const [friends, setFriends] = useState<FriendDisplay[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);


  const { toast } = useToast();
  const router = useRouter();

  const [taxInputDisplayValue, setTaxInputDisplayValue] = useState<string>(billDetails.taxAmount.toString());
  const [tipInputDisplayValue, setTipInputDisplayValue] = useState<string>(billDetails.tipAmount.toString());

  const fetchUserAndCategories = useCallback(async () => {
    setIsLoadingUser(true);
    setIsLoadingCategories(true);
    const { user, error: userError } = await getCurrentUserAction();
    if (userError) {
      console.error("Error fetching user data:", userError);
    }
    setAuthUser(user);
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
    let newCategoriesAdded = false;
    
    for (const defaultCatName of DEFAULT_CATEGORIES) {
      if (!existingCategoryNamesLower.includes(defaultCatName.toLowerCase())) {
        const creationResult = await createBillCategoryAction(defaultCatName);
        if (creationResult.success && creationResult.category) {
          fetchedCategories.push(creationResult.category);
          newCategoriesAdded = true;
        } else {
          console.warn(`Failed to create default category "${defaultCatName}": ${creationResult.error}`);
        }
      }
    }
    
    let orderedDefaults: BillCategory[] = [];
    let customCats: BillCategory[] = [];
    let othersCat: BillCategory | null = null;

    fetchedCategories.forEach(cat => {
      if (cat.name.toLowerCase() === OTHERS_CATEGORY_NAME_FOR_PAGE.toLowerCase()) {
        othersCat = cat;
      } else if (ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.some(dn => dn.toLowerCase() === cat.name.toLowerCase())) {
        orderedDefaults.push(cat);
      } else {
        customCats.push(cat);
      }
    });
    
    orderedDefaults.sort((a, b) => {
        const indexA = ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.findIndex(name => name.toLowerCase() === a.name.toLowerCase());
        const indexB = ORDERED_DEFAULT_CATEGORY_NAMES_FOR_PAGE.findIndex(name => name.toLowerCase() === b.name.toLowerCase());
        return indexA - indexB;
    });
    customCats.sort((a, b) => a.name.localeCompare(b.name));

    const finalSortedCategories = [...orderedDefaults, ...customCats];
    if (othersCat) {
      finalSortedCategories.push(othersCat);
    }
    
    setCategories(finalSortedCategories);
    setIsLoadingCategories(false);
  }, [router, toast]);

  const fetchFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    const result = await getFriendsAction();
    if (result.success && result.friends) {
      setFriends(result.friends);
    } else {
      toast({ variant: "destructive", title: "Gagal Memuat Teman", description: result.error });
    }
    setIsLoadingFriends(false);
  }, [toast]);


  useEffect(() => {
    fetchUserAndCategories();
    fetchFriends();
  }, [fetchUserAndCategories, fetchFriends]);

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
            await fetchUserAndCategories(); 
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
        fetchFriends();
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


  const handleAddGuest = async () => {
    if (!currentBillId) {
      toast({ variant: "destructive", title: "Tagihan Belum Siap", description: "Sesi tagihan belum terinisialisasi." });
      return;
    }
    if (personNameInput.trim() === "") {
      toast({ variant: "destructive", title: "Nama Tamu Kosong", description: "Nama tamu tidak boleh kosong." });
      return;
    }
    if (people.some(p => p.name.toLowerCase() === personNameInput.trim().toLowerCase())) {
      toast({ variant: "destructive", title: "Nama Duplikat", description: "Nama tersebut sudah ada dalam daftar." });
      return;
    }
    
    // Add as guest, so profileId is null
    const result = await addParticipantAction(currentBillId, personNameInput.trim(), null);
    if (result.success && result.person) {
      setPeople(prev => [...prev, result.person!]);
      setPersonNameInput("");
      toast({ title: "Tamu Ditambahkan", description: `${result.person.name} telah ditambahkan.`});
    } else {
      toast({ variant: "destructive", title: "Gagal Menambah Tamu", description: result.error || "Tidak dapat menyimpan tamu ke database." });
    }
  };

  const handleInviteFriend = async (friend: FriendDisplay) => {
    if (!currentBillId) {
      toast({ variant: "destructive", title: "Tagihan Belum Siap", description: "Sesi tagihan belum terinisialisasi." });
      return;
    }
    if (people.some(p => p.profile_id === friend.id)) {
      toast({ variant: "destructive", title: "Sudah Ditambahkan", description: `${friend.full_name || friend.username} sudah ada dalam daftar.` });
      return;
    }

    const result = await addParticipantAction(currentBillId, friend.full_name || friend.username || 'Friend', friend.id);
    if (result.success && result.person) {
      const newPerson: Person = {
        ...result.person,
        avatar_url: friend.avatar_url,
      };
      setPeople(prev => [...prev, newPerson]);
      toast({ title: "Teman Diundang", description: `Undangan untuk ${newPerson.name} telah dikirim.` });
    } else {
      toast({ variant: "destructive", title: "Gagal Mengundang Teman", description: result.error || "Tidak dapat menambahkan teman ke database." });
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
      toast({ title: "Partisipan Dihapus", description: `${personRemoved?.name || 'Partisipan tersebut'} telah dihapus.`});
      if (billDetails.payerId === personIdToRemove) {
        setBillDetails(prev => ({ ...prev, payerId: people.length > 1 ? people.find(p => p.id !== personIdToRemove)!.id : null }));
      }
    } else {
       toast({ variant: "destructive", title: "Gagal Menghapus Partisipan", description: result.error || "Tidak dapat menghapus orang dari database." });
    }
  };
  
  const handleScanReceipt = async (receiptDataUri: string) => {
    if (!currentBillId) {
      toast({ variant: "destructive", title: "Sesi Tagihan Tidak Aktif", description: "Harap mulai sesi tagihan baru terlebih dahulu." });
      setIsScanning(false);
      return;
    }
    setIsScanning(true);
    setError(null);
    setDetailedBillSummary(null); 
    
    const result = await handleScanReceiptAction(currentBillId, receiptDataUri);
    if (result.success && result.data) {
      const newSplitItems: SplitItem[] = result.data.items.map(item => ({ 
        id: item.id, 
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        assignedTo: [], 
      }));
      setSplitItems(prev => [...prev, ...newSplitItems]); 
      toast({ title: "Struk Dipindai & Disimpan", description: `${newSplitItems.length} baris item ditambahkan ke tagihan.` });
       if (newSplitItems.length === 0) {
        toast({ variant: "default", title: "Tidak ada item ditemukan", description: "Pemindaian struk tidak menemukan item apapun. Coba tambahkan manual atau pindai/ambil foto ulang." });
      }
    } else {
      setError(result.error || "Gagal memindai struk.");
      toast({ variant: "destructive", title: "Pemindaian Gagal", description: result.error || "Tidak dapat memproses struk." });
    }
    setIsScanning(false);
  };

  const handleUpdateItem = async (updatedItem: SplitItem) => {
    setDetailedBillSummary(null);
    const result = await updateBillItemInDbAction(updatedItem.id, {
      name: updatedItem.name,
      unitPrice: updatedItem.unitPrice,
      quantity: updatedItem.quantity,
    });

    if (result.success && result.item) {
      setSplitItems((prevItems) =>
        prevItems.map((item) => (item.id === result.item!.id ? { ...item, ...result.item, assignedTo: updatedItem.assignedTo } : item))
      );
      toast({ title: "Item Diperbarui", description: `Item "${result.item.name}" berhasil diperbarui di database.` });
    } else {
      toast({ variant: "destructive", title: "Gagal Memperbarui Item", description: result.error || "Tidak dapat menyimpan perubahan item." });
    }
  };

  const handleAddItem = async () => {
    if (!currentBillId) {
      toast({ variant: "destructive", title: "Sesi Tagihan Tidak Aktif", description: "Harap mulai sesi tagihan baru terlebih dahulu." });
      return;
    }
    setDetailedBillSummary(null);
    const newItemData = { name: "Item Baru", unitPrice: 0, quantity: 1 };
    const result = await addBillItemToDbAction(currentBillId, newItemData);

    if (result.success && result.item) {
      const newSplitItem: SplitItem = {
        ...result.item,
        assignedTo: [],
      };
      setSplitItems(prevItems => [...prevItems, newSplitItem]);
      toast({ title: "Item Ditambahkan", description: `Item "${newSplitItem.name}" berhasil ditambahkan ke database.` });
    } else {
      toast({ variant: "destructive", title: "Gagal Menambah Item", description: result.error || "Tidak dapat menyimpan item baru." });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDetailedBillSummary(null); 
    const itemToDelete = splitItems.find(item => item.id === itemId);
    if (!itemToDelete) return;

    const result = await deleteBillItemFromDbAction(itemId);
    if (result.success) {
      setSplitItems(prevItems => prevItems.filter(item => item.id !== itemId));
      toast({ title: "Item Dihapus", description: `Item "${itemToDelete.name}" telah dihapus dari database.` });
    } else {
      toast({ variant: "destructive", title: "Gagal Menghapus Item", description: result.error || "Tidak dapat menghapus item dari database." });
    }
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
    
    const joinedPeople = people.filter(p => p.status !== 'invited');
    if (joinedPeople.length < 2) {
      toast({ variant: "destructive", title: "Partisipan Kurang", description: "Perlu minimal dua orang (yang sudah bergabung) untuk membagi tagihan." });
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
            detailedPersonalShares: people.map(p => ({
              personId: p.id,
              personName: p.name,
              items: [],
              taxShare: 0,
              tipShare: 0,
              subTotalFromItems: 0,
              totalShare: 0,
            })),
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
      // Fetch full bill details to populate the summary display accurately
      const detailedResult = await getBillDetailsAction(currentBillId);
      if (detailedResult.success && detailedResult.data) {
          setDetailedBillSummary(detailedResult.data.summaryData);
          toast({ title: "Tagihan Diringkas & Disimpan", description: "Ringkasan berhasil dihitung dan tagihan ini akan muncul di riwayat." });
          setCurrentStep(2);
      } else {
          setError(detailedResult.error || "Gagal mengambil detail ringkasan setelah perhitungan.");
          toast({ variant: "destructive", title: "Gagal Memuat Detail Ringkasan", description: detailedResult.error });
      }
    } else {
      setError(result.error || "Gagal meringkas tagihan.");
      toast({ variant: "destructive", title: "Ringkasan Gagal", description: result.error || "Tidak dapat menghitung ringkasan." });
    }
    setIsCalculating(false);
  };
  
  const availableFriendsToInvite = useMemo(() => {
    const participantProfileIds = new Set(people.map(p => p.profile_id).filter(Boolean));
    return friends.filter(friend => !participantProfileIds.has(friend.id));
  }, [friends, people]);

  if (isLoadingUser || isLoadingCategories || isLoadingFriends) {
    return (
      <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
        <LandingHeader />
        <main className="relative z-10 flex flex-col items-center justify-center text-center flex-grow p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-foreground">
                {isLoadingUser ? "Memuat data pengguna..." : isLoadingCategories ? "Memuat kategori..." : "Memuat teman..."}
            </p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <LandingHeader />
      <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
        {!authUser && !isLoadingUser && (
             <Card className="shadow-xl overflow-hidden bg-card/90 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                <CardHeader className="bg-card/60 border-b">
                    <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center">
                        <Power className="mr-3 h-6 w-6 text-primary"/> Selamat Datang di Patungan!
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
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={() => setIsInviteDialogOpen(true)} variant="default" className="w-full sm:w-auto">
                          <Users2 className="mr-2 h-4 w-4" /> Undang Teman
                        </Button>
                        <div className="flex-grow flex items-center gap-2">
                           <Input
                              type="text"
                              placeholder="Nama partisipan non-pengguna"
                              value={personNameInput}
                              onChange={(e) => setPersonNameInput(e.target.value)}
                              onKeyPress={(e) => { if (e.key === 'Enter') handleAddGuest(); }}
                              className="flex-grow"
                          />
                          <Button onClick={handleAddGuest} variant="outline" disabled={!personNameInput.trim()}>
                              <UserPlus className="mr-2 h-4 w-4" /> Tambah Tamu
                          </Button>
                        </div>
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
                                  {person.status === 'invited' && (
                                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                                      <Clock className="mr-1 h-3 w-3"/> Pending
                                    </Badge>
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
                            toast({ title: "Pratinjau Dihapus", description: "Anda dapat memindai atau mengunggah struk baru."});
                        }}
                    />
                </section>
                
                <Separator/>

                
                <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><Edit2 className="mr-2 h-5 w-5"/>Item Tagihan & Alokasi</h3>
                     <ItemEditor
                        items={splitItems}
                        people={people.filter(p => p.status !== 'invited')}
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
                        disabled={people.filter(p => p.status !== 'invited').length === 0}
                      >
                        <SelectTrigger id="payer" className="w-full">
                          <SelectValue placeholder={people.filter(p => p.status !== 'invited').length > 0 ? "Pilih pembayar" : "Tambah atau tunggu orang bergabung"} />
                        </SelectTrigger>
                        <SelectContent>
                          {people.filter(p => p.status !== 'invited').map(person => (
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
                    disabled={isCalculating || (itemsForSummary.length === 0 && billDetails.taxAmount === 0 && billDetails.tipAmount === 0) || !billDetails.payerId || people.filter(p => p.status !== 'invited').length < 2 || !currentBillId} 
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

       {/* Invite Friend Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Undang Teman</DialogTitle>
            <DialogDescription>
              Pilih teman dari daftar Anda untuk ditambahkan ke tagihan ini.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-4">
            <div className="py-2 px-4 space-y-2">
              {isLoadingFriends ? (
                <p className="text-muted-foreground text-center">Memuat daftar teman...</p>
              ) : availableFriendsToInvite.length > 0 ? (
                availableFriendsToInvite.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={friend.avatar_url || undefined} alt={friend.full_name || friend.username || "T"} data-ai-hint="friend avatar" />
                        <AvatarFallback>{(friend.full_name || friend.username || "T").substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{friend.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleInviteFriend(friend)}>
                      <UserPlus className="mr-2 h-4 w-4"/> Undang
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Semua teman Anda sudah ditambahkan.</p>
                  <p className="text-xs">Atau Anda bisa <Link href="/app/social" className="text-primary underline">menambah teman baru</Link>.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>


      <footer className="relative z-10 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}
    
    
