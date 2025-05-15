
"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy, ScannedItem } from "./types"; // Added ScannedItem
import { supabase } from "./supabaseClient";
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { PostgrestSingleResponse, PostgrestResponse, User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from '@/lib/database.types';

type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];


export async function signupUserAction(formData: FormData) {
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
    // Attempt to delete the auth user if profile creation fails to avoid orphaned auth users
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: `Pengguna berhasil dibuat di auth, tetapi gagal membuat profil: ${profileError.message}. Pengguna auth telah dihapus.` };
  }
  
  revalidatePath('/', 'layout'); 
  revalidatePath('/login', 'page'); 
  return { success: true, user: authData.user };
}

export async function loginUserAction(formData: FormData) {
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
  revalidatePath('/app', 'page'); // Changed from layout to page for /app
  revalidatePath('/app', 'layout'); // Keep this for header updates
  return { success: true, user: data.user };
}


export async function getCurrentUserAction(): Promise<{ user: SupabaseUser | null; profile: any | null; error?: string }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting session in getCurrentUserAction:", sessionError.message);
    return { user: null, profile: null, error: `Gagal memuat sesi pengguna: ${sessionError.message}` };
  }

  if (!sessionData) {
    console.warn("getCurrentUserAction: sessionData object itself is null.");
    return { user: null, profile: null }; 
  }
  if (!sessionData.session) {
    console.warn("getCurrentUserAction: sessionData.session is null.");
    return { user: null, profile: null };
  }
  if (!sessionData.session.user) {
    console.warn("getCurrentUserAction: User object within sessionData.session is null.");
    return { user: null, profile: null };
  }
  
  const user = sessionData.session.user; 

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
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/', 'layout');
  revalidatePath('/app', 'page'); // Changed from layout to page for /app
  revalidatePath('/app', 'layout'); // Keep this
  revalidatePath('/login', 'page');
  return { success: true };
}


export async function createBillAction(billName?: string): Promise<{ success: boolean; billId?: string; error?: string }> {
  const { data: userAuthData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("createBillAction - authError:", authError.message);
    return { success: false, error: `Gagal mendapatkan sesi pengguna (authError): ${authError.message}` };
  }

  if (!userAuthData) {
     console.warn("createBillAction: userAuthData object is null. Cannot create bill.");
     return { success: false, error: "Gagal mendapatkan data autentikasi pengguna (data null). Tidak dapat membuat tagihan." };
  }
  
  if (!userAuthData.user) {
     console.warn("createBillAction: User object within userAuthData is null. Cannot create bill.");
     return { success: false, error: "Pengguna tidak terautentikasi (data pengguna tidak ditemukan). Tidak dapat membuat tagihan." };
  }
  
  const user = userAuthData.user;
  
  const { data: billData, error: billInsertError } = await supabase
    .from('bills')
    .insert([{ name: billName || "Tagihan Baru", user_id: user.id }])
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
): Promise<{ success: boolean; data?: { items: ScannedItem[] }; error?: string }> { // Changed AppScannedItem to ScannedItem
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
      const appItems: ScannedItem[] = result.items.map((item: AiReceiptItem, index: number) => ({ // Changed AppScannedItem to ScannedItem
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
  if (!billId) {
    return { success: false, error: "Bill ID tidak disediakan." };
  }
  if (!payerParticipantId) {
    return { success: false, error: "ID Pembayar tidak disediakan." };
  }
   if (people.length === 0) {
    return { success: false, error: "Tidak ada orang yang terlibat dalam tagihan." };
  }
  if (splitItems.length === 0 && taxAmount === 0 && tipAmount === 0) {
    const zeroSummary: RawBillSummary = {};
    people.forEach(p => zeroSummary[p.name] = 0);
    
    for (const person of people) {
        const { error: updateError } = await supabase.from('bill_participants').update({ total_share_amount: 0 }).eq('id', person.id);
        if (updateError) console.warn(`Error setting share to 0 for ${person.name}: ${updateError.message}`);
    }
    await supabase.from('bills').update({ grand_total: 0, tax_amount:0, tip_amount:0, payer_participant_id: payerParticipantId, tax_tip_split_strategy: taxTipSplitStrategy }).eq('id', billId);
    return { success: true, data: zeroSummary };
  }
  
  const payer = people.find(p => p.id === payerParticipantId);
  if (!payer) {
    return { success: false, error: "Data pembayar tidak valid atau tidak ditemukan dalam daftar partisipan." };
  }
  const payerName = payer.name;

  const { error: billUpdateError } = await supabase
    .from('bills')
    .update({
      payer_participant_id: payerParticipantId,
      tax_amount: taxAmount,
      tip_amount: tipAmount,
      tax_tip_split_strategy: taxTipSplitStrategy,
    })
    .eq('id', billId);

  if (billUpdateError) {
    console.error("Error updating bill details in DB:", billUpdateError);
    return { success: false, error: `Gagal memperbarui detail tagihan di database: ${billUpdateError.message}` };
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
  })).filter(item => item.quantity > 0 && item.unitPrice >= 0); // Pastikan hanya item valid yang dikirim

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
         // Handle if AI did not return a share for a person, default to 0
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
    
    const { error: grandTotalUpdateError } = await supabase.from('bills').update({ grand_total: calculatedGrandTotal }).eq('id', billId);
    if (grandTotalUpdateError) {
        console.error("Error updating grand total in DB:", grandTotalUpdateError);
        return { success: false, error: `Gagal memperbarui total keseluruhan di database: ${grandTotalUpdateError.message}` };
    }

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

// Action to update profile
export async function updateUserProfileAction(userId: string, updates: { full_name?: string; username?: string; avatar_url?: string; phone_number?: string }) {
  if (!userId) return { success: false, error: "User ID is required." };

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: error.message, data: null };
  }

  revalidatePath('/app', 'layout'); 
  revalidatePath('/', 'layout'); 
  
  return { success: true, data, error: null };
}
