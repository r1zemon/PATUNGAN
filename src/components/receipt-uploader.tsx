
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileImage, Loader2, ScanLine, Camera, UploadCloud, Power, CircleDot, Trash2 } from "lucide-react";
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
        // Do not clear previewUrl here if it's from a capture,
        // only clear it if switching modes or deselecting a file.
        // setSelectedFile(null); // Clear any selected file
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
            title: 'Kamera Tidak Dapat Diakses',
            description: 'Mohon aktifkan izin kamera di pengaturan browser Anda untuk menggunakan fitur ini.',
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
          title: "Jenis File Tidak Valid",
          description: "Mohon unggah file gambar (JPEG, PNG, WebP).",
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file); // File selected, not from camera
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
    setSelectedFile(null);
    setPreviewUrl(null); // Clear preview when toggling mode
    setHasCameraPermission(null); 
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
        const dataUri = canvas.toDataURL('image/jpeg'); 
        setPreviewUrl(dataUri); // Preview is from camera capture
        setSelectedFile(null); // Ensure no file is considered selected
        toast({ title: "Gambar Diambil", description: "Lihat gambar di bawah atau ambil ulang." });
      } else {
        toast({ variant: "destructive", title: "Gagal Mengambil Gambar", description: "Tidak dapat memproses gambar dari kamera." });
      }
    } else {
      toast({ variant: "destructive", title: "Kamera Belum Siap", description: "Feed kamera tidak tersedia atau izin ditolak." });
    }
  };

  const handleRetakePhoto = () => {
    setPreviewUrl(null); // Clear the preview
    // Camera stream should still be active if isCameraMode is true
    toast({ title: "Pratinjau Dihapus", description: "Silakan ambil foto baru." });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isScanning) return;

    if (previewUrl) { // This condition covers both captured camera image and selected file preview
        onScan(previewUrl);
    } else if (selectedFile && !isCameraMode) { // Fallback for file if previewUrl somehow failed but file is selected
        try {
            const dataUri = await fileToDataUri(selectedFile);
            onScan(dataUri);
        } catch (error) {
            console.error("Error converting file to Data URI:", error);
            const message = error instanceof Error ? error.message : "Gagal membaca file.";
            toast({ variant: "destructive", title: "Kesalahan File", description: `Tidak dapat memproses file: ${message}` });
        }
    } else if (isCameraMode && !previewUrl) {
        toast({ variant: "destructive", title: "Tidak Ada Gambar", description: "Mohon ambil gambar dari kamera terlebih dahulu." });
    } else if (!isCameraMode && !selectedFile) {
        toast({ variant: "destructive", title: "Tidak Ada File", description: "Mohon pilih file untuk diunggah." });
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
          {isCameraMode ? "Beralih ke Unggah File" : "Beralih ke Kamera"}
        </Button>
      </div>

      {isCameraMode ? (
        <div className="space-y-4">
          {/* Show video feed only if there's no preview from camera capture */}
          <div className={cn(
              "bg-muted rounded-md overflow-hidden", 
              (!hasCameraPermission || (isCameraMode && previewUrl)) && "hidden" // Hide if no permission OR if there's a preview from camera
          )}>
            <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
          </div>

          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <Power className="h-4 w-4" />
              <AlertTitle>Akses Kamera Diperlukan</AlertTitle>
              <AlertDescription>
                Akses kamera ditolak atau tidak tersedia. Mohon aktifkan izin di pengaturan browser Anda atau coba unggah file.
              </AlertDescription>
            </Alert>
          )}
          {/* Show capture button only if there's permission and NO preview from camera */}
          {hasCameraPermission && !previewUrl && (
            <Button type="button" onClick={handleCaptureImage} disabled={isScanning || !hasCameraPermission} className="w-full">
              <CircleDot className="mr-2" /> Ambil Gambar
            </Button>
          )}
        </div>
      ) : (
        <div>
          <Label htmlFor="receiptImage" className="sr-only">Unggah Struk</Label>
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
            disabled={isScanning || previewUrl !== null} // Disable if there's a preview from file upload
            className="w-full flex items-center justify-center gap-2 py-6 border-dashed border-2 hover:border-primary transition-colors duration-200"
            aria-label="Pilih gambar struk"
          >
            <FileImage className="w-8 h-8 text-muted-foreground" />
            <span className="text-muted-foreground">
              {selectedFile ? selectedFile.name : "Klik untuk unggah gambar struk"}
            </span>
          </Button>
        </div>
      )}

      {previewUrl && (
        <div className="mt-4 p-4 border rounded-md bg-muted/50 flex flex-col items-center space-y-3">
          <Image
            src={previewUrl}
            alt="Pratinjau struk"
            width={200}
            height={300}
            className="rounded-md object-contain max-h-[300px] border"
            data-ai-hint="receipt photograph"
          />
           <p className="text-sm text-muted-foreground">
            {isCameraMode && !selectedFile ? "Pratinjau gambar yang diambil." : "Pratinjau file yang dipilih."}
          </p>
          {/* Show Retake Photo button only if in camera mode and preview is from camera */}
          {isCameraMode && !selectedFile && ( 
            <Button type="button" variant="outline" size="sm" onClick={handleRetakePhoto} disabled={isScanning}>
              <Trash2 className="mr-2 h-4 w-4" /> Ambil Ulang Foto
            </Button>
          )}
           {/* Show Clear Selection button only if in file upload mode and a file is selected (previewUrl is not null) */}
          {!isCameraMode && selectedFile && previewUrl && (
             <Button type="button" variant="outline" size="sm" onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                toast({ title: "Pilihan Dihapus", description: "Silakan pilih file baru." });
             }} disabled={isScanning}>
              <Trash2 className="mr-2 h-4 w-4" /> Hapus Pilihan File
            </Button>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Button type="submit" disabled={!canScan} className="w-full text-lg py-6">
        {isScanning ? (
          <Loader2 className="animate-spin mr-2" />
        ) : (
          <ScanLine className="mr-2" />
        )}
        {isScanning ? "Memindai..." : "Pindai Struk"}
      </Button>
    </form>
  );
}
