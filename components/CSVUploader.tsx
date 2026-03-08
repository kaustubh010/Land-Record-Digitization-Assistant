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
    // if (e.target.files) {
    //   setSelectedImages(Array.from(e.target.files));
    // }
    return;
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
          description: `${data.count} parcels ${selectedCsv ? 'uploaded' : 'extracted'} successfully`
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Data
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">1. Select CSV File (Optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvChange}
            className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">2. Select Document Images (Optional)</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleImagesChange}
            className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={handleUpload}
          disabled={uploading || (!selectedCsv && selectedImages.length === 0)}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing (AI OCR)
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Process
            </>
          )}
        </Button>

        {uploadStatus.type && (
          <Alert
            variant={uploadStatus.type === "error" ? "destructive" : "default"}
          >
            <AlertDescription className="text-xs">
              {uploadStatus.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-[10px] text-muted-foreground space-y-1 bg-muted/30 p-2 rounded">
          <p className="font-semibold">Support:</p>
          <p>• Upload CSV for bulk parcel metadata.</p>
          <p>• Upload Images for automated AI extraction & History.</p>
          <p>• Mix both: AI matches image data to CSV records.</p>
        </div>
      </CardContent>
    </Card>
  );
}
