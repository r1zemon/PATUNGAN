
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileImage, Loader2, ScanLine, Camera, UploadCloud, Power, CircleDot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // For file preview or captured image
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Hidden canvas for capturing frame
  const { toast } = useToast();

  const [isCameraMode, setIsCameraMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const streamRef = useRef<MediaStream | null>(null);


  useEffect(() => {
    const startCamera = async () => {
      if (isCameraMode) {
        setPreviewUrl(null); // Clear any previous preview
        setSelectedFile(null); // Clear any selected file
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          streamRef.current = stream;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this app.',
          });
          setIsCameraMode(false); // Fallback to file upload mode
        }
      }
    };

    startCamera();

    return () => { // Cleanup function
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        try {
            // Explicitly cast to MediaStream if necessary, though srcObject can accept MediaStream | null
            const currentStream = videoRef.current.srcObject as MediaStream | null;
            currentStream?.getTracks().forEach(track => track.stop());
        } catch (e) {
            console.warn("Error stopping video tracks on cleanup:", e);
        }
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraMode, toast]);

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
        if (fileInputRef.current) fileInputRef.current.value = "";
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleToggleMode = () => {
    setIsCameraMode(!isCameraMode);
    // Reset states when toggling
    setSelectedFile(null);
    setPreviewUrl(null);
    setHasCameraPermission(null); // Will be re-checked by useEffect if switching to camera mode
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission && videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg'); // Use JPEG for smaller size
        setPreviewUrl(dataUri);
        setSelectedFile(null); // Clear any selected file
        toast({ title: "Image Captured", description: "Review the image below or capture again." });
      } else {
        toast({ variant: "destructive", title: "Capture Error", description: "Could not process image from camera." });
      }
    } else {
      toast({ variant: "destructive", title: "Camera Not Ready", description: "Camera feed is not available or permission denied." });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isScanning) return;

    if (isCameraMode) {
      if (previewUrl) { // previewUrl holds the captured image data URI
        onScan(previewUrl);
      } else {
        toast({ variant: "destructive", title: "No Image Captured", description: "Please capture an image from the camera first." });
      }
    } else { // File upload mode
      if (!selectedFile) {
        toast({ variant: "destructive", title: "No File Selected", description: "Please select a file to upload." });
        return;
      }
      try {
        const dataUri = await fileToDataUri(selectedFile);
        onScan(dataUri);
      } catch (error) {
        console.error("Error converting file to Data URI:", error);
        const message = error instanceof Error ? error.message : "Failed to read file.";
        toast({ variant: "destructive", title: "File Error", description: `Could not process file: ${message}` });
      }
    }
  };
  
  const canScan = (previewUrl || selectedFile) && !isScanning;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={handleToggleMode}
          disabled={isScanning}
          className="w-full sm:w-auto"
        >
          {isCameraMode ? <UploadCloud className="mr-2" /> : <Camera className="mr-2" />}
          {isCameraMode ? "Switch to Upload File" : "Switch to Use Camera"}
        </Button>
      </div>

      {isCameraMode ? (
        <div className="space-y-4">
          <div className={cn("bg-muted rounded-md overflow-hidden", !hasCameraPermission && "hidden")}>
            <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
          </div>
          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <Power className="h-4 w-4" />
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Camera access was denied or is unavailable. Please enable permissions in your browser settings or try uploading a file.
              </AlertDescription>
            </Alert>
          )}
          {hasCameraPermission && (
            <Button type="button" onClick={handleCaptureImage} disabled={isScanning || !hasCameraPermission} className="w-full">
              <CircleDot className="mr-2" /> Capture Image
            </Button>
          )}
        </div>
      ) : (
        <div>
          <Label htmlFor="receiptImage" className="sr-only">Upload Receipt</Label>
          <Input
            id="receiptImage"
            name="receiptImage"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={isScanning}
          />
          <Button
            type="button"
            variant="outline"
            onClick={triggerFileInput}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-2 py-6 border-dashed border-2 hover:border-primary transition-colors duration-200"
            aria-label="Choose receipt image"
          >
            <FileImage className="w-8 h-8 text-muted-foreground" />
            <span className="text-muted-foreground">
              {selectedFile ? selectedFile.name : "Click to upload receipt image"}
            </span>
          </Button>
        </div>
      )}

      {previewUrl && (
        <div className="mt-4 p-4 border rounded-md bg-muted/50 flex flex-col items-center space-y-2">
          <Image
            src={previewUrl}
            alt="Receipt preview"
            width={200}
            height={300}
            className="rounded-md object-contain max-h-[300px] border"
            data-ai-hint="receipt photograph"
          />
           <p className="text-sm text-muted-foreground">
            {isCameraMode ? "Captured image preview." : "Selected file preview."}
          </p>
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Button type="submit" disabled={!canScan} className="w-full text-lg py-6">
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
