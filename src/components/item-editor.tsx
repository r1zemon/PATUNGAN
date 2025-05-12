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
  onCalculateSummary: () => void;
  isCalculating: boolean;
}

export function ItemEditor({
  items,
  people,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onCalculateSummary,
  isCalculating,
}: ItemEditorProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No items scanned yet, or all items have been deleted.</p>
        <Button onClick={onAddItem} variant="outline" className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item Manually
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
      <div className="flex justify-between items-center mt-6 pt-6 border-t">
         <Button onClick={onAddItem} variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
        <Button onClick={onCalculateSummary} disabled={isCalculating || items.length === 0} size="lg">
          {isCalculating ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            <Calculator className="mr-2" />
          )}
          {isCalculating ? "Calculating..." : "Calculate Bill Summary"}
        </Button>
      </div>
    </div>
  );
}
