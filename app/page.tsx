"use client";

import { useCallback, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/SearchBar";
import { ParcelDetails } from "@/components/ParcelDetails";
import { StatsSummary } from "@/components/StatsSummary";
import { Legend } from "@/components/Legend";
import { CSVUploader } from "@/components/CSVUploader";
import { matchParcel, ParcelMatchResult } from "@/lib/matching";
import { MapPin, Database, FileCheck, BarChart3, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ParcelEditDialog } from "@/components/ParcelEditDialog";
import { landRecords, LandRecord } from "@/data/records";
import { useRouter } from "next/navigation";

const ParcelMap = dynamic(() => import("@/components/ParcelMap"), {
  ssr: false,
});

const Home = () => {
  const router = useRouter();
  // State for currently searched plot IDs (can be multiple for owner search)
  const [searchedPlotIds, setSearchedPlotIds] = useState<string[] | null>(null);
  // State for selected parcel details
  const [selectedParcel, setSelectedParcel] =
    useState<ParcelMatchResult | null>(null);
  // State for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  // State for editable records (database or static)
  const [records, setRecords] = useState<LandRecord[]>([...landRecords]);
  // Force re-render key for map when records change
  const [recordsVersion, setRecordsVersion] = useState(0);
  // Loading state for data fetching
  const [loading, setLoading] = useState(true);
  const [usingDatabase, setUsingDatabase] = useState(false);

  // Fetch parcels from database on mount
  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    try {
      const response = await fetch('/api/parcels');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setRecords(data.data);
          setUsingDatabase(true);
        } else {
          // No data in database, use static data
          setRecords([...landRecords]);
          setUsingDatabase(false);
        }
      } else {
        // API error, use static data
        setRecords([...landRecords]);
        setUsingDatabase(false);
      }
    } catch (error) {
      // Network error, use static data
      console.log('Using static data:', error);
      setRecords([...landRecords]);
      setUsingDatabase(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    // Refresh data after successful upload
    fetchParcels();
    setRecordsVersion(v => v + 1);
    toast({
      title: "Data refreshed",
      description: "Parcel data has been updated from the database"
    });
  };

  const handleSearch = (plotIds: string[] | null) => {
    setSearchedPlotIds(plotIds);
  };

  const handleParcelClick = (result: ParcelMatchResult) => {
    setSelectedParcel(result);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  // Helper function to update local state
  const updateLocalState = (
    editedParcel: ParcelMatchResult,
    recordUpdates: { area_record: number; owner_name_record: string },
    newId?: string
  ) => {
    // Update the records array
    setRecords((prevRecords) => {
      const existingIndex = prevRecords.findIndex(
        (r) => r.plot_id === editedParcel.plot_id,
      );

      if (existingIndex >= 0) {
        // Update existing record
        const updated = [...prevRecords];
        updated[existingIndex] = {
          ...updated[existingIndex],
          area_record: recordUpdates.area_record,
          owner_name: recordUpdates.owner_name_record,
          ...(newId ? { id: newId } : {}), // Update ID if provided
        };
        return updated;
      } else {
        // Add new record if it didn't exist
        return [
          ...prevRecords,
          {
            plot_id: editedParcel.plot_id,
            area_record: recordUpdates.area_record,
            owner_name: recordUpdates.owner_name_record,
            ...(newId ? { id: newId } : {}), // Add ID if provided
          },
        ];
      }
    });

    // Update the selected parcel with new data
    setSelectedParcel(
      matchParcel(editedParcel, [
        ...records.map((r) =>
          r.plot_id === editedParcel.plot_id
            ? {
                ...r,
                area_record: recordUpdates.area_record,
                owner_name: recordUpdates.owner_name_record,
                ...(newId ? { id: newId } : {}),
              }
            : r,
        ),
        ...(records.find((r) => r.plot_id === editedParcel.plot_id)
          ? []
          : [
              {
                plot_id: editedParcel.plot_id,
                area_record: recordUpdates.area_record,
                owner_name: recordUpdates.owner_name_record,
                ...(newId ? { id: newId } : {}),
              },
            ]),
      ]),
    );

    // Increment version to trigger map re-render
    setRecordsVersion((v) => v + 1);
  };

  const handleEditSave = useCallback(
    async (
      editedParcel: ParcelMatchResult,
      recordUpdates: { area_record: number; owner_name_record: string },
    ) => {
      try {
        // Find the parcel ID from the database records
        const parcelRecord = records.find(r => r.plot_id === editedParcel.plot_id);
        
        if (!parcelRecord || !('id' in parcelRecord)) {
          // Parcel doesn't exist in database - create it
          const createResponse = await fetch('/api/parcels/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              plotId: editedParcel.plot_id,
              ownerName: recordUpdates.owner_name_record,
              areaRecord: recordUpdates.area_record,
            }),
          });

          if (createResponse.status === 401) {
            toast({
              title: "Session expired",
              description: "Please log in again",
              variant: "destructive"
            });
            router.push('/login');
            return;
          }

          if (createResponse.status === 409) {
            // Already exists but we don't have the ID locally?
            // Fallback: try to fetch it or just error nicely?
            // Ideally we should try to fetch the correct ID or just PUT to it if we knew the ID.
            // But if we get 409, it means it DOES exist.
            // Let's try to update the existing one if we can find it? 
            // We don't have the ID though.
            // We can perhaps refactor GET to findByPlotId? 
            // For now, let's treat it as an error but maybe inform the user to refresh?
             const errorData = await createResponse.json();
             throw new Error(errorData.error || 'Parcel already exists. Please refresh the page.');
          }

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create parcel');
          }

          const newParcel = await createResponse.json();
          
          // Update local state with new parcel ID
          updateLocalState(editedParcel, recordUpdates, newParcel.data.id);

          toast({
            title: "Record created successfully!",
            description: `New parcel created for ${editedParcel.plot_id}`,
          });
          return;
        }

        // Parcel exists - update it
        const response = await fetch(`/api/parcels/${parcelRecord.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ownerName: recordUpdates.owner_name_record,
            areaRecord: recordUpdates.area_record,
          }),
        });

        if (response.status === 401) {
          toast({
            title: "Session expired",
            description: "Please log in again",
            variant: "destructive"
          });
          router.push('/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update parcel');
        }

        const result = await response.json();

        // Update local state after successful API call
        updateLocalState(editedParcel, recordUpdates);

        toast({
          title: "Record updated successfully!",
          description: `Changes saved to database for ${editedParcel.plot_id}`,
        });

      } catch (error) {
        console.error('Error saving parcel:', error);
        toast({
          title: "Error saving changes",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
      }
    },
    [records, router],
  );

  return (
    <div className="bg-background">
      {/* Main Content */}
      <main className="flex flex-col lg:flex-row h-[calc(100vh-65px)] sm:h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-full lg:w-96 bg-card border-r border-border p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto max-h-[40vh] lg:max-h-full">
          {/* CSV Upload */}
          <div className="space-y-2">
            <CSVUploader onUploadSuccess={handleUploadSuccess} />
          </div>

          {/* Data Source Indicator */}
          {!loading && (
            <div className="text-xs text-muted-foreground text-center py-1 px-2 bg-muted/50 rounded">
              {usingDatabase ? (
                <span className="flex items-center justify-center gap-1">
                  <Database className="h-3 w-3" />
                  Using database records
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <FileCheck className="h-3 w-3" />
                  Using demo data
                </span>
              )}
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Search Parcels
            </h2>
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Statistics Summary */}
          <div className="space-y-2">
            <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Verification Summary
            </h2>
            <StatsSummary records={records} key={recordsVersion} />
          </div>

          {/* Selected Parcel Details */}
          <ParcelDetails
            parcel={selectedParcel}
            onEditClick={selectedParcel ? handleEditClick : undefined}
          />

          {/* Legend */}
          <div className="pt-2 border-t border-border">
            <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">
              Map Legend
            </h2>
            <Legend />
          </div>
        </aside>

        {/* Map Container */}
        <section className="flex-1 p-2 sm:p-4 min-h-[50vh] lg:min-h-0">
          <div className="h-full rounded-lg overflow-hidden border border-border shadow-sm">
            <ParcelMap
              searchedPlotIds={searchedPlotIds}
              onParcelClick={handleParcelClick}
              onSearchComplete={() => setSearchedPlotIds(null)}
              records={records}
              key={recordsVersion}
            />
          </div>
        </section>
      </main>

      {/* Edit Dialog */}
      <ParcelEditDialog
        parcel={selectedParcel}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditSave}
      />
    </div>
  );
};

export default Home;
