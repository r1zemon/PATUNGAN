
"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy, ScannedItem, BillHistoryEntry, BillCategory, DashboardData, MonthlyExpenseByCategory, ExpenseChartDataPoint, RecentBillDisplayItem, ScheduledBillDisplayItem, FetchedBillDetails, Settlement, FetchedBillDetailsWithItems, PersonalShareDetail, UserProfileBasic, FriendRequestDisplay, FriendDisplay, SettlementStatus, BillInvitation } from "./types";
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
    return { user: null, profile: null, error: "Gagal memuat sesi pengguna: " + authError.message };
  }
  if (!user) {
    return { user: null, profile: null };
  }

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: No rows found
      console.error("Error fetching profile for user:", user.id, profileError.message);
      return { user: user, profile: null, error: "Gagal mengambil profil: " + profileError.message };
    }
    return { user: user, profile: profileData as UserProfileBasic | null };
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
  scheduledAt?: string | null
): Promise<{ success: boolean; billId?: string; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } , error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
       return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    const billInsertData: Database['public']['Tables']['bills']['Insert'] = {
      name: billName || "Tagihan Baru",
      user_id: user.id,
      category_id: categoryId,
      scheduled_at: scheduledAt || null,
      is_still_editing: true, // New bill starts in editing mode
    };

    const { data: billData, error: billInsertError } = await supabase
      .from('bills')
      .insert([billInsertData])
      .select('id')
      .single();

    if (billInsertError) {
      return { success: false, error: "Gagal membuat tagihan: " + billInsertError.message };
    }
    if (!billData || !billData.id) {
      return { success: false, error: "Gagal mendapatkan ID tagihan." };
    }

    // Automatically add the creator as a participant
    await addParticipantAction(billData.id, user.user_metadata.full_name || user.email || 'Creator', user.id);
    
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
    // A registered user is instantly 'joined'. A guest is instantly 'joined'.
    // Only an invited user who is not the creator starts as 'invited'.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    const status: 'invited' | 'joined' = profileId === user.id || !profileId ? 'joined' : 'invited';
    
    const insertData: Database['public']['Tables']['bill_participants']['Insert'] = {
      bill_id: billId,
      name: personName.trim(),
      profile_id: profileId || null,
      status: status,
    };

    const { data, error } = await supabase
      .from('bill_participants')
      .insert([insertData])
      .select('id, name, profile_id, status, created_at')
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
      status: data.status as 'joined' | 'invited',
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
): Promise<{ success: boolean; data?: { items: ScannedItem[] }; error?: string }> {
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

      if (itemsToInsert.length === 0) {
        return { success: true, data: { items: [] } };
      }

      const { data: insertedDbItems, error: insertError } = await supabase
        .from('bill_items')
        .insert(itemsToInsert)
        .select('id, name, unit_price, quantity');

      if (insertError) {
        return { success: false, error: "Gagal menyimpan item ke database: " + insertError.message };
      }
      if (!insertedDbItems) {
        return { success: false, error: "Gagal mendapatkan data item setelah disimpan." };
      }

      const appItems: ScannedItem[] = insertedDbItems.map(dbItem => ({
        id: dbItem.id,
        name: dbItem.name,
        unitPrice: dbItem.unit_price,
        quantity: dbItem.quantity,
      }));

      return { success: true, data: { items: appItems } };
    } else {
      return { success: false, error: "Menerima data tak terduga dari pemindai." };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan server tak terduga.";
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

  const joinedPeople = people.filter(p => p.status === 'joined');
  if (joinedPeople.length < 1) {
    return { success: false, error: "Minimal satu partisipan diperlukan." };
  }
  
  const payer = joinedPeople.find(p => p.id === payerParticipantId);
  if (!payer) {
    return { success: false, error: "Data pembayar tidak valid." };
  }

  const itemsForAI: SummarizeBillInput["items"] = splitItems.map(item => ({
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    assignedTo: item.assignedTo.map(assignment => {
      const participant = joinedPeople.find(p => p.id === assignment.personId);
      return {
        personName: participant?.name || "Unknown Person",
        count: assignment.count,
      };
    }).filter(a => a.personName !== "Unknown Person" && a.count > 0),
  })).filter(item => item.quantity > 0 && item.unitPrice >= 0);

  const summarizeBillInput: SummarizeBillInput = {
    items: itemsForAI,
    people: joinedPeople.map(p => p.name),
    payerName: payer.name,
    taxAmount, tipAmount, taxTipSplitStrategy,
  };

  try {
    const rawSummary: RawBillSummary = await summarizeBill(summarizeBillInput);

    let calculatedGrandTotal = 0;
    const participantUpdatePromises = joinedPeople.map(async (person) => {
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
        is_still_editing: false, // Mark editing as finished
    }).eq('id', billId);

    await supabase.from('settlements').delete().eq('bill_id', billId);

    const settlementInserts = joinedPeople
      .filter(p => p.id !== payerParticipantId && (rawSummary[p.name] ?? 0) > 0)
      .map(p => ({
          bill_id: billId,
          from_participant_id: p.id,
          to_participant_id: payerParticipantId,
          amount: rawSummary[p.name],
          status: 'unpaid' as const,
      }));

    if (settlementInserts.length > 0) {
      await supabase.from('settlements').insert(settlementInserts);
    }

    revalidatePath('/', 'page');
    revalidatePath('/app/history', 'page');
    return { success: true, data: rawSummary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan server tak terduga.";
    return { success: false, error: `Gagal meringkas tagihan: ${message}` };
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
        .eq('bill_id', bill.id)
        .eq('status', 'joined');
      
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

// ===== DASHBOARD ACTIONS =====
const CATEGORY_ICON_KEYS: { [key: string]: string } = { "Makanan": "Utensils", "Transportasi": "Car", "Hiburan": "Gamepad2", "Penginapan": "BedDouble", "Belanja Online": "ShoppingBag", "Lainnya": "Shapes" };
const PREDEFINED_CATEGORY_COLORS: { [key: string]: string } = { "Makanan": "hsl(var(--chart-1))", "Transportasi": "hsl(var(--chart-2))", "Hiburan": "hsl(var(--chart-3))", "Penginapan": "hsl(var(--chart-4))", "Belanja Online": "hsl(var(--chart-5))", "Lainnya": "hsl(var(--chart-5))" };
const DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD = ["Makanan", "Transportasi", "Hiburan", "Penginapan"];
const OTHERS_CATEGORY_NAME_FOR_DASHBOARD = "Lainnya";


export async function getDashboardDataAction(): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pengguna tidak terautentikasi." };

  try {
    const { data: userCategories } = await supabase.from('bill_categories').select('id, name').eq('user_id', user.id);
    const now = new Date();
    const startDate = format(startOfMonth(now), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const endDate = format(endOfMonth(now), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const { data: monthlyBillData } = await supabase.from('bills').select('category_id, grand_total').eq('user_id', user.id).not('grand_total', 'is', null).gte('created_at', startDate).lte('created_at', endDate);

    const spendingPerCategory: Record<string, number> = {};
    if (monthlyBillData) {
      for (const bill of monthlyBillData) {
        if (bill.category_id && bill.grand_total !== null) {
          spendingPerCategory[bill.category_id] = (spendingPerCategory[bill.category_id] || 0) + bill.grand_total;
        }
      }
    }
    
    let allMonthlyExpensesRaw: MonthlyExpenseByCategory[] = (userCategories || []).map(category => ({
        categoryName: category.name,
        totalAmount: spendingPerCategory[category.id] || 0,
        icon: CATEGORY_ICON_KEYS[category.name] || "Shapes",
        color: PREDEFINED_CATEGORY_COLORS[category.name] || "hsl(var(--chart-1))",
    }));

    // Sorting logic remains same
    const predefinedExpenses: MonthlyExpenseByCategory[] = [];
    const customExpenses: MonthlyExpenseByCategory[] = [];
    let othersExpense: MonthlyExpenseByCategory | null = null;
    allMonthlyExpensesRaw.forEach(expense => {
      if (expense.categoryName === OTHERS_CATEGORY_NAME_FOR_DASHBOARD) othersExpense = expense;
      else if (DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD.includes(expense.categoryName)) predefinedExpenses.push(expense);
      else customExpenses.push(expense);
    });
    predefinedExpenses.sort((a, b) => DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD.indexOf(a.categoryName) - DEFAULT_CATEGORY_ORDER_FOR_DASHBOARD.indexOf(b.categoryName));
    customExpenses.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    let monthlyExpenses: MonthlyExpenseByCategory[] = [...predefinedExpenses, ...customExpenses];
    if (othersExpense) monthlyExpenses.push(othersExpense);

    const expenseChartData: ExpenseChartDataPoint[] = monthlyExpenses.filter(e => e.totalAmount > 0).map(e => ({ name: e.categoryName, total: e.totalAmount }));

    const { data: dbRecentBills } = await supabase.from('bills').select('id, name, created_at, grand_total, bill_categories ( name )').eq('user_id', user.id).not('grand_total', 'is', null).order('created_at', { ascending: false }).limit(3);
    const recentBills: RecentBillDisplayItem[] = [];
    if (dbRecentBills) {
        for (const bill of dbRecentBills) {
            const { count: participantCount } = await supabase.from('bill_participants').select('*', { count: 'exact', head: true }).eq('bill_id', bill.id);
            recentBills.push({ id: bill.id, name: bill.name, createdAt: bill.created_at!, grandTotal: bill.grand_total!, categoryName: (bill.bill_categories as any)?.name, participantCount: participantCount! });
        }
    }

    const { data: dbScheduledBills } = await supabase.from('bills').select('id, name, scheduled_at, bill_categories ( name )').eq('user_id', user.id).is('grand_total', null).not('scheduled_at', 'is', null).gt('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(3);
    const scheduledBills: ScheduledBillDisplayItem[] = [];
    if (dbScheduledBills) {
        for (const bill of dbScheduledBills) {
             const { count: participantCount } = await supabase.from('bill_participants').select('*', { count: 'exact', head: true }).eq('bill_id', bill.id);
            scheduledBills.push({ id: bill.id, name: bill.name, scheduled_at: bill.scheduled_at!, categoryName: (bill.bill_categories as any)?.name, participantCount: participantCount! });
        }
    }
    revalidatePath('/', 'page');
    return { success: true, data: { monthlyExpenses, expenseChartData, recentBills, scheduledBills } };
  } catch (e: any) {
    return { success: false, error: e.message || "Kesalahan server saat mengambil data dashboard." };
  }
}


export async function getBillDetailsAction(billId: string): Promise<{ success: boolean; data?: FetchedBillDetailsWithItems; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pengguna tidak terautentikasi." };

  try {
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, name, user_id, created_at, grand_total, tax_amount, tip_amount, payer_participant_id, tax_tip_split_strategy, scheduled_at, is_still_editing')
      .eq('id', billId)
      .single();
    if (billError) return { success: false, error: "Gagal mengambil detail tagihan: " + billError.message };

    const { data: participantsRaw, error: pError } = await supabase.from('bill_participants').select('id, name, profile_id, avatar_url, status, total_share_amount').eq('bill_id', billId);
    if (pError) return { success: false, error: "Gagal mengambil partisipan: " + pError.message };

    const { data: itemsRaw, error: iError } = await supabase.from('bill_items').select('id, name, unit_price, quantity').eq('bill_id', billId);
    if (iError) return { success: false, error: "Gagal mengambil item: " + iError.message };

    const { data: assignmentsRaw, error: aError } = await supabase.from('item_assignments').select('bill_item_id, participant_id, assigned_quantity').in('bill_item_id', itemsRaw.map(i => i.id));
    if (aError) return { success: false, error: "Gagal mengambil alokasi: " + aError.message };
    
    const participants: Person[] = participantsRaw.map(p => ({
        id: p.id,
        name: p.name,
        profile_id: p.profile_id,
        avatar_url: p.avatar_url,
        status: p.status as 'joined' | 'invited'
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
    
    // Build summary data if not in editing mode
    let summaryData: FetchedBillDetails['summaryData'] | null = null;
    if (!bill.is_still_editing) {
       const { data: settlementsData, error: settlementsError } = await supabase
          .from('settlements')
          .select('amount, status, from_participant:bill_participants!from_participant_id(id, name), to_participant:bill_participants!to_participant_id(id, name)')
          .eq('bill_id', billId);

        const settlements: Settlement[] = (settlementsData || []).map(s => ({
            fromId: (s.from_participant as any)?.id, from: (s.from_participant as any)?.name,
            toId: (s.to_participant as any)?.id, to: (s.to_participant as any)?.name,
            amount: s.amount, status: s.status as SettlementStatus,
        }));
        
        summaryData = {
            payerId: bill.payer_participant_id,
            payerName: payerName,
            taxAmount: bill.tax_amount || 0,
            tipAmount: bill.tip_amount || 0,
            taxTipSplitStrategy: bill.tax_tip_split_strategy as TaxTipSplitStrategy,
            settlements: settlements,
            grandTotal: bill.grand_total || 0,
            isStillEditing: bill.is_still_editing || false
        };
    } else {
        summaryData = {
            payerId: bill.payer_participant_id, payerName,
            taxAmount: bill.tax_amount || 0, tipAmount: bill.tip_amount || 0,
            taxTipSplitStrategy: bill.tax_tip_split_strategy as TaxTipSplitStrategy,
            settlements: [], grandTotal: bill.grand_total || 0,
            isStillEditing: true
        };
    }

    return { success: true, data: { billName: bill.name, createdAt: bill.created_at!, participants, items, summaryData, ownerId: bill.user_id } };
  } catch (e: any) {
    return { success: false, error: e.message || "Kesalahan server saat mengambil detail." };
  }
}

// ... existing friendship actions ...
export async function searchUsersAction(query: string): Promise<{ success: boolean; users?: UserProfileBasic[]; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: "Pengguna tidak terautentikasi." };
  if (!query.trim()) return { success: true, users: [] };

  try {
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').or(`username.ilike.%${query}%,full_name.ilike.%${query}%`).neq('id', currentUser.id).limit(10);
    return { success: true, users: data as UserProfileBasic[] };
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mencari pengguna." };
  }
}

export async function sendFriendRequestAction(receiverId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: requester } } = await supabase.auth.getUser();
  if (!requester) return { success: false, error: "Pengguna tidak terautentikasi." };
  if (requester.id === receiverId) return { success: false, error: "Anda tidak dapat mengirim permintaan ke diri sendiri." };

  try {
    const { data: existingFriendship } = await supabase.from('friendships').select('id').or(`and(user1_id.eq.${requester.id},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${requester.id})`).maybeSingle();
    if (existingFriendship) return { success: false, error: "Anda sudah berteman." };

    const { data: existingRequest } = await supabase.from('friend_requests').select('id, status, requester_id').or(`and(requester_id.eq.${requester.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requester.id})`).in('status', ['pending']).maybeSingle();
    if (existingRequest) return { success: false, error: "Permintaan sudah ada." };

    await supabase.from('friend_requests').insert({ requester_id: requester.id, receiver_id: receiverId, status: 'pending' });
    revalidatePath('/app/social', 'page');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mengirim permintaan." };
  }
}

export async function getFriendRequestsAction(): Promise<{ success: boolean; requests?: FriendRequestDisplay[]; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pengguna tidak terautentikasi." };

  try {
    const { data } = await supabase.from('friend_requests').select(`id, created_at, status, profile:requester_id(id, username, full_name, avatar_url)`).eq('receiver_id', user.id).eq('status', 'pending').order('created_at', { ascending: false });
    if (!data) return { success: true, requests: [] };

    const requests: FriendRequestDisplay[] = data.filter(req => req.profile).map(req => {
        const profile = req.profile as UserProfileBasic;
        return { requestId: req.id, id: profile.id, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url, requestedAt: req.created_at, status: req.status as FriendRequestDisplay['status'] };
    });
    return { success: true, requests };
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mengambil permintaan." };
  }
}

export async function acceptFriendRequestAction(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: "Pengguna tidak terautentikasi." };

  try {
    const { data: request, error: requestError } = await supabase.from('friend_requests').select('requester_id, receiver_id, status').eq('id', requestId).single();
    if (requestError || !request) throw new Error(requestError?.message || "Permintaan tidak ditemukan.");
    if (request.receiver_id !== currentUser.id) return { success: false, error: "Anda tidak berhak." };
    if (request.status !== 'pending') return { success: false, error: "Permintaan sudah tidak pending." };

    await supabase.from('friend_requests').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', requestId);
    await supabase.from('friendships').insert({ user1_id: request.requester_id, user2_id: request.receiver_id });

    revalidatePath('/app/social', 'page');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal menerima permintaan." };
  }
}

export async function declineOrCancelFriendRequestAction(requestId: string, actionType: 'decline' | 'cancel'): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: "Pengguna tidak terautentikasi." };

  try {
    const { data: request, error: requestError } = await supabase.from('friend_requests').select('requester_id, receiver_id, status').eq('id', requestId).single();
    if (requestError || !request) throw new Error(requestError?.message || "Permintaan tidak ditemukan.");

    let newStatus: 'declined' | 'cancelled';
    if (actionType === 'decline') {
        if (request.receiver_id !== currentUser.id) return { success: false, error: "Tidak berhak." };
        newStatus = 'declined';
    } else {
        if (request.requester_id !== currentUser.id) return { success: false, error: "Tidak berhak." };
        newStatus = 'cancelled';
    }
    if (request.status !== 'pending') return { success: false, error: "Permintaan sudah tidak pending." };

    await supabase.from('friend_requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', requestId);
    revalidatePath('/app/social', 'page');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal." };
  }
}

export async function getFriendsAction(): Promise<{ success: boolean; friends?: FriendDisplay[]; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: "Pengguna tidak terautentikasi." };
  try {
    const { data } = await supabase.from('friendships').select(`id, created_at, user1:user1_id(id, username, full_name, avatar_url), user2:user2_id(id, username, full_name, avatar_url)`).or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`).order('created_at', { ascending: false });
    if (!data) return { success: true, friends: [] };

    const friends: FriendDisplay[] = data.filter(f => f.user1 && f.user2).map(f => {
        const friendProfile = (f.user1 as UserProfileBasic).id === currentUser.id ? f.user2 as UserProfileBasic : f.user1 as UserProfileBasic;
        return { friendshipId: f.id, id: friendProfile.id, username: friendProfile.username, full_name: friendProfile.full_name, avatar_url: friendProfile.avatar_url, since: f.created_at };
    });
    return { success: true, friends };
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mengambil teman." };
  }
}

export async function removeFriendAction(friendshipId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: "Pengguna tidak terautikentikasi." };

  try {
    const { data: friendship } = await supabase.from('friendships').select('user1_id, user2_id').eq('id', friendshipId).or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`).single();
    if (!friendship) throw new Error("Pertemanan tidak ditemukan.");
    
    await supabase.from('friendships').delete().eq('id', friendshipId);
    revalidatePath('/app/social', 'page');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal menghapus teman." };
  }
}

// ===== BILL INVITATION ACTIONS =====

export async function getPendingInvitationsAction(): Promise<{ success: boolean; invitations?: BillInvitation[]; error?: string }> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Pengguna tidak terautentikasi." };
    
    try {
        const { data: invitationsData } = await supabase.from('bill_participants').select('id, created_at, bill_id').eq('profile_id', user.id).eq('status', 'invited');
        if (!invitationsData || invitationsData.length === 0) return { success: true, invitations: [] };

        const billIds = invitationsData.map(inv => inv.bill_id);
        const { data: billsData } = await supabase.from('bills').select('id, name, user_id').in('id', billIds);

        const inviterIds = (billsData || []).map(bill => bill.user_id).filter((id): id is string => !!id);
        let inviterProfiles: Map<string, string> = new Map();
        if (inviterIds.length > 0) {
            const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', inviterIds);
            if (profilesData) {
                profilesData.forEach(profile => {
                    inviterProfiles.set(profile.id, profile.full_name || 'Seseorang');
                });
            }
        }
        
        const finalInvitations: BillInvitation[] = invitationsData.map(invitation => {
            const bill = (billsData || []).find(b => b.id === invitation.bill_id);
            const inviterName = bill && bill.user_id ? (inviterProfiles.get(bill.user_id) || 'Seseorang') : 'Seseorang';
            return {
                participantId: invitation.id,
                billId: invitation.bill_id,
                billName: bill?.name || 'Tagihan Dihapus',
                inviterName: inviterName,
                createdAt: invitation.created_at
            };
        }).filter(inv => inv.billId);

        return { success: true, invitations: finalInvitations };
    } catch (e: any) {
        return { success: false, error: "Kesalahan server: " + e.message };
    }
}

export async function respondToBillInvitationAction(participantId: string, response: 'accept' | 'decline'): Promise<{ success: boolean; error?: string }> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Pengguna tidak terautentikasi." };

    try {
        const { data: participant, error: fetchError } = await supabase.from('bill_participants').select('profile_id').eq('id', participantId).eq('status', 'invited').single();
        if (fetchError || !participant) return { success: false, error: "Undangan tidak ditemukan." };
        if (participant.profile_id !== user.id) return { success: false, error: "Anda tidak berhak." };

        if (response === 'accept') {
            await supabase.from('bill_participants').update({ status: 'joined' }).eq('id', participantId);
        } else {
            await supabase.from('bill_participants').delete().eq('id', participantId);
        }
        
        revalidatePath('/app'); 
        revalidatePath('/app/notifications'); 
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Kesalahan server: " + e.message };
    }
}
