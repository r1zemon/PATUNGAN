"use client";

import type React from "react";
import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileImage, Loader2, ScanLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReceiptUploaderProps {
  onScan: (dataUri: string) => void;
  isScanning: boolean;
}

// Helper to convert File to Base64 Data URI
const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export function ReceiptUploader({ onScan, isScanning }: ReceiptUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload an image (JPEG, PNG, WebP).",
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset file input
        }
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) return;

    try {
      const dataUri = await fileToDataUri(selectedFile);
      onScan(dataUri);
    } catch (error) {
      console.error("Error converting file to Data URI in ReceiptUploader:", error);
      const message = error instanceof Error ? error.message : "Failed to read file.";
      toast({
        variant: "destructive",
        title: "File Processing Error",
        description: `Could not process the file: ${message}`,
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="receiptImage" className="sr-only">
          Upload Receipt
        </Label>
        <Input
          id="receiptImage"
          name="receiptImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileInput}
          className="w-full flex items-center justify-center gap-2 py-6 border-dashed border-2 hover:border-primary transition-colors duration-200"
          aria-label="Choose receipt image"
        >
          <FileImage className="w-8 h-8 text-muted-foreground" />
          <span className="text-muted-foreground">
            {selectedFile ? selectedFile.name : "Click to upload receipt image"}
          </span>
        </Button>
      </div>

      {previewUrl && (
        <div className="mt-4 p-4 border rounded-md bg-muted/50 flex justify-center">
          <Image
            src={previewUrl}
            alt="Receipt preview"
            width={200}
            height={300}
            className="rounded-md object-contain max-h-[300px]"
            data-ai-hint="receipt photograph"
          />
        </div>
      )}

      <Button type="submit" disabled={!selectedFile || isScanning} className="w-full">
        {isScanning ? (
          <Loader2 className="animate-spin mr-2" />
        ) : (
          <ScanLine className="mr-2" />
        )}
        {isScanning ? "Scanning..." : "Scan Receipt"}
      </Button>
    </form>
  );
}
