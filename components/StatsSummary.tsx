import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { parcelsGeoJSON, ParcelProperties } from "@/data/parcels";
import { matchParcel } from "@/lib/matching";
import { LandRecord } from "@/data/records";
import { CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface StatsSummaryProps {
  records: LandRecord[];
}

export function StatsSummary({ records }: StatsSummaryProps) {
  const stats = useMemo(() => {
    let matched = 0;
    let mismatch = 0;
    let missing = 0;
    
    // Analyze each parcel from map data
    parcelsGeoJSON.features.forEach(feature => {
      const props = feature.properties as ParcelProperties;
      const result = matchParcel(props, records);
      
      switch (result.status) {
        case "matched":
          matched++;
          break;
        case "mismatch":
          mismatch++;
          break;
        case "missing":
          missing++;
          break;
      }
    });
    
    return {
      total: parcelsGeoJSON.features.length,
      matched,
      mismatch,
      missing
    };
  }, [records]);
  
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-status-matched/10 border-status-matched/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-status-matched" />
            <div>
              <p className="text-2xl font-bold text-status-matched">{stats.matched}</p>
              <p className="text-xs text-muted-foreground">Matched</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-status-mismatch/10 border-status-mismatch/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-status-mismatch" />
            <div>
              <p className="text-2xl font-bold text-status-mismatch">{stats.mismatch}</p>
              <p className="text-xs text-muted-foreground">Mismatch</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="col-span-2 bg-status-missing/10 border-status-missing/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-status-missing" />
            <div>
              <p className="text-2xl font-bold text-status-missing">{stats.missing}</p>
              <p className="text-xs text-muted-foreground">Missing Record</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}