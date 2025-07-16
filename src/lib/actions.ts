
"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy, ScannedItem, BillHistoryEntry, BillCategory, DashboardData, MonthlyExpenseByCategory, ExpenseChartDataPoint, RecentBillDisplayItem, ScheduledBillDisplayItem, FetchedBillDetails, Settlement, FetchedBillDetailsWithItems, PersonalShareDetail, SettlementStatus, PersonalItemDetail, AdminDashboardData, RevenueData, SpendingAnalysisData } from "./types";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PostgrestSingleResponse, User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from '@/lib/database.types';
import { format, startOfMonth, endOfMonth, parseISO, isFuture, subMonths, subDays } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import { formatCurrency } from "./utils";


type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];
type ItemAssignmentInsert = Database['public']['Tables']['item_assignments']['Insert'];


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
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedFullName = fullName.trim();
  
  if (!trimmedUsername) {
    return { success: false, error: "Username tidak boleh kosong." };
  }
  if (!trimmedFullName) {
    return { success: false, error: "Nama lengkap tidak boleh kosong." };
  }

  // Check for email uniqueness in the profiles table first
  const { data: existingUserWithEmail, error: emailCheckError } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', trimmedEmail)
    .single();
  
  if (emailCheckError && emailCheckError.code !== 'PGRST116') {
      console.error("Error checking email uniqueness:", emailCheckError);
      return { success: false, error: "Gagal memverifikasi email. Silakan coba lagi." };
  }
  if (existingUserWithEmail) {
      return { success: false, error: "Email sudah terdaftar. Silakan gunakan email lain atau masuk." };
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

  // Now, attempt to sign up the user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: trimmedEmail,
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
    if (authError.message.includes("User already registered")) {
        return { success: false, error: "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain." };
    }
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
        email: trimmedEmail,
        phone_number: phoneNumber ? phoneNumber.trim() : null
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Attempt to delete the auth user if profile creation failed to prevent orphaned auth users
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authData.user.id);
      if (deleteUserError) {
          console.error("Error deleting auth user after profile creation failure:", deleteUserError);
           return { success: false, error: "Pengguna berhasil dibuat di auth, tetapi gagal membuat profil: " + profileError.message + ". Gagal menghapus pengguna auth setelahnya: " + deleteUserError.message };
      }
      return { success: false, error: "Pengguna berhasil dibuat di auth, tetapi gagal membuat profil: " + profileError.message + ". Pengguna auth telah dihapus." };
    }
  } catch (e: any) {
      console.error("Exception during profile creation or auth user deletion:", e);
      // Attempt to delete the auth user if profile creation failed
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authData.user.id);
      if (deleteUserError) {
          console.error("Error deleting auth user after profile creation exception:", deleteUserError);
      }
      return { success: false, error: "Terjadi kesalahan server saat membuat profil: " + e.message + ". Pengguna auth mungkin telah dihapus." };
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

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    return { success: false, error: loginError.message };
  }

  if (!loginData.user) {
    return { success: false, error: "Gagal mendapatkan data pengguna setelah login." };
  }

  // Fetch the user's profile to get their role
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', loginData.user.id)
    .single();
  
  if (profileError) {
    // Log out the user if their profile can't be fetched, to be safe
    await supabase.auth.signOut();
    return { success: false, error: "Login berhasil, tetapi gagal mengambil profil pengguna." };
  }

  const role = profileData.role;

  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  if (role === 'admin') {
    revalidatePath('/admin', 'layout');
  } else {
    revalidatePath('/app', 'layout');
  }

  return { success: true, user: loginData.user, role };
}


export async function getCurrentUserAction(): Promise<{ user: SupabaseUser | null; profile: any | null; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("Error getting user in getCurrentUserAction:", authError.message);
    return { user: null, profile: null, error: "Gagal memuat sesi pengguna: " + authError.message };
  }
  if (!user) {
    return { user: null, profile: null };
  }

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: No rows found
      console.error("Error fetching profile for user:", user.id, profileError.message);
      return { user: user, profile: null, error: "Gagal mengambil profil: " + profileError.message };
    }
    return { user: user, profile: profileData as any | null };
  } catch (e: any) {
    console.error("Exception fetching profile in getCurrentUserAction:", e);
    return { user: user, profile: null, error: "Terjadi kesalahan server saat mengambil profil: " + e.message };
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
      return { success: false, error: "Gagal memeriksa kategori yang ada: " + selectError.message };
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
      return { success: false, error: "Gagal membuat kategori baru: " + insertError.message };
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
      return { success: false, error: "Gagal mengambil kategori: " + fetchError.message };
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
  scheduledAt: string | null | undefined,
  creatorName: string
): Promise<{ success: boolean; billId?: string; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } , error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const billInsertData: Database['public']['Tables']['bills']['Insert'] = {
      name: billName || "Tagihan Baru",
      user_id: user.id,
      category_id: categoryId,
      scheduled_at: scheduledAt || null,
    };

    const { data: billData, error: billInsertError } = await supabase
      .from('bills')
      .insert([billInsertData])
      .select('id, name')
      .single();

    if (billInsertError) {
        throw new Error("Gagal membuat tagihan: " + billInsertError.message);
    }
    if (!billData || !billData.id) {
        throw new Error("Gagal mendapatkan ID tagihan setelah pembuatan.");
    }

    const participantResult = await addParticipantAction(billData.id, creatorName, user.id);
    if (!participantResult.success) {
      console.error("Failed to add creator as participant:", participantResult.error);
      // Rollback bill creation if participant add fails
      await supabase.from('bills').delete().eq('id', billData.id);
      return { success: false, error: `Gagal menambahkan kreator sebagai partisipan: ${participantResult.error}` };
    }

    if (scheduledAt) {
      revalidatePath('/', 'page');
      revalidatePath('/app/history', 'page');
    }
    
    return { success: true, billId: billData.id };
  } catch (e: any) {
    return { success: false, error: e.message || "Kesalahan server saat membuat tagihan." };
  }
}

export async function addParticipantAction(billId: string, personName: string, profileId?: string | null): Promise<{ success: boolean; person?: Person; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId || !personName.trim()) {
    return { success: false, error: "ID Tagihan dan nama orang diperlukan." };
  }
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    const insertData: Database['public']['Tables']['bill_participants']['Insert'] = {
      bill_id: billId,
      name: personName.trim(),
      profile_id: profileId || null,
    };

    const { data, error } = await supabase
      .from('bill_participants')
      .insert([insertData])
      .select('id, name, profile_id, created_at')
      .single();

    if (error) {
      if (error.code === '23505') { // unique constraint violation
        return { success: false, error: "Pengguna ini sudah diundang atau ditambahkan ke tagihan." };
      }
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: "Gagal menambahkan partisipan atau mengambil data." };
    }
    
    const person: Person = { 
      id: data.id, 
      name: data.name,
      profile_id: data.profile_id,
    };

    return { success: true, person };
  } catch (e: any) {
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
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Terjadi kesalahan server saat menghapus partisipan." };
  }
}


export async function handleScanReceiptAction(
  billId: string,
  receiptDataUri: string
): Promise<{ success: boolean; data?: { items: ScannedItem[], taxAmount: number }; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId) return { success: false, error: "Bill ID tidak disediakan." };
  if (!receiptDataUri) return { success: false, error: "Tidak ada data gambar." };

  try {
    const aiResult: ScanReceiptOutput = await scanReceipt({ receiptDataUri });

    if (aiResult && aiResult.items !== undefined) {
      const itemsToInsert = aiResult.items.map((item: AiReceiptItem) => ({
        bill_id: billId,
        name: item.name || "Item Tidak Dikenal",
        unit_price: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        quantity: (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1,
      }));

      let insertedDbItems: ScannedItem[] = [];
      if (itemsToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from('bill_items')
          .insert(itemsToInsert)
          .select('id, name, unit_price, quantity');

        if (insertError) {
          return { success: false, error: "Gagal menyimpan item ke database: " + insertError.message };
        }
        if (!data) {
          return { success: false, error: "Gagal mendapatkan data item setelah disimpan." };
        }
        insertedDbItems = data.map(dbItem => ({
          id: dbItem.id,
          name: dbItem.name,
          unitPrice: dbItem.unit_price,
          quantity: dbItem.quantity,
        }));
      }
      
      const taxAmountFromAI = aiResult.taxAmount || 0;
      if (taxAmountFromAI > 0) {
         await supabase.from('bills').update({ tax_amount: taxAmountFromAI }).eq('id', billId);
      }

      return { success: true, data: { items: insertedDbItems, taxAmount: taxAmountFromAI } };
    } else {
      return { success: false, error: "Menerima data tak terduga dari pemindai." };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan server tak terduga.";
    console.error("Error in handleScanReceiptAction:", error);
    return { success: false, error: `Pemindaian gagal: ${message}` };
  }
}

export async function addBillItemToDbAction(
  billId: string,
  newItemData: { name: string; unitPrice: number; quantity: number }
): Promise<{ success: boolean; item?: ScannedItem; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId) return { success: false, error: "Bill ID is required." };
  if (!newItemData.name.trim()) return { success: false, error: "Item name cannot be empty." };

  try {
    const { data: insertedItem, error } = await supabase
      .from('bill_items')
      .insert({ bill_id: billId, ...newItemData })
      .select('id, name, unit_price, quantity')
      .single();

    if (error) return { success: false, error: "Gagal menambah item: " + error.message };
    if (!insertedItem) return { success: false, error: "Gagal mengambil data item setelah insert." };
    
    return {
      success: true,
      item: {
        id: insertedItem.id,
        name: insertedItem.name,
        unitPrice: insertedItem.unit_price,
        quantity: insertedItem.quantity,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Server error while adding item." };
  }
}

export async function updateBillItemInDbAction(
  updatedItem: SplitItem
): Promise<{ success: boolean; item?: ScannedItem; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!updatedItem.id) return { success: false, error: "Item ID is required." };
  if (!updatedItem.name.trim()) return { success: false, error: "Item name cannot be empty." };

  try {
    // Update item details
    const { data, error: itemUpdateError } = await supabase
      .from('bill_items')
      .update({
        name: updatedItem.name,
        unit_price: updatedItem.unitPrice,
        quantity: updatedItem.quantity,
      })
      .eq('id', updatedItem.id)
      .select('id, name, unit_price, quantity')
      .single();
    
    if (itemUpdateError) throw new Error("Gagal memperbarui detail item: " + itemUpdateError.message);
    if (!data) throw new Error("Gagal mengambil data item setelah diperbarui.");

    // Update assignments: delete existing and insert new ones
    await supabase.from('item_assignments').delete().eq('bill_item_id', updatedItem.id);
    
    const newAssignments = updatedItem.assignedTo
      .filter(a => a.count > 0)
      .map(a => ({
        bill_item_id: updatedItem.id,
        participant_id: a.personId,
        assigned_quantity: a.count,
      }));

    if (newAssignments.length > 0) {
      const { error: assignmentError } = await supabase.from('item_assignments').insert(newAssignments);
      if (assignmentError) throw new Error("Gagal menyimpan alokasi item: " + assignmentError.message);
    }
    
    return {
      success: true,
      item: { id: data.id, name: data.name, unitPrice: data.unit_price, quantity: data.quantity },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Server error while updating item." };
  }
}


export async function deleteBillItemFromDbAction(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!itemId) return { success: false, error: "Item ID is required." };

  try {
    await supabase.from('item_assignments').delete().eq('bill_item_id', itemId);
    await supabase.from('bill_items').delete().eq('id', itemId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Server error while deleting item." };
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
  if (!billId || !payerParticipantId) {
    return { success: false, error: "Bill ID dan Payer ID diperlukan." };
  }

  if (people.length < 1) {
    return { success: false, error: "Minimal satu partisipan diperlukan." };
  }
  
  const payer = people.find(p => p.id === payerParticipantId);
  if (!payer) {
    return { success: false, error: "Data pembayar tidak valid." };
  }

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

  const summarizeBillInput: SummarizeBillInput = {
    items: itemsForAI,
    people: people.map(p => p.name),
    payerName: payer.name,
    taxAmount, tipAmount, taxTipSplitStrategy,
  };

  try {
    const rawSummary: RawBillSummary = await summarizeBill(summarizeBillInput);

    let calculatedGrandTotal = 0;
    const participantUpdatePromises = people.map(async (person) => {
      const share = rawSummary[person.name] ?? 0;
      calculatedGrandTotal += share;
      return supabase.from('bill_participants').update({ total_share_amount: share }).eq('id', person.id);
    });
    await Promise.all(participantUpdatePromises);

    await supabase.from('bills').update({
        payer_participant_id: payerParticipantId,
        tax_amount: taxAmount,
        tip_amount: tipAmount,
        tax_tip_split_strategy: taxTipSplitStrategy,
        grand_total: calculatedGrandTotal,
    }).eq('id', billId);

    await supabase.from('settlements').delete().eq('bill_id', billId);

    const settlementInserts: SettlementInsert[] = people
      .filter(p => p.id !== payerParticipantId && (rawSummary[p.name] ?? 0) > 0)
      .map(p => {
        const amount = rawSummary[p.name] ?? 0;
        const serviceFee = amount * 0.01; // Pre-calculate potential 1% service fee
        return {
          bill_id: billId,
          from_participant_id: p.id,
          to_participant_id: payerParticipantId,
          amount: amount,
          status: 'unpaid' as const,
          service_fee: serviceFee,
        }
      });

    if (settlementInserts.length > 0) {
      const { error: insertError } = await supabase.from('settlements').insert(settlementInserts);
       if (insertError) {
        console.error("Error inserting settlements:", insertError);
        throw new Error("Gagal menyimpan data penyelesaian pembayaran: " + insertError.message);
      }
    }

    revalidatePath('/', 'page');
    revalidatePath('/app/history', 'page');
    return { success: true, data: rawSummary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan server tak terduga.";
    return { success: false, error: `Gagal meringkas tagihan: ${message}` };
  }
}

export async function markSettlementPaidAction(
  settlementId: string,
  method: 'qris' | 'offline'
): Promise<{ success: boolean, error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!settlementId) {
    return { success: false, error: "Settlement ID is required." };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated." };
    }

    let updateData: Partial<Database['public']['Tables']['settlements']['Update']> = {
      status: 'paid'
    };

    if (method === 'offline') {
      updateData.service_fee = 0; // Nullify service fee for offline payments
    }
    
    const { error: updateError } = await supabase
      .from('settlements')
      .update(updateData)
      .eq('id', settlementId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath('/', 'page'); // For dashboard
    revalidatePath('/app', 'page'); // For bill page
    revalidatePath('/app/history', 'page'); // For history page
    revalidatePath('/admin/revenue', 'page'); // For revenue page
    return { success: true };

  } catch (e: any) {
    console.error("Error marking settlement as paid:", e);
    return { success: false, error: e.message || "Failed to mark as paid." };
  }
}


// ... existing user profile actions ...
export async function updateUserProfileAction(
  userId: string,
  profileUpdates: Partial<Database['public']['Tables']['profiles']['Update']>,
  avatarFile?: File | null
): Promise<{ success: boolean; data?: any; error?: string | string[] }> {
  const supabase = createSupabaseServerClient();
  if (!userId) return { success: false, error: "User ID is required." };

  try {
    const { data: currentProfileData, error: fetchError } = await supabase
      .from('profiles')
      .select('avatar_url, full_name, username, phone_number')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return { success: false, error: "Gagal mengambil profil saat ini: " + fetchError.message };
    }
    if (!currentProfileData) {
        return { success: false, error: "Profil pengguna tidak ditemukan." };
    }
    
    const updatesForDB: Partial<Database['public']['Tables']['profiles']['Update']> = {};
    const errorMessages: string[] = [];
    
    if (profileUpdates.username !== undefined) {
        updatesForDB.username = profileUpdates.username;
    }
    if (profileUpdates.full_name !== undefined) {
        updatesForDB.full_name = profileUpdates.full_name;
    }
    if (profileUpdates.phone_number !== undefined) {
        updatesForDB.phone_number = profileUpdates.phone_number;
    }

    let avatarUrlToUpdate: string | null | undefined = undefined;

    if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `public/${userId}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
            errorMessages.push("Gagal mengunggah avatar: " + uploadError.message);
        } else {
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            if (publicUrlData && publicUrlData.publicUrl) {
                avatarUrlToUpdate = publicUrlData.publicUrl;
            } else {
                errorMessages.push('Gagal mendapatkan URL publik avatar.');
            }
        }
    }

    if (avatarUrlToUpdate !== undefined) {
        updatesForDB.avatar_url = avatarUrlToUpdate;
    }

    if (errorMessages.length > 0) {
        return { success: false, error: errorMessages };
    }

    if (Object.keys(updatesForDB).length > 0) {
      const { data: updatedProfile, error: dbUpdateError } = await supabase
        .from('profiles')
        .update(updatesForDB)
        .eq('id', userId)
        .select()
        .single();

      if (dbUpdateError) {
        return { success: false, error: ["Gagal memperbarui profil: " + dbUpdateError.message] };
      }
      
      revalidatePath('/app', 'layout');
      revalidatePath('/app/profile', 'page');
      revalidatePath('/', 'layout');
      return { success: true, data: updatedProfile };
    }

    return { success: true, data: currentProfileData };

  } catch (e: any) {
    return { success: false, error: "Kesalahan server: " + (e.message || "Unknown error") };
  }
}

export async function removeAvatarAction(userId: string): Promise<{ success: boolean; data?: { avatar_url: null }; error?: string }> {
    const supabase = createSupabaseServerClient();
    if (!userId) {
        return { success: false, error: "User ID diperlukan." };
    }
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) {
            return { success: false, error: "Tidak diizinkan." };
        }

        const { data: currentProfile, error: fetchProfileError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .single();

        if (fetchProfileError) {
            return { success: false, error: "Gagal mengambil profil: " + fetchProfileError.message };
        }
        if (!currentProfile?.avatar_url) {
            return { success: true, data: { avatar_url: null } };
        }
        
        const storagePathPrefix = "/storage/v1/object/public/avatars/";
        const filePathInBucket = currentProfile.avatar_url.split(storagePathPrefix)[1];

        if (filePathInBucket) {
            await supabase.storage.from('avatars').remove([filePathInBucket]);
        }
        
        await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
        
        revalidatePath('/app/profile', 'page');
        revalidatePath('/', 'layout');
        return { success: true, data: { avatar_url: null } };
    } catch (e: any) {
        return { success: false, error: "Kesalahan server saat menghapus avatar: " + (e.message || "Unknown error") };
    }
}


export async function getBillsHistoryAction(): Promise<{ success: boolean; data?: BillHistoryEntry[]; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('id, name, created_at, grand_total, payer_participant_id, scheduled_at, category_id, bill_categories(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (billsError) {
      return { success: false, error: "Gagal mengambil riwayat: " + billsError.message };
    }
    if (!bills) {
      return { success: true, data: [] };
    }

    const historyEntries: BillHistoryEntry[] = [];
    for (const bill of bills) {
      let payerName: string | null = null;
      if (bill.payer_participant_id) {
        const { data: payerData } = await supabase
          .from('bill_participants')
          .select('name')
          .eq('id', bill.payer_participant_id)
          .single();
        payerName = payerData?.name || null;
      }
      const { count: participantCount } = await supabase
        .from('bill_participants')
        .select('*', { count: 'exact', head: true })
        .eq('bill_id', bill.id);
      
      historyEntries.push({
        id: bill.id,
        name: bill.name,
        createdAt: bill.created_at || new Date().toISOString(),
        grandTotal: bill.grand_total,
        payerName: payerName,
        participantCount: participantCount || 0,
        scheduled_at: bill.scheduled_at,
        categoryName: (bill.bill_categories as any)?.name || null,
      });
    }
    return { success: true, data: historyEntries };
  } catch (e:any) {
    return { success: false, error: e.message || "Kesalahan server saat mengambil riwayat." };
  }
}

export async function getBillDetailsAction(billId: string): Promise<{ success: boolean; data?: FetchedBillDetailsWithItems; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pengguna tidak terautentikasi." };

  try {
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, name, user_id, created_at, grand_total, tax_amount, tip_amount, payer_participant_id, tax_tip_split_strategy, scheduled_at')
      .eq('id', billId)
      .single();
    if (billError) return { success: false, error: "Gagal mengambil detail tagihan: " + billError.message };

    const { data: participantsRaw, error: pError } = await supabase.from('bill_participants').select('id, name, profile_id, total_share_amount, profiles ( avatar_url )').eq('bill_id', billId);
    if (pError) return { success: false, error: "Gagal mengambil partisipan: " + pError.message };

    const { data: itemsRaw, error: iError } = await supabase.from('bill_items').select('id, name, unit_price, quantity').eq('bill_id', billId);
    if (iError) return { success: false, error: "Gagal mengambil item: " + iError.message };

    const { data: assignmentsRaw, error: aError } = await supabase.from('item_assignments').select('bill_item_id, participant_id, assigned_quantity').in('bill_item_id', itemsRaw.map(i => i.id));
    if (aError) return { success: false, error: "Gagal mengambil alokasi: " + aError.message };
    
    const participants: Person[] = participantsRaw.map(p => ({
        id: p.id,
        name: p.name,
        profile_id: p.profile_id,
        avatar_url: p.profiles?.avatar_url || null,
    }));
    
    const items: SplitItem[] = itemsRaw.map(item => ({
        id: item.id,
        name: item.name,
        unitPrice: item.unit_price,
        quantity: item.quantity,
        assignedTo: assignmentsRaw
            .filter(a => a.bill_item_id === item.id)
            .map(a => ({ personId: a.participant_id, count: a.assigned_quantity }))
    }));

    const payerName = participants.find(p => p.id === bill.payer_participant_id)?.name || "Belum ditentukan";
    
    let summaryData: FetchedBillDetails['summaryData'] | null = null;
    const isSummarized = bill.grand_total !== null;

    if (isSummarized) {
       const { data: settlementsData, error: settlementsError } = await supabase
          .from('settlements')
          .select('id, amount, status, service_fee, from_participant:bill_participants!from_participant_id(id, name), to_participant:bill_participants!to_participant_id(id, name)')
          .eq('bill_id', billId);

        const settlements: Settlement[] = (settlementsData || []).map(s => ({
            id: s.id, // Pass settlement ID
            fromId: (s.from_participant as any)?.id, from: (s.from_participant as any)?.name,
            toId: (s.to_participant as any)?.id, to: (s.to_participant as any)?.name,
            amount: s.amount, 
            status: s.status as SettlementStatus,
            serviceFee: s.service_fee || 0,
        }));
        
        const totalTaxTip = (bill.tax_amount || 0) + (bill.tip_amount || 0);
        
        const personalShares: PersonalShareDetail[] = participantsRaw.map(p => {
          let subTotalFromItems = 0;
          const personalItems: PersonalItemDetail[] = [];
          
          items.forEach(item => {
            const assignment = item.assignedTo.find(a => a.personId === p.id);
            if (assignment && assignment.count > 0) {
              const totalItemCost = assignment.count * item.unitPrice;
              subTotalFromItems += totalItemCost;
              personalItems.push({
                itemName: item.name,
                quantityConsumed: assignment.count,
                unitPrice: item.unitPrice,
                totalItemCost,
              });
            }
          });

          let taxShare = 0;
          let tipShare = 0;

          if (bill.tax_tip_split_strategy === 'SPLIT_EQUALLY') {
              taxShare = (bill.tax_amount || 0) / participants.length;
              tipShare = (bill.tip_amount || 0) / participants.length;
          } else if (bill.tax_tip_split_strategy === 'PAYER_PAYS_ALL' && p.id === bill.payer_participant_id) {
              taxShare = bill.tax_amount || 0;
              tipShare = bill.tip_amount || 0;
          }

          return {
            personId: p.id,
            personName: p.name,
            items: personalItems,
            subTotalFromItems,
            taxShare,
            tipShare,
            totalShare: p.total_share_amount || 0,
          }
        });

        summaryData = {
            payerId: bill.payer_participant_id,
            payerName: payerName,
            taxAmount: bill.tax_amount || 0,
            tipAmount: bill.tip_amount || 0,
            taxTipSplitStrategy: bill.tax_tip_split_strategy as TaxTipSplitStrategy,
            settlements: settlements,
            grandTotal: bill.grand_total || 0,
            personalShares: personalShares,
        };
    } else {
        // Bill is still being edited
        summaryData = {
            payerId: bill.payer_participant_id, payerName,
            taxAmount: bill.tax_amount || 0, tipAmount: bill.tip_amount || 0,
            taxTipSplitStrategy: bill.tax_tip_split_strategy as TaxTipSplitStrategy,
            settlements: [], grandTotal: 0,
            personalShares: [],
        };
    }

    return { success: true, data: { billName: bill.name, createdAt: bill.created_at!, participants, items, summaryData, ownerId: bill.user_id } };
  } catch (e: any) {
    return { success: false, error: e.message || "Kesalahan server saat mengambil detail." };
  }
}

export async function getAllUsersAction() {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin'); // Exclude admins from the user list

    if (error) {
        return { success: false, error: error.message }
    }
    return { success: true, users: data }
}

// ===== Dashboard Actions =====

export async function getDashboardDataAction(): Promise<{ success: boolean; data?: DashboardData, error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    
    // Fetch user's categories
    const { data: categories, error: catError } = await supabase
        .from('bill_categories').select('id, name');
    if(catError) throw new Error("Gagal mengambil kategori: " + catError.message);

    // Fetch bills for the current month
    const { data: billsThisMonth, error: billsError } = await supabase
      .from('bills')
      .select('category_id, grand_total, scheduled_at, created_at, id, name')
      .eq('user_id', user.id)
      .gte('created_at', startOfCurrentMonth.toISOString());
    if (billsError) throw new Error("Gagal mengambil tagihan bulan ini: " + billsError.message);

    // Fetch all user bills for history/scheduled list
    const { data: allBills, error: allBillsError } = await supabase
      .from('bills')
      .select('id, name, created_at, grand_total, scheduled_at, category_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if(allBillsError) throw new Error("Gagal mengambil semua tagihan: " + allBillsError.message);


    // Process Monthly Expenses
    const monthlyExpensesMap: Map<string, { totalAmount: number, icon?: string, color?: string }> = new Map();
    billsThisMonth?.filter(b => b.grand_total).forEach(bill => {
      const category = categories?.find(c => c.id === bill.category_id);
      const categoryName = category?.name || 'Lainnya';
      const current = monthlyExpensesMap.get(categoryName) || { totalAmount: 0 };
      monthlyExpensesMap.set(categoryName, {
        totalAmount: current.totalAmount + (bill.grand_total || 0),
      });
    });

    const monthlyExpenses: MonthlyExpenseByCategory[] = Array.from(monthlyExpensesMap.entries()).map(([name, data]) => ({
      categoryName: name,
      ...data
    }));

    const expenseChartData: ExpenseChartDataPoint[] = monthlyExpenses.map(e => ({
      name: e.categoryName,
      total: e.totalAmount,
    }));

    // Process Recent and Scheduled Bills for Display
    const recentBills: RecentBillDisplayItem[] = [];
    const scheduledBills: ScheduledBillDisplayItem[] = [];
    
    for (const bill of (allBills || [])) {
      if (bill.scheduled_at && isFuture(parseISO(bill.scheduled_at))) {
        if (scheduledBills.length < 5) { // Limit to 5 for display
          const { count } = await supabase.from('bill_participants').select('*', { count: 'exact', head: true }).eq('bill_id', bill.id);
          scheduledBills.push({
            id: bill.id,
            name: bill.name,
            scheduled_at: bill.scheduled_at,
            categoryName: categories?.find(c => c.id === bill.category_id)?.name,
            participantCount: count || 0,
          });
        }
      } else if (bill.grand_total !== null && bill.grand_total > 0) {
        if (recentBills.length < 3) { // Limit to 3 for display
           const { count } = await supabase.from('bill_participants').select('*', { count: 'exact', head: true }).eq('bill_id', bill.id);
           recentBills.push({
            id: bill.id,
            name: bill.name,
            createdAt: bill.created_at,
            grandTotal: bill.grand_total,
            categoryName: categories?.find(c => c.id === bill.category_id)?.name,
            participantCount: count || 0,
           });
        }
      }
    }
    
    return { success: true, data: { monthlyExpenses, expenseChartData, recentBills, scheduledBills } };

  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ===== ADMIN DASHBOARD ACTIONS =====
export async function getAdminDashboardDataAction(): Promise<{ success: boolean; data?: AdminDashboardData, error?: string }> {
  const supabase = createSupabaseServerClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Tidak terautentikasi." };

    const today = new Date();
    const oneWeekAgo = subDays(today, 7).toISOString();
    const thirtyDaysAgo = subDays(today, 30).toISOString();
    const oneMonthAgo = subMonths(today, 1).toISOString();

    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin');
    const { count: activeUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('updated_at', thirtyDaysAgo).neq('role', 'admin');
    const { count: newUserWeekCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('created_at', oneWeekAgo).neq('role', 'admin');
    const { count: newUserMonthCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('created_at', oneMonthAgo).neq('role', 'admin');
    const { count: totalBills } = await supabase.from('bills').select('*', { count: 'exact', head: true });
    const { count: billsLastWeekCount } = await supabase.from('bills').select('id', { count: 'exact', head: true }).gt('created_at', oneWeekAgo);
    const { count: unverifiedUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending').neq('role', 'admin');
    const { count: blockedUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'blocked').neq('role', 'admin');

    let userGrowthData = [];
    for (let i = 5; i >= 0; i--) {
        const month = subMonths(today, i);
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).lte('created_at', endOfMonth(month).toISOString()).neq('role', 'admin');
        userGrowthData.push({ month: format(month, 'MMM'), users: count || 0 });
    }

    const userStatusData = [
        { name: 'Aktif', value: activeUsers || 0, color: '#10b981' },
        { name: 'Belum Verifikasi', value: unverifiedUsers || 0, color: '#64748b' },
        { name: 'Diblokir', value: blockedUsers || 0, color: '#dc2626' },
    ];
    
    let dailyActivityData = [];
    for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true })
            .gte('created_at', day.toISOString().split('T')[0] + 'T00:00:00')
            .lte('created_at', day.toISOString().split('T')[0] + 'T23:59:59');
        dailyActivityData.push({ day: format(day, 'dd/MM'), sessions: count || 0 });
    }

    return { success: true, data: { totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, newUserWeekCount: newUserWeekCount || 0, newUserMonthCount: newUserMonthCount || 0, totalBills: totalBills || 0, billsLastWeekCount: billsLastWeekCount || 0, userGrowthData, userStatusData, dailyActivityData } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getRevenueDataAction(): Promise<{ success: boolean; data?: RevenueData, error?: string }> {
  const supabase = createSupabaseServerClient();
  try {
    const { data: settlements, error: settlementError } = await supabase.from('settlements').select('amount, service_fee, bill_id, created_at, bills(category_id, bill_categories(name))').eq('status', 'paid');
    
    if(settlementError) {
      console.error("Error fetching settlements for revenue: ", settlementError);
      return { success: false, error: "Gagal mengambil data transaksi: " + settlementError.message };
    }

    if (!settlements || settlements.length === 0) {
      return { success: true, data: { totalRevenue: 0, totalTransactions: 0, averageFeePerTransaction: 0, revenueTrend: [], transactionTrend: [], revenueByCategory: [] } };
    }

    const totalRevenue = settlements.reduce((acc, s) => acc + (s.service_fee || 0), 0);
    const totalTransactions = new Set(settlements.map(s => s.bill_id)).size;
    const averageFeePerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    let revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthRevenue = settlements.filter(s => parseISO(s.created_at).getMonth() === month.getMonth() && parseISO(s.created_at).getFullYear() === month.getFullYear()).reduce((acc, s) => acc + (s.service_fee || 0), 0);
      revenueTrend.push({ month: format(month, 'MMM'), revenue: monthRevenue });
    }

    let transactionTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthTransactions = new Set(settlements.filter(s => parseISO(s.created_at).getMonth() === month.getMonth() && parseISO(s.created_at).getFullYear() === month.getFullYear()).map(s => s.bill_id)).size;
      transactionTrend.push({ month: format(month, 'MMM'), transactions: monthTransactions });
    }
    
    const revenueByCategoryMap: Record<string, number> = {};
    settlements.forEach(s => {
      const categoryName = (s.bills?.bill_categories as any)?.name || 'Lainnya';
      revenueByCategoryMap[categoryName] = (revenueByCategoryMap[categoryName] || 0) + (s.service_fee || 0);
    });
    const revenueByCategory = Object.entries(revenueByCategoryMap).map(([key, value]) => ({ categoryName: key, revenue: value }));

    return { success: true, data: { totalRevenue, totalTransactions, averageFeePerTransaction, revenueTrend, transactionTrend, revenueByCategory } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}


export async function getSpendingAnalysisAction(): Promise<{ success: boolean; data?: SpendingAnalysisData, error?: string }> {
  const supabase = createSupabaseServerClient();
  try {
    const { data: bills, error: billsError } = await supabase.from('bills').select('id, grand_total, created_at, bill_categories(name)');
    if (billsError) throw billsError;
    if (!bills) return { success: false, error: "Tidak ada data tagihan." };

    const allCategories = (await supabase.from('bill_categories').select('name')).data?.map(c => c.name) || [];
    allCategories.push('Lainnya'); // Ensure 'Lainnya' is included

    const totalSpending = bills.reduce((acc, b) => acc + (b.grand_total || 0), 0);
    const totalBills = bills.length;
    const averagePerBill = totalBills > 0 ? totalSpending / totalBills : 0;

    const categoryCounts: Record<string, { totalAmount: number, billCount: number }> = {};
    bills.forEach(b => {
      const categoryName = b.bill_categories?.name || 'Lainnya';
      if (!categoryCounts[categoryName]) {
        categoryCounts[categoryName] = { totalAmount: 0, billCount: 0 };
      }
      categoryCounts[categoryName].totalAmount += b.grand_total || 0;
      categoryCounts[categoryName].billCount++;
    });

    const spendingByCategory = Object.entries(categoryCounts).map(([key, value]) => ({ categoryName: key, ...value }));
    const mostPopularCategory = spendingByCategory.sort((a, b) => b.billCount - a.billCount)[0] || { categoryName: '-', billCount: 0 };
    const topCategories = spendingByCategory.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);
    
    let spendingTrendMap: Record<string, { month: string, [key: string]: number | string }> = {};
    for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i);
        const monthStr = format(month, 'MMM');
        spendingTrendMap[monthStr] = { month: monthStr };
        // Initialize all categories with 0 for this month to ensure they appear in the chart
        allCategories.forEach(cat => {
          spendingTrendMap[monthStr][cat] = 0;
        });
    }

    bills.forEach(b => {
        const monthStr = format(parseISO(b.created_at), 'MMM');
        if (spendingTrendMap[monthStr]) {
            const categoryName = b.bill_categories?.name || 'Lainnya';
            spendingTrendMap[monthStr][categoryName] = (spendingTrendMap[monthStr][categoryName] as number || 0) + (b.grand_total || 0);
        }
    });
    const spendingTrend = Object.values(spendingTrendMap);

    return { success: true, data: { totalSpending, totalBills, averagePerBill, mostPopularCategory, spendingByCategory, spendingTrend, topCategories } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
