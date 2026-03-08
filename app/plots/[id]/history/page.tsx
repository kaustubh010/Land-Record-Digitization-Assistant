"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  History, 
  ArrowRight, 
  ChevronRight, 
  Calendar, 
  User, 
  Maximize2 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

interface HistoryEntry {
  id: string;
  ownerName: string;
  ownershipStartDate: string | null;
  ownershipEndDate: string | null;
  transactionType: string;
  area: number;
  remarks?: string;
  documentNo?: string;
  sourceDocument?: {
    rawOcrText: string;
    extractedData: any;
    uploadedAt: string;
  };
}

export default function PlotHistoryPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ parcel: any; history: HistoryEntry[] } | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/parcels/${id}/history`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rouned-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold">Plot Not Found</h1>
        <p className="text-muted-foreground mt-2">Could not find history for plot {id}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Plot History: {id}
          </h1>
          <p className="text-muted-foreground">
            Chronological ownership timeline and historical Jamabandi records.
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          Current Area: {data.parcel.areaRecord} Hectares
        </Badge>
      </div>

      <div className="relative border-l-2 border-primary/20 ml-4 pl-8 space-y-12">
        {data.history.map((entry, index) => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-[41px] top-1 h-6 w-6 rounded-full bg-background border-4 border-primary shadow-sm z-10" />
            
            <Card className="overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-primary/40">
              <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {entry.ownershipStartDate && !isNaN(Date.parse(entry.ownershipStartDate)) 
                      ? new Date(entry.ownershipStartDate).toLocaleDateString() 
                      : (entry.ownershipStartDate || 'Initial')} 
                    {entry.ownershipEndDate && (
                      <>
                        {' — '}
                        {!isNaN(Date.parse(entry.ownershipEndDate)) 
                          ? new Date(entry.ownershipEndDate).toLocaleDateString() 
                          : entry.ownershipEndDate}
                      </>
                    )}
                  </span>
                  <Badge variant="secondary" className="capitalize text-[10px] h-5">{entry.transactionType}</Badge>
                  {entry.documentNo && (
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border">
                      Doc: {entry.documentNo}
                    </span>
                  )}
                </div>
                {entry.sourceDocument && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 gap-1 text-xs"
                    onClick={() => setSelectedDoc(entry)}
                  >
                    <FileText className="h-3 w-3" />
                    View Source
                  </Button>
                )}
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Holder Name</p>
                    <p className="text-base font-bold text-foreground">{entry.ownerName}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Area</p>
                    <p className="text-sm font-semibold">{entry.area} Hectares</p>
                  </div>
                  
                  {entry.remarks && (
                    <div className="space-y-1 col-span-full">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Remarks</p>
                      <p className="text-sm italic text-muted-foreground">{entry.remarks}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Document Preview Modal */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Source Evidence: {selectedDoc?.ownerName}
            </DialogTitle>
            <DialogDescription>
              OCR extracted text and metadata from the land record document.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-6">
             <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Raw OCR Text</h4>
                <div className="text-sm font-mono whitespace-pre-wrap leading-relaxed opacity-80">
                  {selectedDoc?.sourceDocument?.rawOcrText}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Extraction Date</p>
                  <p className="font-medium text-sm">
                    {selectedDoc?.sourceDocument?.uploadedAt ? new Date(selectedDoc.sourceDocument.uploadedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Verification</p>
                  <Badge variant="secondary">Automated OCR</Badge>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
