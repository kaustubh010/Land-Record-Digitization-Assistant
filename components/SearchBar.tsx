import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parcelsGeoJSON, ParcelProperties } from "@/data/parcels";

interface SearchBarProps {
  onSearch: (plotIds: string[] | null) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Get all valid plot IDs for validation
  const validPlotIds = parcelsGeoJSON.features.map(
    f => (f.properties as ParcelProperties).plot_id
  );
  
  const handleSearch = () => {
    const trimmed = searchValue.trim().toUpperCase();
    
    if (!trimmed) {
      setError(null);
      onSearch(null);
      return;
    }
    
    // Check if it's a plot ID search
    if (validPlotIds.includes(trimmed)) {
      setError(null);
      onSearch([trimmed]);
      return;
    }
    
    // Search by owner name (case-insensitive)
    const matchingParcels = parcelsGeoJSON.features.filter(f => {
      const ownerName = (f.properties as ParcelProperties).owner_name_map;
      return ownerName && ownerName.toLowerCase().includes(searchValue.trim().toLowerCase());
    });
    
    if (matchingParcels.length > 0) {
      const plotIds = matchingParcels.map(f => (f.properties as ParcelProperties).plot_id);
      setError(null);
      onSearch(plotIds);
    } else {
      setError(`No plots found for "${trimmed}"`);
      onSearch(null);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  
  const handleClear = () => {
    setSearchValue("");
    setError(null);
    onSearch(null);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by Plot ID or Owner Name"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>
          Search
        </Button>
        {searchValue && (
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
