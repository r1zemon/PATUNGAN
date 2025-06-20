
"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy, ScannedItem, BillHistoryEntry, BillCategory, DashboardData, MonthlyExpenseByCategory, ExpenseChartDataPoint, RecentBillDisplayItem, ScheduledBillDisplayItem, DetailedBillSummaryData, Settlement } from "./types";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PostgrestSingleResponse, User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from '@/lib/database.types';
import { format, startOfMonth, endOfMonth, parseISO, isFuture } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';


type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];


export async function signupUserAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const username = formData.get('username') as string;
  const phoneNumber = formData.get('phone') as string;

  if (!email || !password || !fullName || !username) {
    return { success: false, error: "Email, password, nama lengkap, dan username wajib diisi." };
  }

  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return { success: false, error: "Username tidak boleh kosong." };
  }
  const trimmedFullName = fullName.trim();
   if (!trimmedFullName) {
    return { success: false, error: "Nama lengkap tidak boleh kosong." };
  }


  // Check for username uniqueness
  const { data: existingUserWithUsername, error: usernameCheckError } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', trimmedUsername)
    .single();

  if (usernameCheckError && usernameCheckError.code !== 'PGRST116') { // PGRST116 means no rows found, which is good
    console.error("Error checking username uniqueness:", usernameCheckError);
    return { success: false, error: "Gagal memverifikasi username. Silakan coba lagi." };
  }

  if (existingUserWithUsername) {
    return { success: false, error: "Username sudah digunakan. Silakan pilih username lain." };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: trimmedFullName,
        username: trimmedUsername,
      }
    }
  });

  if (authError) {
    console.error("Error signing up (auth):", authError);
    return { success: false, error: authError.message };
  }

  if (!authData || !authData.user) {
    console.error("Signup successful but no user data returned from authData.");
    return { success: false, error: "Gagal mendapatkan data pengguna setelah pendaftaran (auth)." };
  }

  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: trimmedFullName,
        username: trimmedUsername,
        email: email,
        phone_number: phoneNumber ? phoneNumber.trim() : null
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Attempt to delete the auth user if profile creation failed to prevent orphaned auth users
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authData.user.id);
      if (deleteUserError) {
          console.error("Error deleting auth user after profile creation failure:", deleteUserError);
           return { success: false, error: `Pengguna berhasil dibuat di auth, tetapi gagal membuat profil: ${profileError.message}. Gagal menghapus pengguna auth setelahnya: ${deleteUserError.message}` };
      }
      return { success: false, error: `Pengguna berhasil dibuat di auth, tetapi gagal membuat profil: ${profileError.message}. Pengguna auth telah dihapus.` };
    }
  } catch (e: any) {
      console.error("Exception during profile creation or auth user deletion:", e);
      // Attempt to delete the auth user if profile creation failed
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authData.user.id);
      if (deleteUserError) {
          console.error("Error deleting auth user after profile creation exception:", deleteUserError);
      }
      return { success: false, error: `Terjadi kesalahan server saat membuat profil: ${e.message}. Pengguna auth mungkin telah dihapus.` };
  }


  revalidatePath('/', 'layout');
  revalidatePath('/login', 'page');
  return { success: true, user: authData.user };
}

export async function loginUserAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: "Email dan password wajib diisi." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  return { success: true, user: data.user };
}


export async function getCurrentUserAction(): Promise<{ user: SupabaseUser | null; profile: any | null; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("Error getting user in getCurrentUserAction:", authError.message);
    return { user: null, profile: null, error: `Gagal memuat sesi pengguna: ${authError.message}` };
  }
  if (!user) {
    return { user: null, profile: null };
  }

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: No rows found
      console.error("Error fetching profile for user:", user.id, profileError.message);
      return { user: user, profile: null, error: `Gagal mengambil profil: ${profileError.message}` };
    }
    return { user: user, profile: profileData };
  } catch (e: any) {
    console.error("Exception fetching profile in getCurrentUserAction:", e);
    return { user: user, profile: null, error: `Terjadi kesalahan server saat mengambil profil: ${e.message}` };
  }
}


export async function logoutUserAction() {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  return { success: true };
}

export async function createBillCategoryAction(name: string): Promise<{ success: boolean; category?: BillCategory; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Pengguna tidak terautentikasi." };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Nama kategori tidak boleh kosong." };
    }
    if (trimmedName.length > 20) {
      return { success: false, error: "Nama kategori maksimal 20 karakter." };
    }

    const { data: existingCategory, error: selectError } = await supabase
      .from('bill_categories')
      .select('id, name, user_id, created_at')
      .eq('user_id', user.id)
      .ilike('name', trimmedName) 
      .single();

    if (selectError && selectError.code !== 'PGRST116') { 
      console.error("Error checking existing category:", selectError);
      return { success: false, error: `Gagal memeriksa kategori yang ada: ${selectError.message}` };
    }

    if (existingCategory) {
      return { success: true, category: existingCategory as BillCategory }; 
    }

    const { data: newCategoryData, error: insertError } = await supabase
      .from('bill_categories')
      .insert({ user_id: user.id, name: trimmedName })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating new category:", insertError);
      return { success: false, error: `Gagal membuat kategori baru: ${insertError.message}` };
    }

    if (!newCategoryData) {
        return { success: false, error: "Gagal membuat kategori baru atau data tidak kembali." };
    }
    
    const finalCategory: BillCategory = {
        id: newCategoryData.id,
        user_id: newCategoryData.user_id,
        name: newCategoryData.name,
        created_at: newCategoryData.created_at
    };
    revalidatePath('/app', 'page'); 
    revalidatePath('/', 'page'); // For dashboard updates
    return { success: true, category: finalCategory };

  } catch (e: any) {
    console.error("Exception in createBillCategoryAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat membuat kategori." };
  }
}

export async function getUserCategoriesAction(): Promise<{ success: boolean; categories?: BillCategory[]; error?: string }> {
 try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Pengguna tidak terautentikasi." };
    }
    
    const { data: categoriesData, error: fetchError } = await supabase
      .from('bill_categories')
      .select('id, name, user_id, created_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
      
    if (fetchError) {
      console.error("Error fetching user categories:", fetchError);
      return { success: false, error: `Gagal mengambil kategori: ${fetchError.message}` };
    }

    return { success: true, categories: categoriesData as BillCategory[] };

  } catch (e: any) {
    console.error("Exception in getUserCategoriesAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat mengambil kategori." };
  }
}


export async function createBillAction(
  billName: string,
  categoryId: string | null,
  scheduledAt?: string | null
): Promise<{ success: boolean; billId?: string; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } , error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("createBillAction - authError:", authError.message);
      return { success: false, error: `Gagal mendapatkan sesi pengguna (authError): ${authError.message}` };
    }

    if (!user) {
       console.warn("createBillAction: User object is null. Cannot create bill.");
       return { success: false, error: "Pengguna tidak terautentikasi. Tidak dapat membuat tagihan." };
    }

    const billInsertData: Database['public']['Tables']['bills']['Insert'] = {
      name: billName || "Tagihan Baru",
      user_id: user.id,
      category_id: categoryId, 
      scheduled_at: scheduledAt || null,
    };

    const { data: billData, error: billInsertError } = await supabase
      .from('bills')
      .insert([billInsertData])
      .select('id')
      .single();

    if (billInsertError) {
      console.error("Error creating bill:", billInsertError);
      return { success: false, error: `Gagal membuat tagihan di database: ${billInsertError.message}` };
    }
    if (!billData || !billData.id) {
      return { success: false, error: "Gagal membuat tagihan atau mengambil ID tagihan setelah insert." };
    }
     if (scheduledAt) { 
      revalidatePath('/', 'page'); 
      revalidatePath('/app/history', 'page');
    }
    return { success: true, billId: billData.id };
  } catch (e: any) {
    console.error("Exception in createBillAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat membuat tagihan." };
  }
}

export async function addParticipantAction(billId: string, personName: string): Promise<{ success: boolean; person?: Person; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId || !personName.trim()) {
    return { success: false, error: "Bill ID and person name are required." };
  }
  try {
    const { data, error } = await supabase
      .from('bill_participants')
      .insert([{ bill_id: billId, name: personName.trim() }])
      .select('id, name')
      .single();

    if (error) {
      console.error("Error adding participant:", error);
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: "Failed to add participant or retrieve data." };
    }
    return { success: true, person: { id: data.id, name: data.name } };
  } catch (e: any) {
    console.error("Exception in addParticipantAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat menambahkan partisipan." };
  }
}

export async function removeParticipantAction(participantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!participantId) {
    return { success: false, error: "Participant ID is required." };
  }
  try {
    const { error } = await supabase
      .from('bill_participants')
      .delete()
      .eq('id', participantId);

    if (error) {
      console.error("Error removing participant:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error("Exception in removeParticipantAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat menghapus partisipan." };
  }
}


export async function handleScanReceiptAction(
  billId: string, // Added billId parameter
  receiptDataUri: string
): Promise<{ success: boolean; data?: { items: ScannedItem[] }; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId) {
    return { success: false, error: "Bill ID tidak disediakan untuk menyimpan item struk." };
  }
  if (!receiptDataUri) {
    return { success: false, error: "Tidak ada data gambar struk." };
  }
  if (!receiptDataUri.startsWith("data:image/")) {
    return { success: false, error: "Format data gambar tidak valid." };
  }
  
  console.log("handleScanReceiptAction (server): Received data URI for bill", billId);

  try {
    const aiResult: ScanReceiptOutput = await scanReceipt({ receiptDataUri });

    if (aiResult && aiResult.items !== undefined) {
      const itemsToInsert = aiResult.items.map((item: AiReceiptItem) => ({
        bill_id: billId,
        name: item.name || "Item Tidak Dikenal",
        unit_price: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        quantity: (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1,
      }));

      if (itemsToInsert.length === 0) {
        return { success: true, data: { items: [] } }; // No items found by AI, but operation is successful.
      }

      const { data: insertedDbItems, error: insertError } = await supabase
        .from('bill_items')
        .insert(itemsToInsert)
        .select('id, name, unit_price, quantity');

      if (insertError) {
        console.error("handleScanReceiptAction (server): Error inserting scanned items to DB:", insertError);
        return { success: false, error: `Gagal menyimpan item struk ke database: ${insertError.message}` };
      }
      
      if (!insertedDbItems) {
        console.error("handleScanReceiptAction (server): No data returned after inserting scanned items.");
        return { success: false, error: "Gagal mendapatkan data item setelah disimpan ke database." };
      }

      const appItems: ScannedItem[] = insertedDbItems.map(dbItem => ({
        id: dbItem.id, // This is now the database ID
        name: dbItem.name,
        unitPrice: dbItem.unit_price,
        quantity: dbItem.quantity,
      }));
      
      console.log(`handleScanReceiptAction (server): Scan successful, ${appItems.length} items mapped and saved to DB.`);
      return { success: true, data: { items: appItems } };
    } else {
      console.error("handleScanReceiptAction (server): scanReceipt returned an unexpected structure:", aiResult);
      return { success: false, error: "Menerima data tak terduga dari pemindai. Silakan coba lagi." };
    }
  } catch (error) {
    console.error("handleScanReceiptAction (server): Critical error during scanReceipt call or DB operation:", error);
    let errorMessage = "Gagal memindai struk karena kesalahan server tak terduga. Silakan coba lagi.";
    if (error instanceof Error) {
        errorMessage = `Pemindaian gagal: ${error.message}`;
        if (error.cause) {
          try {
            const causeString = String(error.cause);
            errorMessage += ` (Penyebab: ${causeString.substring(0, 200)}${causeString.length > 200 ? '...' : ''})`;
          } catch (e) {
              errorMessage += ` (Penyebab: Tidak dapat di-string-kan)`;
          }
        }
    }
    return { success: false, error: errorMessage };
  }
}

export async function handleSummarizeBillAction(
  splitItems: SplitItem[],
  people: Person[],
  billId: string,
  payerParticipantId: string,
  taxAmount: number,
  tipAmount: number,
  taxTipSplitStrategy: TaxTipSplitStrategy
): Promise<{ success: boolean; data?: RawBillSummary; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId) {
    return { success: false, error: "Bill ID tidak disediakan." };
  }
  if (!payerParticipantId) {
    return { success: false, error: "ID Pembayar tidak disediakan." };
  }
   if (people.length < 2) {
    return { success: false, error: "Minimal dua orang diperlukan untuk membagi tagihan." };
  }
  if (splitItems.length === 0 && taxAmount === 0 && tipAmount === 0) {
    const zeroSummary: RawBillSummary = {};
    people.forEach(p => zeroSummary[p.name] = 0);

    for (const person of people) {
        const { error: updateError } = await supabase.from('bill_participants').update({ total_share_amount: 0 }).eq('id', person.id);
        if (updateError) console.warn(`Error setting share to 0 for ${person.name}: ${updateError.message}`);
    }

    await supabase.from('bills').update({
        grand_total: 0,
        tax_amount:0,
        tip_amount:0,
        payer_participant_id: payerParticipantId,
        tax_tip_split_strategy: taxTipSplitStrategy
    }).eq('id', billId);
    revalidatePath('/', 'page'); 
    revalidatePath('/app/history', 'page');
    return { success: true, data: zeroSummary };
  }

  const payer = people.find(p => p.id === payerParticipantId);
  if (!payer) {
    return { success: false, error: "Data pembayar tidak valid atau tidak ditemukan dalam daftar partisipan." };
  }
  const payerName = payer.name;

  const itemsForAI: SummarizeBillInput["items"] = splitItems.map(item => ({
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    assignedTo: item.assignedTo.map(assignment => {
      const participant = people.find(p => p.id === assignment.personId);
      return {
        personName: participant?.name || "Unknown Person",
        count: assignment.count,
      };
    }).filter(a => a.personName !== "Unknown Person" && a.count > 0),
  })).filter(item => item.quantity > 0 && item.unitPrice >= 0);

  const peopleNamesForAI: SummarizeBillInput["people"] = people.map(p => p.name);

  const summarizeBillInput: SummarizeBillInput = {
    items: itemsForAI,
    people: peopleNamesForAI,
    payerName: payerName,
    taxAmount: taxAmount,
    tipAmount: tipAmount,
    taxTipSplitStrategy: taxTipSplitStrategy,
  };

  try {
    const rawSummary: RawBillSummary = await summarizeBill(summarizeBillInput);

    let calculatedGrandTotal = 0;
    const participantSharePromises = people.map(async (person) => {
      const share = rawSummary[person.name];
      if (typeof share === 'number') {
        calculatedGrandTotal += share;
        const { error: updateError } = await supabase.from('bill_participants').update({ total_share_amount: share }).eq('id', person.id);
        if (updateError) return { personId: person.id, error: updateError, success: false as const };
      } else if (rawSummary[person.name] === undefined) {
        const { error: updateError } = await supabase.from('bill_participants').update({ total_share_amount: 0 }).eq('id', person.id);
        if (updateError) return { personId: person.id, error: updateError, success: false as const };
      }
      return { personId: person.id, error: null, success: true as const };
    });

    const participantUpdateResults = await Promise.all(participantSharePromises);
    for (const result of participantUpdateResults) {
      if (!result.success && result.error) {
        const personNameFound = people.find(p=>p.id === result.personId)?.name || result.personId;
        console.error(`Error updating participant share for ${personNameFound} in DB:`, result.error.message);
        return { success: false, error: `Gagal memperbarui bagian untuk partisipan ${personNameFound} di database: ${result.error.message}` };
      }
    }

    const { error: billUpdateError } = await supabase
        .from('bills')
        .update({
        payer_participant_id: payerParticipantId,
        tax_amount: taxAmount,
        tip_amount: tipAmount,
        tax_tip_split_strategy: taxTipSplitStrategy,
        grand_total: calculatedGrandTotal
        })
        .eq('id', billId);

    if (billUpdateError) {
        console.error("Error updating bill details in DB:", billUpdateError);
        return { success: false, error: `Gagal memperbarui detail tagihan (grand_total, etc.) di database: ${billUpdateError.message}` };
    }

    const { error: deleteSettlementsError } = await supabase.from('settlements').delete().eq('bill_id', billId);
    if (deleteSettlementsError) {
        console.error("Error deleting old settlements from DB:", deleteSettlementsError);
        return { success: false, error: `Gagal menghapus penyelesaian lama dari database: ${deleteSettlementsError.message}` };
    }

    const settlementPromises: Promise<PostgrestSingleResponse<any>>[] = [];
    for (const person of people) {
      const share = rawSummary[person.name];
      if (person.id !== payerParticipantId && typeof share === 'number' && share > 0) {
        const settlementData: SettlementInsert = {
          bill_id: billId,
          from_participant_id: person.id,
          to_participant_id: payerParticipantId,
          amount: share
        };
        settlementPromises.push(
          supabase.from('settlements').insert(settlementData).select().single()
        );
      }
    }
    if (settlementPromises.length > 0) {
        const settlementInsertResults = await Promise.all(settlementPromises);
        for (const result of settlementInsertResults) {
          if (result.error) {
            console.error("Error inserting settlement to DB:", result.error);
            return { success: false, error: `Gagal menyimpan penyelesaian ke database: ${result.error.message}` };
          }
        }
    }

    revalidatePath('/', 'page');
    revalidatePath('/app/history', 'page');
    return { success: true, data: rawSummary };
  } catch (error) {
    console.error("Error summarizing bill with AI or saving summary:", error);
    let errorMessage = "Gagal meringkas tagihan. Silakan coba lagi.";
     if (error instanceof Error) {
        errorMessage = `Ringkasan tagihan gagal: ${error.message}`;
         if (error.cause) {
            try {
                if (typeof error.cause === 'object' && error.cause !== null && 'message' in error.cause) {
                     errorMessage += ` (Penyebab: ${(error.cause as Error).message})`;
                } else {
                    errorMessage += ` (Penyebab: ${String(error.cause)})`;
                }
            } catch (e) {
                errorMessage += ` (Penyebab: ${String(error.cause)})`;
            }
        }
    }
    return { success: false, error: errorMessage };
  }
}

export async function updateUserProfileAction(
  userId: string,
  profileUpdates: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    phone_number?: string | null;
  },
  avatarFile?: File | null
): Promise<{ success: boolean; data?: any; error?: string | string[] }> {
  const supabase = createSupabaseServerClient();
  if (!userId) return { success: false, error: "User ID is required." };

  try {
    const errorMessages: string[] = [];

    const { data: currentProfileData, error: fetchError } = await supabase
      .from('profiles')
      .select('avatar_url, full_name, username, phone_number')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error fetching current profile:", fetchError);
      return { success: false, error: `Gagal mengambil profil saat ini: ${fetchError.message}` };
    }
    if (!currentProfileData && fetchError?.code === 'PGRST116') {
        console.error("Profile not found for user ID:", userId);
        return { success: false, error: "Profil pengguna tidak ditemukan." };
    }
    if (!currentProfileData) {
        console.error("Profile data is unexpectedly null for user ID:", userId);
        return { success: false, error: "Data profil pengguna tidak valid." };
    }

    const updatesForDB: Partial<Database['public']['Tables']['profiles']['Update']> = {};
    let hasProfileDetailChanges = false;

    if (profileUpdates.username !== undefined) {
        const newUsernameTrimmed = profileUpdates.username === null ? "" : profileUpdates.username.trim();
        const currentUsername = currentProfileData.username || "";
        if (newUsernameTrimmed !== currentUsername) {
            if (!newUsernameTrimmed) {
                 errorMessages.push("Username tidak boleh kosong.");
            } else {
                const { data: existingUser, error: usernameCheckErr } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', newUsernameTrimmed)
                    .neq('id', userId)
                    .single();

                if (usernameCheckErr && usernameCheckErr.code !== 'PGRST116') {
                    console.error("Error checking new username uniqueness:", usernameCheckErr);
                    errorMessages.push("Gagal memverifikasi username baru. Silakan coba lagi.");
                } else if (existingUser) {
                    errorMessages.push("Username tersebut sudah digunakan oleh pengguna lain.");
                } else {
                    updatesForDB.username = newUsernameTrimmed;
                    hasProfileDetailChanges = true;
                }
            }
        }
    }

    if (profileUpdates.full_name !== undefined) {
        const newFullNameTrimmed = profileUpdates.full_name === null ? "" : profileUpdates.full_name.trim();
        const currentFullName = currentProfileData.full_name || "";
        if (newFullNameTrimmed !== currentFullName) {
             if (!newFullNameTrimmed) {
                errorMessages.push("Nama lengkap tidak boleh kosong.");
            } else {
                updatesForDB.full_name = newFullNameTrimmed;
                hasProfileDetailChanges = true;
            }
        }
    }

    if (profileUpdates.phone_number !== undefined) {
        const newPhoneNumber = profileUpdates.phone_number === null ? null : profileUpdates.phone_number.trim();
        const currentPhoneNumber = currentProfileData.phone_number || null;
        if (newPhoneNumber !== currentPhoneNumber) {
            updatesForDB.phone_number = newPhoneNumber === "" ? null : newPhoneNumber;
            hasProfileDetailChanges = true;
        }
    }

    let avatarUrlToUpdate: string | null | undefined = undefined;

    if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `public/avatars/${userId}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
            console.error("Error uploading avatar:", uploadError);
            errorMessages.push(`Gagal mengunggah avatar: ${uploadError.message}`);
        } else {
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            if (publicUrlData && publicUrlData.publicUrl) {
                avatarUrlToUpdate = publicUrlData.publicUrl;
            } else {
                errorMessages.push('Gagal mendapatkan URL publik avatar setelah unggah.');
            }
        }
    } else if (profileUpdates.avatar_url === null && currentProfileData.avatar_url !== null) {
        avatarUrlToUpdate = null;
    }

    if (avatarUrlToUpdate !== undefined) {
        updatesForDB.avatar_url = avatarUrlToUpdate;
    }

    const hasAvatarDBChange = updatesForDB.avatar_url !== undefined;

    if (errorMessages.length > 0) {
        return { success: false, data: currentProfileData, error: errorMessages };
    }

    if (!hasProfileDetailChanges && !hasAvatarDBChange) {
      return { success: true, data: currentProfileData, error: "Tidak ada perubahan untuk disimpan." };
    }

    if (Object.keys(updatesForDB).length > 0) {
      const { data: updatedProfile, error: dbUpdateError } = await supabase
        .from('profiles')
        .update(updatesForDB)
        .eq('id', userId)
        .select()
        .single();

      if (dbUpdateError) {
        console.error("Error updating profile in DB:", dbUpdateError);
        return { success: false, data: currentProfileData, error: [`Gagal memperbarui profil di database: ${dbUpdateError.message}`] };
      }

      revalidatePath('/app', 'layout');
      revalidatePath('/app/profile', 'page');
      revalidatePath('/app/history', 'page');
      revalidatePath('/', 'layout');
      revalidatePath('/', 'page');

      return { success: true, data: updatedProfile };
    }

    return { success: true, data: currentProfileData, error: "Operasi selesai, kemungkinan tidak ada perubahan data." };

  } catch (e: any) {
    console.error("Unhandled exception in updateUserProfileAction:", e);
    return { success: false, error: `Kesalahan server tidak terduga: ${e.message || "Unknown error"}` };
  }
}

export async function removeAvatarAction(userId: string): Promise<{ success: boolean; data?: { avatar_url: null }; error?: string }> {
    const supabase = createSupabaseServerClient();
    if (!userId) {
        return { success: false, error: "User ID diperlukan." };
    }
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || user.id !== userId) {
            return { success: false, error: "Tidak terautentikasi atau tidak diizinkan." };
        }

        const { data: currentProfile, error: fetchProfileError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .single();

        if (fetchProfileError) {
            console.error("Error fetching profile for avatar removal:", fetchProfileError);
            return { success: false, error: `Gagal mengambil profil: ${fetchProfileError.message}` };
        }

        if (!currentProfile?.avatar_url) {
            return { success: true, data: { avatar_url: null }, error: "Tidak ada foto profil untuk dihapus." };
        }

        const storagePathPrefix = `/storage/v1/object/public/avatars/`;
        let filePathInBucket = "";

        if (currentProfile.avatar_url.includes(storagePathPrefix)) {
            filePathInBucket = currentProfile.avatar_url.split(storagePathPrefix)[1];
        } else {
            console.warn("Could not parse avatar_url to get storage path with standard prefix:", currentProfile.avatar_url);
            const { error: dbOnlyError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', userId);
            if (dbOnlyError) {
                return { success: false, error: `Format URL avatar tidak dikenali dan gagal menghapus dari database: ${dbOnlyError.message}` };
            }
            revalidatePath('/app/profile', 'page');
            revalidatePath('/', 'layout');
            revalidatePath('/', 'page');
            return { success: true, data: { avatar_url: null } };
        }

        if (!filePathInBucket) {
             console.warn("filePathInBucket is empty after parsing, attempting to clear DB link only for URL:", currentProfile.avatar_url);
            const { error: dbOnlyError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', userId);
            if (dbOnlyError) {
                return { success: false, error: `Path file avatar kosong setelah parsing dan gagal menghapus dari database: ${dbOnlyError.message}` };
            }
            revalidatePath('/app/profile', 'page');
            revalidatePath('/', 'layout');
            revalidatePath('/', 'page');
            return { success: true, data: { avatar_url: null } };
        }


        const { error: storageError } = await supabase.storage
            .from('avatars')
            .remove([filePathInBucket]);

        if (storageError) {
            if (storageError.message.toLowerCase().includes('not found')) {
                console.warn(`Avatar file not found in storage at path ${filePathInBucket}, but proceeding to clear DB link.`);
            } else {
                console.error("Error deleting avatar from storage:", storageError);
                return { success: false, error: `Gagal menghapus file avatar dari storage: ${storageError.message}` };
            }
        }

        const { success: updateSuccess, error: dbUpdateError, data: updatedData } = await updateUserProfileAction(
            userId,
            { avatar_url: null },
            null
        );


        if (!updateSuccess) {
            console.error("Error clearing avatar_url in DB via updateUserProfileAction:", dbUpdateError);
            return { success: false, error: `Gagal mengosongkan URL avatar di database: ${Array.isArray(dbUpdateError) ? dbUpdateError.join(", ") : dbUpdateError}` };
        }

        revalidatePath('/app/profile', 'page');
        revalidatePath('/', 'layout');
        revalidatePath('/', 'page');
        revalidatePath('/app', 'layout');
        revalidatePath('/app/history', 'page');

        return { success: true, data: { avatar_url: null } };
    } catch (e: any) {
        console.error("Unhandled exception in removeAvatarAction:", e);
        return { success: false, error: `Kesalahan server tidak terduga saat menghapus avatar: ${e.message || "Unknown error"}` };
    }
}


export async function getBillsHistoryAction(): Promise<{ success: boolean; data?: BillHistoryEntry[]; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Pengguna tidak terautentikasi atau sesi tidak valid." };
  }

  try {
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        id, 
        name, 
        created_at, 
        grand_total, 
        payer_participant_id, 
        scheduled_at,
        category_id,
        bill_categories ( name )
      `)
      .eq('user_id', user.id)
      .or('grand_total.not.is.null,scheduled_at.not.is.null') 
      .order('created_at', { ascending: false });

    if (billsError) {
      console.error("Error fetching bills history:", billsError);
      return { success: false, error: `Gagal mengambil riwayat tagihan: ${billsError.message}` };
    }

    if (!bills) {
      return { success: true, data: [] };
    }

    const historyEntries: BillHistoryEntry[] = [];

    for (const bill of bills) {
      let payerName: string | null = null;
      if (bill.payer_participant_id) {
        const { data: payerData, error: payerError } = await supabase
          .from('bill_participants')
          .select('name')
          .eq('id', bill.payer_participant_id)
          .single();
        if (payerError) {
          console.warn(`Could not fetch payer name for bill ${bill.id}: ${payerError.message}`);
        } else {
          payerName = payerData?.name || null;
        }
      }

      const { count: participantCount, error: countError } = await supabase
        .from('bill_participants')
        .select('*', { count: 'exact', head: true })
        .eq('bill_id', bill.id);

      if (countError) {
        console.warn(`Could not fetch participant count for bill ${bill.id}: ${countError.message}`);
      }
      
      const categoryName = (bill.bill_categories as any)?.name || null;

      historyEntries.push({
        id: bill.id,
        name: bill.name,
        createdAt: bill.created_at || new Date().toISOString(), 
        grandTotal: bill.grand_total,
        payerName: payerName,
        participantCount: participantCount || 0,
        scheduled_at: bill.scheduled_at,
        categoryName: categoryName,
      });
    }

    return { success: true, data: historyEntries };
  } catch (e:any) {
    console.error("Exception in getBillsHistoryAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat mengambil riwayat tagihan." };
  }
}

// ===== DASHBOARD ACTIONS =====

const CATEGORY_ICON_KEYS: { [key: string]: string } = {
  "Makanan": "Utensils",
  "Transportasi": "Car",
  "Hiburan": "Gamepad2",
  "Penginapan": "BedDouble",
  "Belanja Online": "ShoppingBag", 
  "Lainnya": "Shapes", 
};

const PREDEFINED_CATEGORY_COLORS: { [key: string]: string } = {
  "Makanan": "hsl(var(--chart-1))",
  "Transportasi": "hsl(var(--chart-2))",
  "Hiburan": "hsl(var(--chart-3))",
  "Penginapan": "hsl(var(--chart-4))",
  "Belanja Online": "hsl(var(--chart-5))",
  "Lainnya": "hsl(var(--chart-5))", 
};

const DEFAULT_CATEGORY_ORDER = ["Makanan", "Transportasi", "Hiburan", "Penginapan"];
const OTHERS_CATEGORY_NAME = "Lainnya";


export async function getDashboardDataAction(): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const { data: userCategories, error: categoriesError } = await supabase
      .from('bill_categories')
      .select('id, name')
      .eq('user_id', user.id);

    if (categoriesError) {
      console.error("Error fetching user categories for dashboard:", categoriesError);
      return { success: false, error: `Gagal mengambil kategori pengguna: ${categoriesError.message}` };
    }

    const now = new Date();
    const startDate = format(startOfMonth(now), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const endDate = format(endOfMonth(now), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    const { data: monthlyBillData, error: billsError } = await supabase
      .from('bills')
      .select('category_id, grand_total')
      .eq('user_id', user.id)
      .not('grand_total', 'is', null)
      .not('payer_participant_id', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (billsError) {
      console.error("Error fetching monthly bills for dashboard:", billsError);
      return { success: false, error: `Gagal mengambil data tagihan bulanan: ${billsError.message}` };
    }

    const spendingPerCategory: Record<string, number> = {};
    if (monthlyBillData) {
      for (const bill of monthlyBillData) {
        if (bill.category_id && bill.grand_total !== null) {
          spendingPerCategory[bill.category_id] = (spendingPerCategory[bill.category_id] || 0) + bill.grand_total;
        }
      }
    }
    
    let allMonthlyExpensesRaw: MonthlyExpenseByCategory[] = (userCategories || []).map(category => {
      const totalAmount = spendingPerCategory[category.id] || 0;
      return {
        categoryName: category.name,
        totalAmount: totalAmount,
        icon: CATEGORY_ICON_KEYS[category.name] || CATEGORY_ICON_KEYS[OTHERS_CATEGORY_NAME] || "Shapes",
        color: PREDEFINED_CATEGORY_COLORS[category.name] || PREDEFINED_CATEGORY_COLORS[OTHERS_CATEGORY_NAME] || "hsl(var(--chart-1))",
      };
    });

    const predefinedExpenses: MonthlyExpenseByCategory[] = [];
    const customExpenses: MonthlyExpenseByCategory[] = [];
    let othersExpense: MonthlyExpenseByCategory | null = null;

    allMonthlyExpensesRaw.forEach(expense => {
      if (expense.categoryName === OTHERS_CATEGORY_NAME) {
        othersExpense = expense;
      } else if (DEFAULT_CATEGORY_ORDER.includes(expense.categoryName)) {
        predefinedExpenses.push(expense);
      } else {
        customExpenses.push(expense);
      }
    });

    predefinedExpenses.sort((a, b) => DEFAULT_CATEGORY_ORDER.indexOf(a.categoryName) - DEFAULT_CATEGORY_ORDER.indexOf(b.categoryName));
    customExpenses.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    let monthlyExpenses: MonthlyExpenseByCategory[] = [...predefinedExpenses, ...customExpenses];
    if (othersExpense) {
      monthlyExpenses.push(othersExpense);
    } else {
      const lainnyaCatExistsForUser = (userCategories || []).some(cat => cat.name === OTHERS_CATEGORY_NAME);
      if (!lainnyaCatExistsForUser) {
         monthlyExpenses.push({
            categoryName: OTHERS_CATEGORY_NAME,
            totalAmount: 0,
            icon: CATEGORY_ICON_KEYS[OTHERS_CATEGORY_NAME] || "Shapes",
            color: PREDEFINED_CATEGORY_COLORS[OTHERS_CATEGORY_NAME] || "hsl(var(--chart-1))",
         });
      }
    }
    
    const expenseChartData: ExpenseChartDataPoint[] = monthlyExpenses
      .filter(e => e.totalAmount > 0)
      .map(e => ({ name: e.categoryName, total: e.totalAmount }));

    // Fetch Recent Bills (Completed)
    const { data: dbRecentBills, error: recentBillsError } = await supabase
        .from('bills')
        .select(`
            id, 
            name, 
            created_at, 
            grand_total,
            bill_categories ( name )
        `)
        .eq('user_id', user.id)
        .not('grand_total', 'is', null)
        .not('payer_participant_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);

    if (recentBillsError) {
        console.error("Error fetching recent bills for dashboard:", recentBillsError);
        return { success: false, error: `Gagal mengambil tagihan terbaru: ${recentBillsError.message}` };
    }

    const recentBills: RecentBillDisplayItem[] = [];
    if (dbRecentBills) {
        for (const bill of dbRecentBills) {
            const { count: participantCount, error: countError } = await supabase
                .from('bill_participants')
                .select('*', { count: 'exact', head: true })
                .eq('bill_id', bill.id);

            recentBills.push({
                id: bill.id,
                name: bill.name,
                createdAt: bill.created_at || new Date().toISOString(),
                grandTotal: bill.grand_total || 0,
                categoryName: (bill.bill_categories as any)?.name || null,
                participantCount: countError ? 0 : participantCount || 0,
            });
        }
    }

    // Fetch Scheduled Bills
    const { data: dbScheduledBills, error: scheduledBillsError } = await supabase
        .from('bills')
        .select(`
            id, 
            name, 
            scheduled_at,
            bill_categories ( name )
        `)
        .eq('user_id', user.id)
        .is('grand_total', null) 
        .not('scheduled_at', 'is', null)
        .gt('scheduled_at', new Date().toISOString()) 
        .order('scheduled_at', { ascending: true })
        .limit(3);

    if (scheduledBillsError) {
        console.error("Error fetching scheduled bills for dashboard:", scheduledBillsError);
        return { success: false, error: `Gagal mengambil tagihan terjadwal: ${scheduledBillsError.message}` };
    }
    
    const scheduledBills: ScheduledBillDisplayItem[] = [];
    if (dbScheduledBills) {
        for (const bill of dbScheduledBills) {
             const { count: participantCount, error: countError } = await supabase
                .from('bill_participants')
                .select('*', { count: 'exact', head: true })
                .eq('bill_id', bill.id);

            scheduledBills.push({
                id: bill.id,
                name: bill.name,
                scheduled_at: bill.scheduled_at || new Date().toISOString(), // Should always have a value based on query
                categoryName: (bill.bill_categories as any)?.name || null,
                participantCount: countError ? 0 : participantCount || 0,
            });
        }
    }
    
    revalidatePath('/', 'page'); 

    return {
      success: true,
      data: {
        monthlyExpenses,
        expenseChartData,
        recentBills,
        scheduledBills,
      },
    };

  } catch (e: any) {
    console.error("Exception in getDashboardDataAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat mengambil data dashboard." };
  }
}

export interface BillDetailsForHistory {
  billName: string | null;
  createdAt: string;
  summaryData: DetailedBillSummaryData;
  participants: Person[];
}

export async function getBillDetailsAction(billId: string): Promise<{ success: boolean; data?: BillDetailsForHistory; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, name, created_at, grand_total, tax_amount, tip_amount, payer_participant_id, tax_tip_split_strategy')
      .eq('id', billId)
      .eq('user_id', user.id)
      .single();

    if (billError) {
      console.error("Error fetching bill details:", billError);
      return { success: false, error: `Gagal mengambil detail tagihan: ${billError.message}` };
    }
    if (!bill) {
      return { success: false, error: "Tagihan tidak ditemukan atau Anda tidak memiliki akses." };
    }
    
    // Handle case where bill is scheduled but not yet filled (grand_total is null)
    if (bill.grand_total === null && bill.scheduled_at && isFuture(parseISO(bill.scheduled_at))) {
        const emptySummary: DetailedBillSummaryData = {
            payerName: "Belum Ditentukan",
            taxAmount: 0,
            tipAmount: 0,
            personalTotalShares: {},
            settlements: [],
            grandTotal: 0,
        };
         return { 
            success: true, 
            data: { 
                billName: bill.name, 
                createdAt: bill.created_at || new Date().toISOString(), 
                summaryData: emptySummary,
                participants: [] 
            } 
        };
    }


    const { data: participantsData, error: participantsError } = await supabase
      .from('bill_participants')
      .select('id, name, total_share_amount')
      .eq('bill_id', billId);

    if (participantsError) {
      console.error("Error fetching participants for bill:", participantsError);
      return { success: false, error: `Gagal mengambil partisipan: ${participantsError.message}` };
    }
    const participants: Person[] = participantsData?.map(p => ({ id: p.id, name: p.name })) || [];

    let payerName = "Tidak Diketahui";
    if (bill.payer_participant_id) {
      const payer = participantsData?.find(p => p.id === bill.payer_participant_id);
      if (payer) {
        payerName = payer.name;
      } else {
         const { data: specificPayerData, error: specificPayerError } = await supabase
          .from('bill_participants')
          .select('name')
          .eq('id', bill.payer_participant_id)
          .single();
        if (!specificPayerError && specificPayerData) payerName = specificPayerData.name;
      }
    }

    const personalTotalShares: RawBillSummary = {};
    (participantsData || []).forEach(p => {
      personalTotalShares[p.name] = p.total_share_amount ?? 0;
    });

    const { data: settlementsData, error: settlementsError } = await supabase
      .from('settlements')
      .select(`
        amount,
        from_participant:bill_participants!settlements_from_participant_id_fkey ( name ),
        to_participant:bill_participants!settlements_to_participant_id_fkey ( name )
      `)
      .eq('bill_id', billId);

    if (settlementsError) {
      console.error("Error fetching settlements for bill:", settlementsError);
      return { success: false, error: `Gagal mengambil penyelesaian: ${settlementsError.message}` };
    }

    const settlements: Settlement[] = (settlementsData || []).map(s => ({
      from: (s.from_participant as any)?.name || "Tidak Diketahui",
      to: (s.to_participant as any)?.name || "Tidak Diketahui",
      amount: s.amount,
    }));

    const summaryData: DetailedBillSummaryData = {
      payerName: payerName,
      taxAmount: bill.tax_amount || 0,
      tipAmount: bill.tip_amount || 0,
      personalTotalShares: personalTotalShares,
      settlements: settlements,
      grandTotal: bill.grand_total || 0,
    };

    return { 
      success: true, 
      data: { 
        billName: bill.name, 
        createdAt: bill.created_at || new Date().toISOString(), 
        summaryData, 
        participants 
      } 
    };

  } catch (e: any) {
    console.error("Exception in getBillDetailsAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat mengambil detail tagihan." };
  }
}
    
    
