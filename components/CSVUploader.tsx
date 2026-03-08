"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CSVUploaderProps {
  onUploadSuccess?: () => void;
}

export function CSVUploader({ onUploadSuccess }: CSVUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedCsv, setSelectedCsv] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  // ================= LOGIN GATE =================
  if (!user) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3 text-center">
          <p className="text-sm font-medium">Login required</p>

          <p className="text-xs text-muted-foreground">
            Please login or create an account to upload parcel data.
          </p>

          <div className="flex gap-2">
            <Button size="sm" className="w-full" asChild>
              <a href="/login">Login</a>
            </Button>

            <Button size="sm" variant="outline" className="w-full" asChild>
              <a href="/register">Sign up</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ================= FILE HANDLING =================

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".csv")) {
        setUploadStatus({
          type: "error",
          message: "Please upload a CSV file only."
        });
        return;
      }
      setSelectedCsv(file);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files));
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleUpload = async () => {
    if (!selectedCsv && selectedImages.length === 0) {
      setUploadStatus({
        type: "error",
        message: "Please select a CSV file or images to process."
      });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const formData = new FormData();
      if (selectedCsv) {
        formData.append("file", selectedCsv);
      }
      
      selectedImages.forEach(image => {
        formData.append("images", image);
      });

      const response = await fetch("/api/parcels/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadStatus({
          type: "error",
          message: data.error || "Upload failed"
        });

        toast({
          title: "Upload failed",
          description: data.error || "Processing failed",
          variant: "destructive"
        });
      } else {
        setUploadStatus({
          type: "success",
          message: `${data.count} parcels processed`
        });

        toast({
          title: "Processing complete",
          description: `${data.count} parcels ${selectedCsv ? 'uploaded' : 'processed'} successfully`
        });

        if (onUploadSuccess) onUploadSuccess();
      }
    } catch {
      setUploadStatus({
        type: "error",
        message: "Network error. Try again."
      });

      toast({
        title: "Upload failed",
        description: "Network error",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      setSelectedCsv(null);
      setSelectedImages([]);
    }
  };

  return (
    <Card className="border-2 border-primary/10 shadow-md overflow-hidden">
      <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
          <Upload className="h-4 w-4" />
          Data Record Uploader
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="space-y-3">
          <div className="bg-muted/30 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:bg-muted/50 transition-colors">
            <label className="text-xs font-semibold block mb-2 text-muted-foreground uppercase tracking-wider">
              1. Master CSV (Meta Data)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvChange}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 cursor-pointer"
            />
            {selectedCsv && (
               <p className="mt-2 text-[10px] text-green-600 font-medium">✓ {selectedCsv.name} selected</p>
            )}
          </div>

          <div className="bg-muted/30 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:bg-muted/50 transition-colors">
            <label className="text-xs font-semibold block mb-2 text-muted-foreground uppercase tracking-wider">
              2. Land Records (Images/PDF)
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleImagesChange}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
            {selectedImages.length > 0 && (
               <p className="mt-2 text-[10px] text-primary font-medium">✓ {selectedImages.length} file(s) selected</p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          className="w-full font-bold shadow-sm"
          onClick={handleUpload}
          disabled={uploading || (!selectedCsv && selectedImages.length === 0)}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Records...
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                Upload & Update Map
              </div>
            </>
          )}
        </Button>

        {uploadStatus.type && (
          <Alert
            variant={uploadStatus.type === "error" ? "destructive" : "default"}
            className="py-2"
          >
            <AlertDescription className="text-xs font-medium text-center">
              {uploadStatus.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-[10px] text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-secondary/30">
          <p className="font-bold mb-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Instant Update Support:
          </p>
          <ul className="space-y-1 pl-1">
            <li>• CSV: Bulk metadata updates for all plots.</li>
            <li>• Images: Upload any land record to see <strong>Plot 2</strong> history instantly.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
