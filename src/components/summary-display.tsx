
"use client";

import type { DetailedBillSummaryData, Person, Settlement, PersonalShareDetail } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, Landmark, Percent, ArrowRight, Wallet, ShoppingBasket, FileText, Hash, Tag, CheckCircle, CreditCard, ShieldCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface SummaryDisplayProps {
  summary: DetailedBillSummaryData | null;
  people: Person[]; 
}

export function SummaryDisplay({ summary, people }: SummaryDisplayProps) {
  const { toast } = useToast();

  if (!summary) {
    return <p className="text-muted-foreground">Ringkasan tagihan akan ditampilkan di sini setelah dihitung.</p>;
  }

  const { payerName, taxAmount, tipAmount, settlements, grandTotal, personalShares } = summary;

  if (grandTotal === 0) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Rincian Tagihan</CardTitle>
          <CardDescription>Jumlah yang harus dibayar oleh setiap orang.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tidak ada yang perlu dibagi!</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Wallet className="mr-2 h-6 w-6 text-primary"/> Rincian Total Tagihan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Pembayar Awal:</span>
            <span className="font-semibold">{payerName}</span>
          </div>
          {(taxAmount > 0 || tipAmount > 0) && (
            <>
              <Separator/>
              {taxAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center"><Landmark className="mr-2 h-4 w-4"/>Pajak:</span>
                  <span className="font-medium">{formatCurrency(taxAmount, "IDR")}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center"><Percent className="mr-2 h-4 w-4"/>Tip:</span>
                  <span className="font-medium">{formatCurrency(tipAmount, "IDR")}</span>
                </div>
              )}
            </>
          )}
          <Separator/>
           <div className="flex justify-between items-center text-lg">
            <span className="font-semibold">Total Keseluruhan Tagihan:</span>
            <span className="font-bold text-primary">{formatCurrency(grandTotal, "IDR")}</span>
          </div>
        </CardContent>
      </Card>
      
      {settlements.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><ArrowRight className="mr-2 h-6 w-6 text-primary"/> Penyelesaian Pembayaran</CardTitle>
            <CardDescription>Berikut adalah siapa yang perlu membayar ke siapa untuk menyelesaikan tagihan ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Dari</TableHead>
                  <TableHead className="min-w-[120px]">Ke</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement, index) => {
                  const fromPerson = people.find(p => p.id === settlement.fromId);
                  const toPerson = people.find(p => p.id === settlement.toId);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8">
                            <AvatarImage src={fromPerson?.avatar_url || undefined} alt={settlement.from} data-ai-hint="profile avatar small" />
                            <AvatarFallback>{settlement.from.substring(0,1)}</AvatarFallback>
                          </Avatar>
                          {settlement.from}
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8">
                            <AvatarImage src={toPerson?.avatar_url || undefined} alt={settlement.to} data-ai-hint="profile avatar small" />
                            <AvatarFallback>{settlement.to.substring(0,1)}</AvatarFallback>
                          </Avatar>
                          {settlement.to}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary text-right">{formatCurrency(settlement.amount, "IDR")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {personalShares && personalShares.length > 0 && (
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-primary"/> Rincian per Orang</CardTitle>
            <CardDescription>Klik nama untuk melihat detail pengeluaran masing-masing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {personalShares.map((share) => (
                <AccordionItem value={share.personId} key={share.personId}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{share.personName}</span>
                      <span className="font-semibold text-primary">{formatCurrency(share.totalShare)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-muted/50 p-4 rounded-md">
                     <div className="space-y-2">
                        <h4 className="font-semibold text-sm mb-2">Item yang Dipesan:</h4>
                        {share.items.length > 0 ? (
                           <ul className="space-y-1 text-sm">
                            {share.items.map((item, idx) => (
                                <li key={idx} className="flex justify-between items-center">
                                    <span>{item.itemName} (x{item.quantityConsumed})</span>
                                    <span>{formatCurrency(item.totalItemCost)}</span>
                                </li>
                            ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground">Tidak ada item yang dialokasikan.</p>
                        )}
                        <Separator className="my-2"/>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal Item</span>
                            <span className="font-medium">{formatCurrency(share.subTotalFromItems)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bagian Pajak</span>
                            <span>{formatCurrency(share.taxShare)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bagian Tip</span>
                            <span>{formatCurrency(share.tipShare)}</span>
                        </div>
                         <Separator className="my-2"/>
                        <div className="flex justify-between text-sm font-semibold">
                            <span>Total Bagian</span>
                            <span>{formatCurrency(share.totalShare)}</span>
                        </div>
                     </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

       {settlements.length === 0 && grandTotal > 0 && summary.payerName && !personalShares && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><ArrowRight className="mr-2 h-6 w-6 text-primary"/> Penyelesaian Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{payerName} menanggung seluruh tagihan atau semua orang membayar bagiannya sendiri. Tidak ada pembayaran antar peserta lain yang diperlukan.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
