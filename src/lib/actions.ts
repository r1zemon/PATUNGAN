"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill";
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy } from "./types";
import { supabase } from "./supabaseClient";
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

interface AppScannedItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export async function signupUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const username = formData.get('username') as string;
  const dateOfBirth = formData.get('dateOfBirth') as string; // Dapatkan sebagai string
  const phoneNumber = formData.get('phone') as string;

  if (!email || !password || !fullName || !username) {
    return { success: false, error: "Email, password, nama lengkap, dan username wajib diisi." };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Data ini bisa digunakan oleh trigger di Supabase atau untuk akses awal
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

  if (!authData.user) {
    console.error("Signup successful but no user data returned.");
    return { success: false, error: "Gagal mendapatkan data pengguna setelah pendaftaran." };
  }

  // Insert into public.profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ 
      id: authData.user.id, 
      full_name: fullName,
      username: username,
      // email: email, // Anda bisa memilih untuk menyimpan email di profil juga
      date_of_birth: dateOfBirth || null, // Simpan sebagai string tanggal atau null
      phone_number: phoneNumber || null
      // avatar_url akan dihandle terpisah jika ada upload
    });

  if (profileError) {
    console.error("Error creating profile:", profileError);
    // Jika pembuatan profil gagal, idealnya pengguna auth juga dihapus atau ada mekanisme kompensasi
    // Untuk saat ini, kita akan laporkan errornya
    return { success: false, error: `Pengguna berhasil dibuat, tetapi gagal membuat profil: ${profileError.message}` };
  }
  
  revalidatePath('/', 'layout'); // Revalidate all paths to update header
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
  return { success: true, user: data.user };
}


export async function getCurrentUserAction(): Promise<{ user: import('@supabase/supabase-js').User | null; profile: any | null; error?: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting session:", sessionError);
    return { user: null, profile: null, error: sessionError.message };
  }

  if (!session || !session.user) {
    return { user: null, profile: null };
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116: no rows found, not necessarily an error if profile creation is pending/failed
    console.error("Error fetching profile:", profileError);
    // Return user even if profile fetch fails, but log error
    return { user: session.user, profile: null, error: profileError.message };
  }

  return { user: session.user, profile: profileData };
}

export async function logoutUserAction() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/', 'layout');
  return { success: true };
}


// Action untuk membuat bill baru
export async function createBillAction(billName?: string): Promise<{ success: boolean; billId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('bills')
    .insert([{ name: billName || "Tagihan Baru", user_id: user?.id || null }])
    .select('id')
    .single();

  if (error) {
    console.error("Error creating bill:", error);
    return { success: false, error: error.message };
  }
  if (!data || !data.id) {
    return { success: false, error: "Failed to create bill or retrieve ID." };
  }
  return { success: true, billId: data.id };
}

// Action untuk menambah partisipan ke bill
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

// Action untuk menghapus partisipan dari bill
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
): Promise<{ success: boolean; data?: { items: AppScannedItem[] }; error?: string }> {
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
      const appItems: AppScannedItem[] = result.items.map((item: AiReceiptItem, index: number) => ({
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
  if (!splitItems.length || !people.length) {
    return { success: false, error: "Tidak ada item atau orang untuk diringkas." };
  }
  if (!payerParticipantId) {
    return { success: false, error: "ID Pembayar tidak disediakan." };
  }
  if (!billId) {
    return { success: false, error: "Bill ID tidak disediakan." };
  }
  
  const payer = people.find(p => p.id === payerParticipantId);
  if (!payer) {
    return { success: false, error: "Data pembayar tidak valid." };
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
    console.error("Error updating bill details:", billUpdateError);
    return { success: false, error: `Gagal memperbarui detail tagihan: ${billUpdateError.message}` };
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
  }));

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
    const participantSharePromises = people.map(person => {
      const share = rawSummary[person.name];
      if (typeof share === 'number') {
        calculatedGrandTotal += share;
        return supabase.from('bill_participants').update({ total_share_amount: share }).eq('id', person.id);
      }
      return Promise.resolve();
    });
    await Promise.all(participantSharePromises);
    
    await supabase.from('settlements').delete().eq('bill_id', billId);
    
    const settlementPromises = [];
    for (const person of people) {
      const share = rawSummary[person.name];
      if (person.id !== payerParticipantId && typeof share === 'number' && share > 0) {
        settlementPromises.push(
          supabase.from('settlements').insert({
            bill_id: billId,
            from_participant_id: person.id,
            to_participant_id: payerParticipantId,
            amount: share
          })
        );
      }
    }
    await Promise.all(settlementPromises);

    await supabase.from('bills').update({ grand_total: calculatedGrandTotal }).eq('id', billId);

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