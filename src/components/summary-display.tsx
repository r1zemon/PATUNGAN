
"use client";

import type { DetailedBillSummaryData, Person, Settlement } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, Landmark, Percent, ArrowRight, Wallet } from "lucide-react";

interface SummaryDisplayProps {
  summary: DetailedBillSummaryData | null;
  people: Person[]; 
}

export function SummaryDisplay({ summary, people }: SummaryDisplayProps) {
  if (!summary) {
    return <p className="text-muted-foreground">Ringkasan tagihan akan ditampilkan di sini setelah dihitung.</p>;
  }

  const { payerName, taxAmount, tipAmount, personalTotalShares, settlements, grandTotal } = summary;

  const peopleMap = new Map(people.map(p => [p.name, p]));

  if (grandTotal === 0 && Object.values(personalTotalShares).every(share => share === 0)) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Rincian Tagihan</CardTitle>
          <CardDescription>Jumlah yang harus dibayar oleh setiap orang.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Semua orang berutang Rp0,00. Tidak ada yang perlu dibagi!</p>
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-primary"/> Bagian Masing-Masing Orang</CardTitle>
          <CardDescription>Total biaya yang menjadi tanggungan setiap orang setelah pembagian item, pajak, dan tip.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Orang</TableHead>
                  <TableHead className="text-right min-w-[120px]">Total Bagian (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(personalTotalShares).map(([personName, shareAmount]) => {
                  const personData = peopleMap.get(personName);
                  return (
                    <TableRow key={personName} className={shareAmount > 0 ? "font-medium" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${personName.substring(0,1)}`} alt={personName} data-ai-hint="profile avatar" />
                            <AvatarFallback>{personName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{personName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(shareAmount, "IDR")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {settlements.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><ArrowRight className="mr-2 h-6 w-6 text-primary"/> Penyelesaian Pembayaran</CardTitle>
            <CardDescription>Berikut adalah siapa yang perlu membayar ke siapa.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px] overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Dari</TableHead>
                    <TableHead className="min-w-[120px]">Ke</TableHead>
                    <TableHead className="text-right min-w-[100px]">Jumlah (Rp)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${settlement.from.substring(0,1)}`} alt={settlement.from} data-ai-hint="profile avatar small" />
                            <AvatarFallback>{settlement.from.substring(0,1)}</AvatarFallback>
                          </Avatar>
                          {settlement.from}
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${settlement.to.substring(0,1)}`} alt={settlement.to} data-ai-hint="profile avatar small" />
                            <AvatarFallback>{settlement.to.substring(0,1)}</AvatarFallback>
                          </Avatar>
                          {settlement.to}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary-foreground">{formatCurrency(settlement.amount, "IDR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
       {settlements.length === 0 && grandTotal > 0 && personalTotalShares[payerName] === grandTotal && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><ArrowRight className="mr-2 h-6 w-6 text-primary"/> Penyelesaian Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{payerName} menanggung seluruh tagihan. Tidak ada pembayaran antar peserta lain yang diperlukan.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
