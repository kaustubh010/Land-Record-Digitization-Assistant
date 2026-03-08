import { useState, useEffect } from "react";
import { ParcelMatchResult } from "@/lib/matching";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X, Map, FileText } from "lucide-react";

interface ParcelEditDialogProps {
  parcel: ParcelMatchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (editedParcel: ParcelMatchResult, recordUpdates: { area_record: number; owner_name_record: string }) => void;
}

export function ParcelEditDialog({
  parcel,
  open,
  onOpenChange,
  onSave,
}: ParcelEditDialogProps) {
  // Map data (read-only display)
  const [areaMap, setAreaMap] = useState("");
  const [ownerNameMap, setOwnerNameMap] = useState("");
  
  // Record data (editable)
  const [areaRecord, setAreaRecord] = useState("");
  const [ownerNameRecord, setOwnerNameRecord] = useState("");

  // Reset form when parcel changes or dialog opens
  useEffect(() => {
    if (parcel && open) {
      // Map data
      setAreaMap(parcel.area_map.toFixed(2));
      setOwnerNameMap(parcel.owner_name_map || "N/A");
      
      // Record data
      setAreaRecord(parcel.area_record?.toString() || "");
      setOwnerNameRecord(parcel.owner_name_record || "");
    }
  }, [parcel, open]);

  const handleSave = () => {
    if (!parcel) return;

    const updatedAreaRecord = parseFloat(areaRecord) || parcel.area_record || 0;
    
    // Calculate new status based on area difference
    const areaDiff = parcel.area_map > 0 && updatedAreaRecord > 0
      ? Math.abs(parcel.area_map - updatedAreaRecord) / ((parcel.area_map + updatedAreaRecord) / 2) * 100
      : 0;
    
    const newStatus = updatedAreaRecord === 0 ? "missing" : areaDiff > 5 ? "mismatch" : "matched";

    const editedParcel: ParcelMatchResult = {
      ...parcel,
      area_record: updatedAreaRecord,
      owner_name_record: ownerNameRecord || undefined,
      status: newStatus,
      areaDifference: areaDiff > 0 ? areaDiff : undefined,
    };

    onSave(editedParcel, {
      area_record: updatedAreaRecord,
      owner_name_record: ownerNameRecord,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!parcel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Edit Parcel: {parcel.plot_id}
          </DialogTitle>
          <DialogDescription>
            Edit the record (CSV) data for this parcel. Map data is shown for reference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Map Data Section (Read-only) */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Map className="h-4 w-4" />
              Map Data (GeoJSON) - Read Only
            </h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Area (hectares)</Label>
                  <p className="font-medium">{areaMap}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Owner Name</Label>
                  <p className="font-medium">{ownerNameMap}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Record Data Section (Editable) */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Record Data (CSV) - Editable
            </h4>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="area-record" className="text-sm font-medium">
                  Area (hectares)
                </Label>
                <Input
                  id="area-record"
                  type="number"
                  step="0.01"
                  value={areaRecord}
                  onChange={(e) => setAreaRecord(e.target.value)}
                  placeholder="Enter area in hectares"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-name-record" className="text-sm font-medium">
                  Owner Name
                </Label>
                <Input
                  id="owner-name-record"
                  value={ownerNameRecord}
                  onChange={(e) => setOwnerNameRecord(e.target.value)}
                  placeholder="Enter owner name"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="text-primary">ℹ️</span>
              <span>
                Changes will update the record data and re-calculate the match status.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
