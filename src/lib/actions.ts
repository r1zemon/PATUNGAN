
"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy, ScannedItem, BillHistoryEntry, BillCategory, DashboardData, MonthlyExpenseByCategory, ExpenseChartDataPoint, RecentBillDisplayItem, ScheduledBillDisplayItem, DetailedBillSummaryData, Settlement, FetchedBillDetails, PersonalShareDetail, UserProfileBasic, FriendRequestDisplay, FriendDisplay } from "./types";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PostgrestSingleResponse, User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from '@/lib/database.types';
import { format, startOfMonth, endOfMonth, parseISO, isFuture } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';


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


export async function getCurrentUserAction(): Promise<{ user: SupabaseUser | null; profile: UserProfileBasic | null; error?: string }> {
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
      .select('id, username, full_name, avatar_url, email')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: No rows found
      console.error("Error fetching profile for user:", user.id, profileError.message);
      return { user: user, profile: null, error: `Gagal mengambil profil: ${profileError.message}` };
    }
    return { user: user, profile: profileData as UserProfileBasic | null };
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
  billId: string,
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
        return { success: true, data: { items: [] } };
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
        id: dbItem.id,
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

export async function addBillItemToDbAction(
  billId: string,
  newItemData: { name: string; unitPrice: number; quantity: number }
): Promise<{ success: boolean; item?: ScannedItem; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId) {
    return { success: false, error: "Bill ID is required to add an item." };
  }
  if (!newItemData.name.trim()) {
    return { success: false, error: "Item name cannot be empty." };
  }

  try {
    const { data: insertedItem, error } = await supabase
      .from('bill_items')
      .insert({
        bill_id: billId,
        name: newItemData.name,
        unit_price: newItemData.unitPrice,
        quantity: newItemData.quantity,
      })
      .select('id, name, unit_price, quantity')
      .single();

    if (error) {
      console.error("Error adding bill item to DB:", error);
      return { success: false, error: `Failed to add item to database: ${error.message}` };
    }
    if (!insertedItem) {
      return { success: false, error: "Failed to retrieve item data after insert." };
    }
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
    console.error("Exception in addBillItemToDbAction:", e);
    return { success: false, error: e.message || "Server error while adding bill item." };
  }
}

export async function updateBillItemInDbAction(
  itemId: string,
  updates: Partial<Omit<ScannedItem, 'id'>>
): Promise<{ success: boolean; item?: ScannedItem; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!itemId) {
    return { success: false, error: "Item ID is required to update an item." };
  }
  if (updates.name !== undefined && !updates.name.trim()) {
    return { success: false, error: "Item name cannot be empty." };
  }

  try {
    const { data: updatedItem, error } = await supabase
      .from('bill_items')
      .update({
        name: updates.name,
        unit_price: updates.unitPrice,
        quantity: updates.quantity,
      })
      .eq('id', itemId)
      .select('id, name, unit_price, quantity')
      .single();

    if (error) {
      console.error("Error updating bill item in DB:", error);
      return { success: false, error: `Failed to update item in database: ${error.message}` };
    }
     if (!updatedItem) {
      return { success: false, error: "Failed to retrieve updated item data." };
    }
    return {
      success: true,
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        unitPrice: updatedItem.unit_price,
        quantity: updatedItem.quantity,
      },
    };
  } catch (e: any) {
    console.error("Exception in updateBillItemInDbAction:", e);
    return { success: false, error: e.message || "Server error while updating bill item." };
  }
}

export async function deleteBillItemFromDbAction(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!itemId) {
    return { success: false, error: "Item ID is required to delete an item." };
  }

  try {
    // First, delete any assignments related to this item
    const { error: deleteAssignmentsError } = await supabase
      .from('item_assignments')
      .delete()
      .eq('bill_item_id', itemId);

    if (deleteAssignmentsError) {
      console.error("Error deleting item assignments for item ID:", itemId, deleteAssignmentsError);
      return { success: false, error: `Failed to delete related item assignments: ${deleteAssignmentsError.message}` };
    }

    // Then, delete the item itself
    const { error: deleteItemError } = await supabase
      .from('bill_items')
      .delete()
      .eq('id', itemId);

    if (deleteItemError) {
      console.error("Error deleting bill item from DB:", deleteItemError);
      return { success: false, error: `Failed to delete item from database: ${deleteItemError.message}` };
    }

    return { success: true };
  } catch (e: any) {
    console.error("Exception in deleteBillItemFromDbAction:", e);
    return { success: false, error: e.message || "Server error while deleting bill item." };
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

  // --- Start: Persist Item Assignments ---
  try {
    const { data: billItemsForThisBill, error: fetchBillItemsError } = await supabase
      .from('bill_items')
      .select('id')
      .eq('bill_id', billId);

    if (fetchBillItemsError) {
      console.error("Error fetching bill_items for assignment processing:", fetchBillItemsError);
      return { success: false, error: `Gagal mengambil item tagihan untuk alokasi: ${fetchBillItemsError.message}` };
    }

    const billItemIdsForThisBill = (billItemsForThisBill || []).map(bi => bi.id);

    if (billItemIdsForThisBill.length > 0) {
      const { error: deleteAssignmentsError } = await supabase
        .from('item_assignments')
        .delete()
        .in('bill_item_id', billItemIdsForThisBill);

      if (deleteAssignmentsError) {
        console.error("Error deleting old item assignments:", deleteAssignmentsError);
        return { success: false, error: `Gagal menghapus alokasi item lama: ${deleteAssignmentsError.message}` };
      }
    }

    const newAssignments: ItemAssignmentInsert[] = [];
    for (const item of splitItems) {
      if (!billItemIdsForThisBill.includes(item.id)) {
          console.warn(`Item with id ${item.id} (name: ${item.name}) from client-side splitItems is not found in the database's bill_items for bill ${billId}. Skipping assignments for this item.`);
          continue;
      }
      for (const assignment of item.assignedTo) {
        if (assignment.count > 0) {
          const participantExists = people.some(p => p.id === assignment.personId);
          if (!participantExists) {
              console.warn(`Participant with id ${assignment.personId} for item ${item.name} assignment is not found in the current bill's participants. Skipping this assignment.`);
              continue;
          }
          newAssignments.push({
            bill_item_id: item.id,
            participant_id: assignment.personId,
            assigned_quantity: assignment.count,
          });
        }
      }
    }

    if (newAssignments.length > 0) {
      const { error: insertAssignmentsError } = await supabase
        .from('item_assignments')
        .insert(newAssignments);

      if (insertAssignmentsError) {
        console.error("Error inserting new item assignments:", insertAssignmentsError);
        return { success: false, error: `Gagal menyimpan alokasi item baru: ${insertAssignmentsError.message}` };
      }
    }
  } catch (e: any) {
    console.error("Exception during item assignment persistence:", e);
    return { success: false, error: `Kesalahan server saat menyimpan alokasi item: ${e.message}` };
  }
  // --- End: Persist Item Assignments ---


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
      .select(`id, name, created_at, grand_total, payer_participant_id, scheduled_at, category_id, bill_categories(name)`)
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

const DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD = ["Makanan", "Transportasi", "Hiburan", "Penginapan"];
const OTHERS_CATEGORY_NAME_FOR_DASHBOARD = "Lainnya";


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
        icon: CATEGORY_ICON_KEYS[category.name] || CATEGORY_ICON_KEYS["Lainnya"] || "Shapes",
        color: PREDEFINED_CATEGORY_COLORS[category.name] || PREDEFINED_CATEGORY_COLORS["Lainnya"] || "hsl(var(--chart-1))",
      };
    });

    if (!allMonthlyExpensesRaw.find(cat => cat.categoryName === OTHERS_CATEGORY_NAME_FOR_DASHBOARD)) {
        const lainnyaDefault = (userCategories || []).find(cat => cat.name === OTHERS_CATEGORY_NAME_FOR_DASHBOARD);
        if (lainnyaDefault){
             allMonthlyExpensesRaw.push({
                categoryName: OTHERS_CATEGORY_NAME_FOR_DASHBOARD,
                totalAmount: spendingPerCategory[lainnyaDefault.id] || 0,
                icon: CATEGORY_ICON_KEYS[OTHERS_CATEGORY_NAME_FOR_DASHBOARD] || "Shapes",
                color: PREDEFINED_CATEGORY_COLORS[OTHERS_CATEGORY_NAME_FOR_DASHBOARD] || "hsl(var(--chart-1))",
            });
        } else {
            let totalForLainnyaCat = 0;
            const lainnyaCatFromDb = (userCategories || []).find(c => c.name === OTHERS_CATEGORY_NAME_FOR_DASHBOARD);
            if (lainnyaCatFromDb) {
                totalForLainnyaCat = spendingPerCategory[lainnyaCatFromDb.id] || 0;
            }
            allMonthlyExpensesRaw.push({
                categoryName: OTHERS_CATEGORY_NAME_FOR_DASHBOARD,
                totalAmount: totalForLainnyaCat,
                icon: CATEGORY_ICON_KEYS[OTHERS_CATEGORY_NAME_FOR_DASHBOARD] || "Shapes",
                color: PREDEFINED_CATEGORY_COLORS[OTHERS_CATEGORY_NAME_FOR_DASHBOARD] || "hsl(var(--chart-1))",
            });
        }
    }
    allMonthlyExpensesRaw = allMonthlyExpensesRaw.filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.categoryName === value.categoryName
        ))
    );

    const predefinedExpenses: MonthlyExpenseByCategory[] = [];
    const customExpenses: MonthlyExpenseByCategory[] = [];
    let othersExpense: MonthlyExpenseByCategory | null = null;

    allMonthlyExpensesRaw.forEach(expense => {
      if (expense.categoryName === OTHERS_CATEGORY_NAME_FOR_DASHBOARD) {
        othersExpense = expense;
      } else if (DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD.includes(expense.categoryName)) {
        predefinedExpenses.push(expense);
      } else {
        customExpenses.push(expense);
      }
    });

    predefinedExpenses.sort((a, b) => DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD.indexOf(a.categoryName) - DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD.indexOf(b.categoryName));
    customExpenses.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    let monthlyExpenses: MonthlyExpenseByCategory[] = [...predefinedExpenses, ...customExpenses];
    if (othersExpense) {
      monthlyExpenses.push(othersExpense);
    }

    const expenseChartData: ExpenseChartDataPoint[] = monthlyExpenses
      .filter(e => e.totalAmount > 0)
      .map(e => ({ name: e.categoryName, total: e.totalAmount }));

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
                scheduled_at: bill.scheduled_at || new Date().toISOString(),
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


export async function getBillDetailsAction(billId: string): Promise<{ success: boolean; data?: FetchedBillDetails; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, name, created_at, grand_total, tax_amount, tip_amount, payer_participant_id, tax_tip_split_strategy, scheduled_at')
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

    if (bill.grand_total === null && bill.scheduled_at && isFuture(parseISO(bill.scheduled_at))) {
        const emptySummary: DetailedBillSummaryData = {
            payerName: "Belum Ditentukan",
            taxAmount: 0,
            tipAmount: 0,
            personalTotalShares: {},
            detailedPersonalShares: [],
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

    // Step 1: Fetch participants with their profile_id
    const { data: participantsRawData, error: participantsFetchError } = await supabase
      .from('bill_participants')
      .select('id, name, total_share_amount, profile_id') // Assuming profile_id exists on bill_participants
      .eq('bill_id', billId);

    if (participantsFetchError) {
      console.error("Error fetching participants for bill (raw):", participantsFetchError);
      return { success: false, error: `Gagal mengambil partisipan (raw): ${participantsFetchError.message}` };
    }
    if (!participantsRawData) {
        return { success: false, error: "Tidak ada data partisipan yang ditemukan." };
    }

    // Step 2: Collect profile_ids
    const profileIds = participantsRawData
        .map(p => p.profile_id)
        .filter(id => id !== null) as string[];

    // Step 3: Fetch profiles if there are any profile_ids
    let profilesMap = new Map<string, { avatar_url: string | null }>();
    if (profileIds.length > 0) {
        const { data: profilesData, error: profilesFetchError } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', profileIds);

        if (profilesFetchError) {
            console.warn("Warning: Could not fetch profiles for participants:", profilesFetchError.message);
            // Continue, avatars will be null for these participants
        } else if (profilesData) {
            profilesData.forEach(profile => {
                profilesMap.set(profile.id, { avatar_url: profile.avatar_url });
            });
        }
    }

    // Step 4 & 5: Construct Person array with avatar_url
    const participants: Person[] = participantsRawData.map(p_raw => ({
        id: p_raw.id,
        name: p_raw.name,
        avatar_url: p_raw.profile_id ? (profilesMap.get(p_raw.profile_id)?.avatar_url || null) : null
    }));


    const { data: allBillItems, error: billItemsError } = await supabase
      .from('bill_items')
      .select('id, name, unit_price')
      .eq('bill_id', billId);

    if (billItemsError) {
      console.error("Error fetching bill items:", billItemsError);
      return { success: false, error: `Gagal mengambil item tagihan: ${billItemsError.message}` };
    }

    const { data: allItemAssignments, error: assignmentsError } = await supabase
      .from('item_assignments')
      .select('bill_item_id, participant_id, assigned_quantity')
      .in('bill_item_id', (allBillItems || []).map(item => item.id));

    if (assignmentsError) {
      console.error("Error fetching item assignments:", assignmentsError);
      return { success: false, error: `Gagal mengambil alokasi item: ${assignmentsError.message}` };
    }

    let payerName = "Tidak Diketahui";
    if (bill.payer_participant_id) {
      const payerRaw = participantsRawData.find(p => p.id === bill.payer_participant_id);
      if (payerRaw) payerName = payerRaw.name;
    }

    const personalTotalSharesFromDB: RawBillSummary = {};
    participantsRawData.forEach(p_raw => {
      personalTotalSharesFromDB[p_raw.name] = p_raw.total_share_amount ?? 0;
    });

    const detailedPersonalSharesData: PersonalShareDetail[] = [];
    const numParticipants = participantsRawData.length;

    for (const participantRaw of participantsRawData) {
      const personDetail: PersonalShareDetail = {
          personId: participantRaw.id,
          personName: participantRaw.name,
          items: [],
          taxShare: 0,
          tipShare: 0,
          subTotalFromItems: 0,
          totalShare: participantRaw.total_share_amount || 0,
      };

      const assignmentsForPerson = (allItemAssignments || []).filter(as => as.participant_id === participantRaw.id);
      for (const assignment of assignmentsForPerson) {
          const billItemData = (allBillItems || []).find(bi => bi.id === assignment.bill_item_id);
          if (billItemData) {
              const itemCost = (billItemData.unit_price || 0) * (assignment.assigned_quantity || 0);
              personDetail.items.push({
                  itemName: billItemData.name,
                  quantityConsumed: assignment.assigned_quantity || 0,
                  unitPrice: billItemData.unit_price || 0,
                  totalItemCost: itemCost,
              });
              personDetail.subTotalFromItems += itemCost;
          }
      }

      if (bill.tax_tip_split_strategy === "SPLIT_EQUALLY" && numParticipants > 0) {
          personDetail.taxShare = (bill.tax_amount || 0) / numParticipants;
          personDetail.tipShare = (bill.tip_amount || 0) / numParticipants;
      } else if (bill.tax_tip_split_strategy === "PAYER_PAYS_ALL") {
          if (participantRaw.id === bill.payer_participant_id) {
              personDetail.taxShare = bill.tax_amount || 0;
              personDetail.tipShare = bill.tip_amount || 0;
          }
      }
      detailedPersonalSharesData.push(personDetail);
    }

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
      personalTotalShares: personalTotalSharesFromDB,
      detailedPersonalShares: detailedPersonalSharesData,
      settlements: settlements,
      grandTotal: bill.grand_total || 0,
    };

    return {
      success: true,
      data: {
        billName: bill.name,
        createdAt: bill.created_at || new Date().toISOString(),
        summaryData,
        participants // This now contains Person objects with avatar_url
      }
    };

  } catch (e: any) {
    console.error("Exception in getBillDetailsAction:", e);
    return { success: false, error: e.message || "Terjadi kesalahan server saat mengambil detail tagihan." };
  }
}

// ===== FRIENDSHIP ACTIONS =====

export async function searchUsersAction(query: string): Promise<{ success: boolean; users?: UserProfileBasic[]; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  if (!query.trim()) {
    return { success: true, users: [] };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', currentUser.id) // Exclude current user
      .limit(10);

    if (error) throw error;
    return { success: true, users: data as UserProfileBasic[] };
  } catch (e: any) {
    console.error("Error searching users:", e);
    return { success: false, error: e.message || "Gagal mencari pengguna." };
  }
}

export async function sendFriendRequestAction(receiverId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: requester }, error: authError } = await supabase.auth.getUser();

  if (authError || !requester) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }
  if (requester.id === receiverId) {
    return { success: false, error: "Anda tidak dapat mengirim permintaan pertemanan ke diri sendiri." };
  }

  try {
    // Check if already friends
    const { data: existingFriendship, error: friendshipCheckError } = await supabase
      .from('friendships')
      .select('id')
      .or(`user1_id.eq.${requester.id},user2_id.eq.${requester.id}`)
      .or(`user1_id.eq.${receiverId},user2_id.eq.${receiverId}`)
      .eq('user1_id', requester.id < receiverId ? requester.id : receiverId) // Simplified check
      .eq('user2_id', requester.id < receiverId ? receiverId : requester.id)
      .maybeSingle();

    if (friendshipCheckError) throw friendshipCheckError;
    if (existingFriendship) return { success: false, error: "Anda sudah berteman dengan pengguna ini." };


    // Check for existing pending request (either way)
    const { data: existingRequest, error: requestCheckError } = await supabase
        .from('friend_requests')
        .select('id, status, requester_id')
        .or(`and(requester_id.eq.${requester.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requester.id})`)
        .in('status', ['pending', 'accepted']) // 'accepted' means friendship should exist, but check as safeguard
        .maybeSingle();


    if (requestCheckError) throw requestCheckError;

    if (existingRequest) {
        if (existingRequest.status === 'pending') {
            if (existingRequest.requester_id === requester.id) {
                return { success: false, error: "Anda sudah mengirim permintaan ke pengguna ini." };
            } else {
                return { success: false, error: "Pengguna ini sudah mengirim permintaan kepada Anda. Silakan cek permintaan masuk." };
            }
        }
        if (existingRequest.status === 'accepted') {
             return { success: false, error: "Anda sudah berteman (berdasarkan status permintaan sebelumnya)." };
        }
    }


    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert({ requester_id: requester.id, receiver_id: receiverId, status: 'pending' });

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
            return { success: false, error: "Permintaan pertemanan sudah ada atau Anda sudah berteman." };
        }
        throw insertError;
    }
    revalidatePath('/app/social', 'page');
    return { success: true };
  } catch (e: any) {
    console.error("Error sending friend request:", e);
    return { success: false, error: e.message || "Gagal mengirim permintaan pertemanan." };
  }
}

export async function getFriendRequestsAction(): Promise<{ success: boolean; requests?: FriendRequestDisplay[]; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        requester_id,
        created_at,
        status,
        profile:profiles!friend_requests_requester_id_fkey (id, username, full_name, avatar_url)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const requests: FriendRequestDisplay[] = data.map(req => ({
      requestId: req.id,
      id: (req.profile as UserProfileBasic).id,
      username: (req.profile as UserProfileBasic).username,
      fullName: (req.profile as UserProfileBasic).full_name,
      avatarUrl: (req.profile as UserProfileBasic).avatar_url,
      requestedAt: req.created_at,
      status: req.status as FriendRequestDisplay['status'],
    }));
    return { success: true, requests };
  } catch (e: any) {
    console.error("Error fetching friend requests:", e);
    return { success: false, error: e.message || "Gagal mengambil permintaan pertemanan." };
  }
}


export async function acceptFriendRequestAction(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  try {
    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .select('requester_id, receiver_id, status')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error(requestError?.message || "Permintaan tidak ditemukan.");
    }
    if (request.receiver_id !== currentUser.id) {
      return { success: false, error: "Anda tidak berhak menerima permintaan ini." };
    }
    if (request.status !== 'pending') {
      return { success: false, error: "Permintaan ini sudah tidak pending." };
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (updateError) throw updateError;

    // Create friendship
    const user1_id = request.requester_id < request.receiver_id ? request.requester_id : request.receiver_id;
    const user2_id = request.requester_id < request.receiver_id ? request.receiver_id : request.requester_id;

    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert({ user1_id: user1_id, user2_id: user2_id });
    if (friendshipError) {
        if (friendshipError.code === '23505') { // unique_violation for uq_friendship_pair
             console.warn("Friendship already exists, but request was pending. Proceeding.");
        } else {
            // Rollback request status update if friendship creation fails for other reasons? Complex.
            // For now, log and report.
            console.error("Error creating friendship after accepting request:", friendshipError);
            // Attempt to revert request status for consistency, though this might also fail.
            await supabase.from('friend_requests').update({ status: 'pending' }).eq('id', requestId);
            return { success: false, error: `Gagal membuat pertemanan: ${friendshipError.message}` };
        }
    }
    revalidatePath('/app/social', 'page');
    return { success: true };
  } catch (e: any) {
    console.error("Error accepting friend request:", e);
    return { success: false, error: e.message || "Gagal menerima permintaan pertemanan." };
  }
}

export async function declineOrCancelFriendRequestAction(requestId: string, actionType: 'decline' | 'cancel'): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }
  try {
    const { data: request, error: requestError } = await supabase
        .from('friend_requests')
        .select('requester_id, receiver_id, status')
        .eq('id', requestId)
        .single();

    if (requestError || !request) throw new Error(requestError?.message || "Permintaan tidak ditemukan.");

    let newStatus: 'declined' | 'cancelled';
    if (actionType === 'decline') {
        if (request.receiver_id !== currentUser.id) return { success: false, error: "Anda tidak berhak menolak permintaan ini." };
        newStatus = 'declined';
    } else { // cancel
        if (request.requester_id !== currentUser.id) return { success: false, error: "Anda tidak berhak membatalkan permintaan ini." };
        newStatus = 'cancelled';
    }

    if (request.status !== 'pending') return { success: false, error: "Permintaan ini sudah tidak tertunda." };

    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) throw updateError;
    revalidatePath('/app/social', 'page');
    return { success: true };
  } catch (e: any) {
    console.error(`Error ${actionType === 'decline' ? 'declining' : 'cancelling'} friend request:`, e);
    return { success: false, error: e.message || `Gagal ${actionType === 'decline' ? 'menolak' : 'membatalkan'} permintaan.` };
  }
}

export async function getFriendsAction(): Promise<{ success: boolean; friends?: FriendDisplay[]; error?: string }> {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
        return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    try {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                created_at,
                user1:profiles!friendships_user1_id_fkey (id, username, full_name, avatar_url),
                user2:profiles!friendships_user2_id_fkey (id, username, full_name, avatar_url)
            `)
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

        if (error) throw error;

        const friends: FriendDisplay[] = data.map(f => {
            const friendProfile = f.user1_id === currentUser.id ? f.user2 as UserProfileBasic : f.user1 as UserProfileBasic;
            return {
                friendshipId: f.id,
                id: friendProfile.id,
                username: friendProfile.username,
                fullName: friendProfile.full_name,
                avatarUrl: friendProfile.avatar_url,
                since: f.created_at,
            };
        }).sort((a,b) => (a.fullName || a.username || "").localeCompare(b.fullName || b.username || ""));

        return { success: true, friends };
    } catch (e: any) {
        console.error("Error fetching friends:", e);
        return { success: false, error: e.message || "Gagal mengambil daftar teman." };
    }
}

export async function removeFriendAction(friendshipId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
        return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    try {
        // Optional: Verify the current user is part of this friendship before deleting
        const { data: friendship, error: fetchError } = await supabase
            .from('friendships')
            .select('user1_id, user2_id')
            .eq('id', friendshipId)
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
            .single();

        if (fetchError || !friendship) {
            return { success: false, error: "Pertemanan tidak ditemukan atau Anda tidak berhak menghapusnya." };
        }

        const { error: deleteError } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);

        if (deleteError) throw deleteError;
        revalidatePath('/app/social', 'page');
        return { success: true };
    } catch (e: any) {
        console.error("Error removing friend:", e);
        return { success: false, error: e.message || "Gagal menghapus teman." };
    }
}

