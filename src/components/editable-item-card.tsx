"use client";

import type React from "react";
import { useState, useEffect } from "react";
import type { SplitItem, Person } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Edit3, Trash2, Users, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EditableItemCardProps {
  item: SplitItem;
  people: Person[];
  onUpdateItem: (updatedItem: SplitItem) => void;
  onDeleteItem: (itemId: string) => void;
}

export function EditableItemCard({ item, people, onUpdateItem, onDeleteItem }: EditableItemCardProps) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(
    typeof item.price === 'number' ? item.price.toString() : '0'
  );
  const [assignedToIds, setAssignedToIds] = useState<string[]>(item.assignedToIds);
  const [isEditing, setIsEditing] = useState(false); // For potentially more complex edit modes

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and a single decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPrice(value);
    }
  };
  
  const handleBlur = () => {
    const numericPrice = parseFloat(price);
    const finalPrice = isNaN(numericPrice) ? 0 : Math.max(0, numericPrice);
    if (name !== item.name || finalPrice !== item.price) {
      onUpdateItem({ ...item, name, price: finalPrice });
    }
  };


  const handleAssignmentChange = (personId: string) => {
    const newAssignedToIds = assignedToIds.includes(personId)
      ? assignedToIds.filter((id) => id !== personId)
      : [...assignedToIds, personId];
    setAssignedToIds(newAssignedToIds);
    onUpdateItem({ ...item, name, price: parseFloat(price) || 0, assignedToIds: newAssignedToIds });
  };
  
  const assignedPeopleCount = assignedToIds.length;
  const assignedPeopleNames = assignedToIds
    .map(id => people.find(p => p.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            value={name}
            onChange={handleNameChange}
            onBlur={handleBlur}
            placeholder="Item Name"
            className="text-lg font-semibold flex-grow"
            aria-label={`Item name for ${item.name}`}
          />
        </div>
        <div className="flex items-center space-x-2">
           <span className="text-muted-foreground pl-1">$</span>
          <Input
            type="text" // Use text to allow intermediate empty/decimal states
            inputMode="decimal"
            value={price}
            onChange={handlePriceChange}
            onBlur={handleBlur}
            placeholder="0.00"
            className="w-24"
            aria-label={`Item price for ${item.name}`}
          />
        </div>
        
        <div className="pt-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Users className="mr-2 h-4 w-4" />
                {assignedPeopleCount > 0 ? `${assignedPeopleCount} people assigned` : "Assign to people"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                <p className="text-sm font-medium text-muted-foreground">Select people to split this item:</p>
                {people.map((person) => (
                  <div key={person.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`person-${person.id}-item-${item.id}`}
                      checked={assignedToIds.includes(person.id)}
                      onCheckedChange={() => handleAssignmentChange(person.id)}
                      aria-labelledby={`label-person-${person.id}-item-${item.id}`}
                    />
                    <Label htmlFor={`person-${person.id}-item-${item.id}`} id={`label-person-${person.id}-item-${item.id}`} className="font-normal cursor-pointer">
                      {person.name}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {assignedPeopleNames && (
            <p className={cn("text-xs text-muted-foreground mt-1 pl-1", assignedToIds.length > 0 && "text-accent-foreground")}>
              Assigned to: {assignedPeopleNames}
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