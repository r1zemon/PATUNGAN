
"use server";

import { scanReceipt, ScanReceiptOutput, ReceiptItem as AiReceiptItem } from "@/ai/flows/scan-receipt";
import { summarizeBill, SummarizeBillInput } from "@/ai/flows/summarize-bill"; // RawBillSummary type comes from here implicitly
import type { SplitItem, Person, RawBillSummary, TaxTipSplitStrategy } from "./types";
import { supabase } from "./supabaseClient"; // Import Supabase client

interface AppScannedItem {
  id: string; // Ini akan menjadi ID client-side sementara sebelum disimpan ke DB
  name: string;
  unitPrice: number;
  quantity: number;
}

// Action untuk membuat bill baru
export async function createBillAction(billName?: string): Promise<{ success: boolean; billId?: string; error?: string }> {
  // Untuk saat ini, user_id bisa null jika belum ada autentikasi
  // Atau Anda bisa mengambil user_id dari sesi Supabase Auth jika sudah diimplementasikan
  const { data, error } = await supabase
    .from('bills')
    .insert([{ name: billName || null /* user_id: authUser?.id || null */ }])
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
    .select('id, name') // Ambil ID dan nama dari partisipan yang baru dibuat
    .single();

  if (error) {
    console.error("Error adding participant:", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "Failed to add participant or retrieve data." };
  }
  // Kembalikan objek Person yang sesuai dengan tipe di frontend
  // 'id' di sini adalah id dari tabel bill_participants
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
  splitItems: SplitItem[], // SplitItem.id masih client-side, perlu di-map ke DB id jika item sudah disimpan
  people: Person[], // Person.id sekarang adalah bill_participant.id dari DB
  billId: string, // ID dari tabel bills
  payerParticipantId: string, // ID dari tabel bill_participants untuk pembayar
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

  // Update Bill dengan Payer, Tax, Tip, Strategy
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

  // Untuk AI, kita tetap menggunakan nama.
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
    payerName: payerName, // Nama pembayar untuk AI
    taxAmount: taxAmount,
    tipAmount: tipAmount,
    taxTipSplitStrategy: taxTipSplitStrategy,
  };

  try {
    const rawSummary: RawBillSummary = await summarizeBill(summarizeBillInput);
    
    // Simpan total share ke bill_participants dan settlements ke tabel settlements
    for (const person of people) {
        const share = rawSummary[person.name];
        if (typeof share === 'number') {
            await supabase.from('bill_participants').update({ total_share_amount: share }).eq('id', person.id);
        }
    }
    
    // Hapus settlement lama jika ada
    await supabase.from('settlements').delete().eq('bill_id', billId);
    
    // Buat settlement baru
    const settlementPromises = [];
    let calculatedGrandTotal = 0;
    Object.entries(rawSummary).forEach(([personName, share]) => {
        calculatedGrandTotal += share;
        const participant = people.find(p => p.name === personName);
        if (participant && participant.id !== payerParticipantId && share > 0) {
            settlementPromises.push(
                supabase.from('settlements').insert({
                    bill_id: billId,
                    from_participant_id: participant.id,
                    to_participant_id: payerParticipantId,
                    amount: share
                })
            );
        }
    });
    await Promise.all(settlementPromises);

    // Update grand_total di tabel bills
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

// TODO: Tambahkan actions untuk CRUD bill_items dan item_assignments
// Contoh:
// export async function saveSplitItemsAction(billId: string, splitItems: SplitItem[]): Promise<{ success: boolean; error?: string }> {
//   // 1. Hapus item dan assignment lama untuk billId ini (atau strategi update yang lebih canggih)
//   // 2. Insert item baru ke bill_items, dapatkan ID DB mereka
//   // 3. Insert assignment baru ke item_assignments menggunakan ID DB item dan ID DB partisipan
//   return { success: true };
// }
