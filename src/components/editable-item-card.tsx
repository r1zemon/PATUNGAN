
"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import type { SplitItem, Person } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DollarSign, Hash, Trash2, Users, Edit2, XCircle, CheckCircle2, MinusCircle, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";


interface EditableItemCardProps {
  item: SplitItem;
  people: Person[];
  onUpdateItem: (updatedItem: SplitItem) => void;
  onDeleteItem: (itemId: string) => void;
}

export function EditableItemCard({ item, people, onUpdateItem, onDeleteItem }: EditableItemCardProps) {
  const [name, setName] = useState(item.name);
  const [unitPriceStr, setUnitPriceStr] = useState(item.unitPrice.toString());
  const [quantityStr, setQuantityStr] = useState(item.quantity.toString());
  
  // State for managing assignments within the popover
  const [popoverAssignments, setPopoverAssignments] = useState<Array<{ personId: string; count: number }>>(item.assignedTo);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    setName(item.name);
    setUnitPriceStr(item.unitPrice.toString());
    setQuantityStr(item.quantity.toString());
    setPopoverAssignments(item.assignedTo);
  }, [item]);

  const handleFieldChange = (field: 'name' | 'unitPrice' | 'quantity') => {
    const currentUnitPrice = parseFloat(unitPriceStr) || 0;
    const currentQuantity = parseInt(quantityStr, 10) || 1;
    
    let updatedItem: SplitItem = { ...item, name, unitPrice: currentUnitPrice, quantity: currentQuantity };

    if (field === 'name') updatedItem.name = name; // Already updated by state
    if (field === 'unitPrice') updatedItem.unitPrice = Math.max(0, parseFloat(unitPriceStr) || 0);
    if (field === 'quantity') {
      const newQuantity = Math.max(1, parseInt(quantityStr, 10) || 1);
      updatedItem.quantity = newQuantity;
      // Adjust assignments if new quantity is less than total assigned
      const totalAssigned = updatedItem.assignedTo.reduce((sum, assign) => sum + assign.count, 0);
      if (newQuantity < totalAssigned) {
        // This is a simple reset, a more sophisticated adjustment might be needed
        updatedItem.assignedTo = []; 
        setPopoverAssignments([]);
      }
    }
    onUpdateItem(updatedItem);
  };
  
  const handleAssignmentPopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      // When opening, sync popover state with item state
      setPopoverAssignments([...item.assignedTo]); 
    } else {
      // When closing (if not saved via button), potentially revert or do nothing
      // Current logic saves on "Done" click
    }
  };

  const handlePopoverAssignmentChange = (personId: string, change: number) => {
    setPopoverAssignments(prevAssignments => {
      const existingAssignment = prevAssignments.find(a => a.personId === personId);
      let newCount = (existingAssignment?.count || 0) + change;
      newCount = Math.max(0, newCount); // Ensure count is not negative

      // Calculate total assigned count with the potential new change
      const otherAssignmentsTotal = prevAssignments
        .filter(a => a.personId !== personId)
        .reduce((sum, a) => sum + a.count, 0);
      
      const itemTotalQuantity = parseInt(quantityStr, 10) || item.quantity;
      if (otherAssignmentsTotal + newCount > itemTotalQuantity) {
        newCount = itemTotalQuantity - otherAssignmentsTotal; // Cap at total quantity
      }

      if (newCount === 0) {
        return prevAssignments.filter(a => a.personId !== personId);
      } else if (existingAssignment) {
        return prevAssignments.map(a => a.personId === personId ? { ...a, count: newCount } : a);
      } else {
        return [...prevAssignments, { personId, count: newCount }];
      }
    });
  };

  const saveAssignments = () => {
    onUpdateItem({ ...item, name, unitPrice: parseFloat(unitPriceStr) || 0, quantity: parseInt(quantityStr, 10) || 1, assignedTo: popoverAssignments });
    setIsPopoverOpen(false);
  };

  const totalAssignedCount = useMemo(() => item.assignedTo.reduce((sum, pa) => sum + pa.count, 0), [item.assignedTo]);
  const popoverTotalAssignedCount = useMemo(() => popoverAssignments.reduce((sum, pa) => sum + pa.count, 0), [popoverAssignments]);
  
  const itemDisplayQuantity = parseInt(quantityStr, 10) || item.quantity;

  const assignedPeopleSummary = item.assignedTo
    .map(assign => {
      const person = people.find(p => p.id === assign.personId);
      return person ? `${person.name} (x${assign.count})` : `Unknown (x${assign.count})`;
    })
    .join(", ");

  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <CardContent className="p-4 space-y-3 flex-grow">
        <div className="flex items-center space-x-2">
          <Edit2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleFieldChange('name')}
            placeholder="Item Name"
            className="text-lg font-semibold flex-grow"
            aria-label={`Item name for ${item.name}`}
          />
        </div>
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            type="text"
            inputMode="decimal"
            value={unitPriceStr}
            onChange={(e) => setUnitPriceStr(e.target.value.replace(/[^0-9.]/g, ''))}
            onBlur={() => handleFieldChange('unitPrice')}
            placeholder="0.00"
            className="w-24"
            aria-label={`Unit price for ${item.name}`}
          />
          <span className="text-sm text-muted-foreground">per unit</span>
        </div>
        <div className="flex items-center space-x-2">
          <Hash className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            type="text"
            inputMode="numeric"
            value={quantityStr}
            onChange={(e) => setQuantityStr(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => handleFieldChange('quantity')}
            placeholder="1"
            className="w-20"
            aria-label={`Quantity for ${item.name}`}
          />
          <span className="text-sm text-muted-foreground">total units</span>
        </div>
        
        <Separator className="my-3"/>

        <div>
          <Popover open={isPopoverOpen} onOpenChange={handleAssignmentPopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Users className="mr-2 h-4 w-4" />
                {totalAssignedCount > 0 ? `Assigned: ${totalAssignedCount} / ${itemDisplayQuantity} units` : `Assign ${itemDisplayQuantity} units`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm p-0" align="start">
              <div className="p-4">
                <h4 className="font-medium leading-none mb-1">Assign "{item.name}"</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Total units for this item: {itemDisplayQuantity}. Assign how many units each person takes.
                </p>
                <Badge 
                  variant={popoverTotalAssignedCount === itemDisplayQuantity ? "default" : "secondary"} 
                  className={cn(
                    "mb-3",
                    popoverTotalAssignedCount > itemDisplayQuantity && "bg-destructive text-destructive-foreground"
                  )}
                >
                  {popoverTotalAssignedCount === itemDisplayQuantity && <CheckCircle2 className="mr-1 h-4 w-4"/>}
                  {popoverTotalAssignedCount > itemDisplayQuantity && <XCircle className="mr-1 h-4 w-4"/>}
                  Assigned: {popoverTotalAssignedCount} / {itemDisplayQuantity} units
                </Badge>
              </div>
              <ScrollArea className="max-h-60">
                <div className="p-4 pt-0 space-y-3">
                  {people.map((person) => {
                    const currentAssignment = popoverAssignments.find(a => a.personId === person.id);
                    const countForPerson = currentAssignment?.count || 0;
                    const canIncrement = popoverTotalAssignedCount < itemDisplayQuantity;

                    return (
                      <div key={person.id} className="flex items-center justify-between space-x-2">
                        <Label htmlFor={`person-${person.id}-item-${item.id}`} className="font-normal flex-grow truncate pr-2">
                          {person.name}
                        </Label>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => handlePopoverAssignmentChange(person.id, -1)}
                            disabled={countForPerson === 0}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <Input 
                            type="number"
                            min="0"
                            value={countForPerson}
                            onChange={(e) => {
                                const newCount = parseInt(e.target.value,10) || 0;
                                const diff = newCount - countForPerson;
                                handlePopoverAssignmentChange(person.id, diff);
                            }}
                            className="w-12 h-7 text-center px-1 flex-shrink-0"
                            aria-label={`Count for ${person.name}`}
                           />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => handlePopoverAssignmentChange(person.id, 1)}
                            disabled={!canIncrement && countForPerson === 0 || popoverTotalAssignedCount >= itemDisplayQuantity && !(countForPerson > 0 && (popoverTotalAssignedCount - countForPerson + (countForPerson +1) <= itemDisplayQuantity) ) }
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="p-4 border-t flex justify-end">
                <Button onClick={saveAssignments} disabled={popoverTotalAssignedCount > itemDisplayQuantity}>
                  <CheckCircle2 className="mr-2 h-4 w-4"/>Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {assignedPeopleSummary && (
            <p className={cn("text-xs text-muted-foreground mt-2 pl-1", totalAssignedCount > 0 && totalAssignedCount === itemDisplayQuantity ? "text-green-600 dark:text-green-500" : totalAssignedCount > 0 ? "text-primary-foreground" : "" )}>
             Assigned to: {assignedPeopleSummary}
            </p>
          )}
           {totalAssignedCount < itemDisplayQuantity && totalAssignedCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 pl-1">
              {itemDisplayQuantity - totalAssignedCount} unit(s) still unassigned.
            </p>
          )}
           {totalAssignedCount === 0 && itemDisplayQuantity > 0 && (
            <p className="text-xs text-muted-foreground mt-1 pl-1">
              Not assigned to anyone yet.
            </p>
          )}
        </div>

      </CardContent>
      <CardFooter className="p-2 border-t">
        <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteItem(item.id)}
            className="text-destructive hover:bg-destructive/10 w-full justify-start"
            aria-label={`Delete item ${item.name}`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Item
        </Button>
      </CardFooter>
    </Card>
  );
}

    