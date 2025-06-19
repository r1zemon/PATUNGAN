
"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy, ScannedItem, BillHistoryEntry } from "./types";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PostgrestSingleResponse, User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from '@/lib/database.types';

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

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        full_name: fullName,
        username: username,
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

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ 
      id: authData.user.id, 
      full_name: fullName,
      username: username,
      email: email, 
      phone_number: phoneNumber || null
    });

  if (profileError) {
    console.error("Error creating profile:", profileError);
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authData.user.id);
    if (deleteUserError) {
        console.error("Error deleting auth user after profile creation failure:", deleteUserError);
         return { success: false, error: `Pengguna berhasil dibuat di auth, tetapi gagal membuat profil: ${profileError.message}. Gagal menghapus pengguna auth setelahnya: ${deleteUserError.message}` };
    }
    return { success: false, error: `Pengguna berhasil dibuat di auth, tetapi gagal membuat profil: ${profileError.message}. Pengguna auth telah dihapus.` };
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
  revalidatePath('/app', 'page'); 
  revalidatePath('/app', 'layout'); 
  revalidatePath('/login', 'page');
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
  
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { 
    console.error("Error fetching profile for user:", user.id, profileError.message);
    return { user: user, profile: null, error: `Gagal mengambil profil: ${profileError.message}` };
  }

  return { user: user, profile: profileData };
}


export async function logoutUserAction() {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/', 'layout');
  revalidatePath('/app', 'page'); 
  revalidatePath('/app', 'layout'); 
  revalidatePath('/login', 'page');
  return { success: true };
}


export async function createBillAction(
  billName: string, 
  scheduledAt?: string | null
): Promise<{ success: boolean; billId?: string; error?: string }> {
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
  return { success: true, billId: billData.id };
}

export async function addParticipantAction(billId: string, personName: string): Promise<{ success: boolean; person?: Person; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!billId || !personName.trim()) {
    return { success: false, error: "Bill ID and person name are required." };
  }

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
}

export async function removeParticipantAction(participantId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!participantId) {
    return { success: false, error: "Participant ID is required." };
  }

  const { error } = await supabase
    .from('bill_participants')
    .delete()
    .eq('id', participantId);

  if (error) {
    console.error("Error removing participant:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}


export async function handleScanReceiptAction(
  receiptDataUri: string
): Promise<{ success: boolean; data?: { items: ScannedItem[] }; error?: string }> { 
  if (!receiptDataUri) {
    return { success: false, error: "Tidak ada data gambar struk." };
  }

  if (!receiptDataUri.startsWith("data:image/")) {
    return { success: false, error: "Format data gambar tidak valid." };
  }
  console.log("handleScanReceiptAction (server): Received data URI (first 100 chars):", receiptDataUri.substring(0, 100));

  try {
    const result: ScanReceiptOutput = await scanReceipt({ receiptDataUri });
    
    if (result && result.items !== undefined) {
      const appItems: ScannedItem[] = result.items.map((item: AiReceiptItem, index: number) => ({ 
        id: `scanned_${Date.now()}_${index}`, 
        name: item.name || "Item Tidak Dikenal",
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        quantity: (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1,
      }));
      console.log(`handleScanReceiptAction (server): Scan successful, ${appItems.length} items mapped.`);
      return { success: true, data: { items: appItems } };
    } else {
      console.error("handleScanReceiptAction (server): scanReceipt returned an unexpected structure:", result);
      return { success: false, error: "Menerima data tak terduga dari pemindai. Silakan coba lagi." };
    }
  } catch (error) { 
    console.error("handleScanReceiptAction (server): Critical error during scanReceipt call:", error);
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
    const updatesForDB: Partial<Database['public']['Tables']['profiles']['Update']> = {};
    let hasProfileDetailChanges = false;
    let avatarUrlChangedOrUploaded = false;
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

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      // Path construction consistent with RLS policy: public/avatars/<user_id>/filename.ext
      const filePath = `public/avatars/${userId}/avatar.${fileExt}`; 

      const { error: uploadError } = await supabase.storage
        .from('avatars') 
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true, 
        });

      if (uploadError) {
        console.error("Error uploading avatar:", uploadError);
        errorMessages.push(`Gagal mengunggah avatar: ${uploadError.message}`);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('avatars') 
          .getPublicUrl(filePath); 

        if (publicUrlData) {
          updatesForDB.avatar_url = publicUrlData.publicUrl;
          avatarUrlChangedOrUploaded = true;
        } else {
          // This case should ideally not happen if upload was successful and path is correct.
          // If getPublicUrl itself returns an error object, it's usually indicative of a problem.
          console.warn("getPublicUrl did not return data for a supposedly successful upload:", filePath);
          errorMessages.push('Gagal mendapatkan URL publik avatar setelah unggah. File mungkin terunggah tapi URL tidak bisa diambil.');
        }
      }
    } else if (profileUpdates.avatar_url !== undefined && profileUpdates.avatar_url !== (currentProfileData?.avatar_url || null)) {
      updatesForDB.avatar_url = profileUpdates.avatar_url; 
      avatarUrlChangedOrUploaded = true;
    }

    if (profileUpdates.full_name !== undefined && profileUpdates.full_name !== (currentProfileData?.full_name || "")) {
      updatesForDB.full_name = profileUpdates.full_name;
      hasProfileDetailChanges = true;
    }
    if (profileUpdates.username !== undefined && profileUpdates.username !== (currentProfileData?.username || "")) {
      updatesForDB.username = profileUpdates.username;
      hasProfileDetailChanges = true;
    }
    if (profileUpdates.phone_number !== undefined && profileUpdates.phone_number !== (currentProfileData?.phone_number || null)) {
      updatesForDB.phone_number = profileUpdates.phone_number;
      hasProfileDetailChanges = true;
    }

    if (!hasProfileDetailChanges && !avatarUrlChangedOrUploaded && errorMessages.length === 0) {
      return { success: true, data: currentProfileData, error: "Tidak ada perubahan untuk disimpan." };
    }
    if (!hasProfileDetailChanges && !avatarUrlChangedOrUploaded && errorMessages.length > 0) {
       return { success: false, data: currentProfileData, error: errorMessages.join('; ') };
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
        errorMessages.push(`Gagal memperbarui profil di database: ${dbUpdateError.message}`);
        return { success: false, data: currentProfileData, error: errorMessages.join('; ') };
      }
      
      if (errorMessages.length > 0) { // Errors from avatar upload, but DB update was successful
          return { success: false, data: updatedProfile || currentProfileData, error: errorMessages.join('; ') };
      }

      revalidatePath('/app', 'layout'); 
      revalidatePath('/app/profile', 'page');
      revalidatePath('/app/history', 'page');
      revalidatePath('/', 'layout'); 
      
      return { success: true, data: updatedProfile, error: undefined };
    } else if (errorMessages.length > 0) { // Only avatar upload errors, no other profile changes to make
       return { success: false, data: currentProfileData, error: errorMessages.join('; ') };
    }
    
    // Should not be reached if logic is correct, but as a fallback.
    return { success: true, data: currentProfileData, error: "Tidak ada operasi pembaruan yang dilakukan atau hanya ada error dari unggah avatar." };

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

        // Path should be like: public/avatars/<user_id>/avatar.ext
        // Example URL: https://<ref>.supabase.co/storage/v1/object/public/avatars/public/avatars/<user_id>/avatar.ext
        // We need to extract "public/avatars/<user_id>/avatar.ext" for the remove operation.
        const storagePathPrefix = `/storage/v1/object/public/avatars/`;
        let filePathInBucket = "";

        if (currentProfile.avatar_url.includes(storagePathPrefix)) {
            filePathInBucket = currentProfile.avatar_url.split(storagePathPrefix)[1];
        } else {
            console.warn("Could not parse avatar_url to get storage path with standard prefix:", currentProfile.avatar_url);
            // Fallback: try to clear DB link only if parsing fails badly
            const { error: dbOnlyError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', userId);
            if (dbOnlyError) {
                return { success: false, error: `Format URL avatar tidak dikenali dan gagal menghapus dari database: ${dbOnlyError.message}` };
            }
            revalidatePath('/app/profile', 'page');
            revalidatePath('/', 'layout');
            return { success: true, data: { avatar_url: null } }; 
        }
        
        if (!filePathInBucket) {
             console.warn("filePathInBucket is empty after parsing, attempting to clear DB link only for URL:", currentProfile.avatar_url);
             // Similar to above, just clear DB
            const { error: dbOnlyError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', userId);
            if (dbOnlyError) {
                return { success: false, error: `Path file avatar kosong setelah parsing dan gagal menghapus dari database: ${dbOnlyError.message}` };
            }
            revalidatePath('/app/profile', 'page');
            revalidatePath('/', 'layout');
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

        const { success: updateSuccess, error: dbUpdateError } = await updateUserProfileAction(userId, { avatar_url: null }, null);

        if (!updateSuccess) {
            console.error("Error clearing avatar_url in DB via updateUserProfileAction:", dbUpdateError);
            // Even if DB update fails, the storage file might be gone. This is a bit tricky.
            // For now, report the DB update error as primary.
            return { success: false, error: `Gagal mengosongkan URL avatar di database: ${dbUpdateError}` };
        }

        revalidatePath('/app/profile', 'page');
        revalidatePath('/', 'layout'); 
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

  const { data: bills, error: billsError } = await supabase
    .from('bills')
    .select('id, name, created_at, grand_total, payer_participant_id, scheduled_at') 
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
    
    historyEntries.push({
      id: bill.id,
      name: bill.name,
      createdAt: bill.created_at || new Date().toISOString(),
      grandTotal: bill.grand_total, 
      payerName: payerName,
      participantCount: participantCount || 0,
      scheduled_at: bill.scheduled_at, 
    });
  }
  
  return { success: true, data: historyEntries };
}
    
