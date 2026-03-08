import { ParcelMatchResult, getStatusColor, getStatusLabel } from "@/lib/matching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, AlertTriangle, CheckCircle, HelpCircle, Pencil, History as HistoryIcon } from "lucide-react";
import Link from "next/link";

interface ParcelDetailsProps {
  parcel: ParcelMatchResult | null;
  onEditClick?: () => void;
}

export function ParcelDetails({ parcel, onEditClick }: ParcelDetailsProps) {
  if (!parcel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Parcel Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Click on a parcel on the map or search by Plot ID to view details.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const StatusIcon = parcel.status === "matched" 
    ? CheckCircle 
    : parcel.status === "mismatch" 
      ? AlertTriangle 
      : HelpCircle;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {parcel.plot_id}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              style={{ backgroundColor: getStatusColor(parcel.status) }}
              className="text-white"
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {getStatusLabel(parcel.status)}
            </Badge>
            {onEditClick && (
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEditClick}
                  className="h-7 gap-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Link href={`/plots/${parcel.plot_id}/history`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                  >
                    <HistoryIcon className="h-3.5 w-3.5" />
                    History
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Data Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            From Map (GeoJSON)
          </h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Area:</span>
              <span className="font-medium">{Number(parcel.area_map.toFixed(2))} hectares</span>
            </div>
            {parcel.owner_name_map && (
              <div className="flex justify-between text-sm">
                <span>Owner:</span>
                <span className="font-medium">{parcel.owner_name_map}</span>
              </div>
            )}
            {parcel.aadhaar_number_map && (
              <div className="flex justify-between text-sm">
                <span>Aadhaar:</span>
                <span className="font-medium">{parcel.aadhaar_number_map}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Record Data Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            From Records (CSV/DB)
          </h4>
          {parcel.status === "missing" ? (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground italic">
                No matching record found for this plot
              </p>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Area:</span>
                <span className="font-medium">{parcel.area_record?.toFixed(2)} hectares</span>
              </div>
              {parcel.owner_name_record && (
                <div className="flex justify-between text-sm">
                  <span>Owner:</span>
                  <span className="font-medium">{parcel.owner_name_record}</span>
                </div>
              )}
              {parcel.aadhaar_number_record && (
                <div className="flex justify-between text-sm">
                  <span>Aadhaar:</span>
                  <span className="font-medium">{parcel.aadhaar_number_record}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Discrepancy Analysis */}
        {parcel.status === "mismatch" && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-destructive uppercase tracking-wide">
              Discrepancy Detected
            </h4>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
              {parcel.areaDifference !== undefined && parcel.areaDifference > 5 && (
                <div>
                  <p className="text-sm">
                    Area difference: <strong>{parcel.areaDifference.toFixed(1)}%</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Threshold exceeded (max 5% allowed)
                  </p>
                </div>
              )}
              {parcel.owner_name_map && parcel.owner_name_record && 
               parcel.owner_name_map.toLowerCase().trim() !== parcel.owner_name_record.toLowerCase().trim() && (
                <div>
                  <p className="text-sm">
                    <strong>Owner mismatch detected</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Map owner and record owner do not match
                  </p>
                </div>
              )}
              {parcel.aadhaar_number_map && parcel.aadhaar_number_record && 
               parcel.aadhaar_number_map !== parcel.aadhaar_number_record && (
                <div>
                  <p className="text-sm text-destructive font-bold">
                    Aadhaar ID Mismatch
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Different व्यक्ती (Persons) identified despite same name.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
