
"use client";

import type { SplitItem, Person } from "@/lib/types";
import { EditableItemCard } from "./editable-item-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Calculator } from "lucide-react";

interface ItemEditorProps {
  items: SplitItem[];
  people: Person[];
  onUpdateItem: (updatedItem: SplitItem) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onCalculateSummary: () => void; // Prop remains, but button is moved to parent
  isCalculating: boolean; // Prop remains, but button is moved to parent
}

export function ItemEditor({
  items,
  people,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onCalculateSummary, // Retained for potential future use or if button is moved back
  isCalculating,    // Retained for potential future use
}: ItemEditorProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Belum ada item yang dipindai atau ditambahkan.</p>
        <p className="text-sm text-muted-foreground mt-1">Pindai struk di atas atau tambahkan item secara manual.</p>
        <Button onClick={onAddItem} variant="outline" className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Item Manual
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <EditableItemCard
            key={item.id}
            item={item}
            people={people}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
          />
        ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-start items-center mt-6 pt-6 border-t gap-4">
         <Button onClick={onAddItem} variant="outline" className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Item Lain
        </Button>
        {/* Button onCalculateSummary is now in the parent component (SplitBillAppPage) 
            below the payment details section, to include those details in the calculation.
        */}
      </div>
    </div>
  );
}

    