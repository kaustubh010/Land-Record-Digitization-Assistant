"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { parcelsGeoJSON } from "@/data/parcels";
import { landRecords, LandRecord } from "@/data/records";
import {
  matchParcel,
  getStatusLabel,
  getStatusColor,
  MatchStatus,
  ParcelMatchResult,
} from "@/lib/matching";
import {
  MapPin,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Pencil,
  Database,
  FileCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { ParcelEditDialog } from "@/components/ParcelEditDialog";

const Dashboard = () => {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Data state
  const [records, setRecords] = useState<LandRecord[]>([...landRecords]);
  const [loading, setLoading] = useState(true);
  const [usingDatabase, setUsingDatabase] = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<ParcelMatchResult | null>(null);

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

  // Process all parcels and compute statistics
  const { matchResults, stats, areaComparisonData, statusDistribution } =
    useMemo(() => {
      const results = parcelsGeoJSON.features.map((feature) =>
        matchParcel(feature.properties, records),
      );

      const matched = results.filter((r) => r.status === "matched").length;
      const mismatch = results.filter((r) => r.status === "mismatch").length;
      const missing = results.filter((r) => r.status === "missing").length;
      const totalMapArea = results.reduce((sum, r) => sum + r.area_map, 0);
      const totalRecordArea = results.reduce(
        (sum, r) => sum + (r.area_record || 0),
        0,
      );

      return {
        matchResults: results,
        stats: {
          total: results.length,
          matched,
          mismatch,
          missing,
          matchRate: ((matched / results.length) * 100).toFixed(1),
          totalMapArea: totalMapArea.toFixed(2),
          totalRecordArea: totalRecordArea.toFixed(2),
        },
        areaComparisonData: results
          .filter((r) => r.area_record !== undefined)
          .map((r) => ({
            plot_id: r.plot_id,
            "Map Area": r.area_map,
            "Record Area": r.area_record,
          })),
        statusDistribution: [
          { name: "Matched", value: matched, color: getStatusColor("matched") },
          {
            name: "Mismatch",
            value: mismatch,
            color: getStatusColor("mismatch"),
          },
          { name: "Missing", value: missing, color: getStatusColor("missing") },
        ],
      };
    }, [records]);

  const handleDownloadReport = () => {
    // Generate CSV report
    const headers = [
      "Plot ID",
      "Status",
      "Map Area (ha)",
      "Record Area (ha)",
      "Owner (Map)",
      "Owner (Record)",
      "Area Diff (%)",
    ];
    const rows = matchResults.map((r) => [
      r.plot_id,
      getStatusLabel(r.status),
      r.area_map.toFixed(2),
      r.area_record?.toFixed(2) || "N/A",
      r.owner_name_map || "N/A",
      r.owner_name_record || "N/A",
      r.areaDifference?.toFixed(1) || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `land_verification_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const getStatusBadgeVariant = (status: MatchStatus) => {
    switch (status) {
      case "matched":
        return "default";
      case "mismatch":
        return "destructive";
      case "missing":
        return "secondary";
    }
  };

  const chartConfig = {
    "Map Area": { label: "Map Area", color: "hsl(var(--primary))" },
    "Record Area": {
      label: "Record Area",
      color: "hsl(var(--muted-foreground))",
    },
  };

  const handleEditClick = (e: React.MouseEvent, result: ParcelMatchResult) => {
    e.stopPropagation(); // Prevent row expansion when clicking edit
    setSelectedParcel(result);
    setEditDialogOpen(true);
  };

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
          ...(newId ? { id: newId } : {}),
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
            ...(newId ? { id: newId } : {}),
          },
        ];
      }
    });

    // Update selected parcel to reflect changes immediately in dialog if needed
    setSelectedParcel(prev => prev ? ({
      ...prev,
      area_record: recordUpdates.area_record,
      owner_name_record: recordUpdates.owner_name_record,
    }) : null);
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
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Parcel already exists. Please refresh the page.');
          }

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create parcel');
          }

          const newParcel = await createResponse.json();
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
    <div className="min-h-screen bg-background overflow-hidden flex flex-col">
      {/* Header/Info Bar */}
      <div className="bg-muted/30 border-b p-2 px-4 sm:px-6 flex justify-between items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {!loading && (
            usingDatabase ? (
              <span className="flex items-center gap-1 text-primary">
                <Database className="h-3 w-3" />
                Live Database
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <FileCheck className="h-3 w-3" />
                Demo Data
              </span>
            )
          )}
        </div>
        <div>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto overflow-y-auto w-full">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Parcels
              </CardTitle>
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold">
                {stats.total}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Parcels on map
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Matched
              </CardTitle>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.matched}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {stats.matchRate}% match rate
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Mismatches
              </CardTitle>
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.mismatch}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Area discrepancies &gt;5%
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-gray-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Missing
              </CardTitle>
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-gray-600 dark:text-gray-400">
                {stats.missing}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                No matching record
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Status Distribution Pie Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-5 w-5" />
                Status Distribution
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Parcel verification results
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="h-[220px] sm:h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value, percent }) =>
                        `${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={{
                        stroke: "hsl(var(--foreground))",
                        strokeWidth: 1,
                      }}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{
                        color: "hsl(var(--foreground))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 sm:gap-6 mt-3 sm:mt-4 flex-wrap">
                {statusDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Area Comparison Bar Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-5 w-5" />
                Area Comparison
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Map vs Record (hectares)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="w-full overflow-x-auto no-scrollbar">
                <div
                  style={{
                    minWidth: `${Math.max(400, areaComparisonData.length * 60)}px`,
                  }}
                  className="h-[250px] sm:h-[280px]"
                >
                  <ChartContainer
                    config={chartConfig}
                    className="h-full w-full"
                  >
                    <BarChart
                      data={areaComparisonData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="plot_id"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10 }}
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="Map Area"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Record Area"
                        fill="hsl(var(--muted-foreground))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-primary flex-shrink-0" />
                  <span className="text-muted-foreground">Map Area</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Record Area</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Data Table */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">
                  Detailed Parcel Report
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Complete list of all parcels with verification status
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadReport}
                className="h-8 px-3 text-xs"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap pl-4">
                        Plot ID
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">
                        Map (ha)
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">
                        Record (ha)
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap hidden sm:table-cell">
                        Diff (%)
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">
                        Owner (Map)
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">
                        Owner (Record)
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm text-right pr-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.map((result) => {
                      const isExpanded = expandedRows.has(result.plot_id);
                      const feature = parcelsGeoJSON.features.find(
                        f => f.properties.plot_id === result.plot_id
                      );
                      const coordinates = feature?.geometry.type === "Polygon"
                        ? feature.geometry.coordinates[0] as [number, number][]
                        : [];

                      return (
                        <>
                          <TableRow
                            key={result.plot_id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              const newExpanded = new Set(expandedRows);
                              if (isExpanded) {
                                newExpanded.delete(result.plot_id);
                              } else {
                                newExpanded.add(result.plot_id);
                              }
                              setExpandedRows(newExpanded);
                            }}
                          >
                            <TableCell className="font-medium text-xs sm:text-sm pl-4">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                {result.plot_id}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(result.status)}
                                className="text-[10px] sm:text-xs"
                              >
                                {getStatusLabel(result.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm">
                              {result.area_map.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm">
                              {result.area_record?.toFixed(2) || "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">
                              {result.areaDifference !== undefined ? (
                                <span
                                  className={
                                    result.areaDifference > 5
                                      ? "text-red-600 dark:text-red-400 font-medium"
                                      : "text-green-600 dark:text-green-400"
                                  }
                                >
                                  {result.areaDifference.toFixed(1)}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                              {result.owner_name_map || "—"}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                              {result.owner_name_record || "—"}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleEditClick(e, result)}
                                className="h-7 gap-1.5 text-xs"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${result.plot_id}-details`} className="hover:bg-transparent">
                              <TableCell colSpan={8} className="p-0 border-t-0">
                                <div className="p-4 bg-muted/30 inner-shadow-sm">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <h4 className="flex items-center gap-2 font-semibold text-sm text-primary">
                                        <FileText className="h-4 w-4" />
                                        Parcel Details
                                      </h4>
                                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Plot ID</span>
                                          <span className="font-medium">{result.plot_id}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                                          <span>
                                            <Badge variant={getStatusBadgeVariant(result.status)} className="text-[10px]">
                                              {getStatusLabel(result.status)}
                                            </Badge>
                                          </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Map Area</span>
                                          <span className="font-medium">{result.area_map.toFixed(2)} ha</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Record Area</span>
                                          <span className="font-medium">{result.area_record?.toFixed(2) || "N/A"} ha</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Owner (Map)</span>
                                          <span className="font-medium">{result.owner_name_map || "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Owner (Record)</span>
                                          <span className="font-medium">{result.owner_name_record || "N/A"}</span>
                                        </div>
                                      </div>
                                      {result.areaDifference !== undefined && (
                                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background text-sm">
                                          <span className="font-medium">Area Difference</span>

                                          <span
                                            className={`px-2 py-0.5 rounded text-xs font-bold ${result.areaDifference > 5
                                                ? "bg-destructive/10 text-destructive"
                                                : "bg-green-600/10 text-green-600"
                                              }`}
                                          >
                                            {result.areaDifference.toFixed(1)}%
                                          </span>
                                        </div>
                                      )}

                                    </div>

                                    {coordinates.length > 0 && (
                                      <div className="space-y-4">
                                        <h5 className="flex items-center gap-2 font-semibold text-sm text-primary">
                                          <MapPin className="h-4 w-4" />
                                          Boundary Coordinates
                                        </h5>
                                        <div className="bg-background rounded-lg border p-0 overflow-hidden shadow-sm">
                                          <div className="max-h-[220px] overflow-y-auto p-3">
                                            <Table>
                                              <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                  <TableHead className="h-8 text-xs">Point</TableHead>
                                                  <TableHead className="h-8 text-xs text-right">Latitude</TableHead>
                                                  <TableHead className="h-8 text-xs text-right">Longitude</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {coordinates.map((coord, idx) => (
                                                  <TableRow key={idx} className="hover:bg-muted/50">
                                                    <TableCell className="py-1 text-xs text-muted-foreground">{idx + 1}</TableCell>
                                                    <TableCell className="py-1 text-xs font-mono text-right">{coord[1].toFixed(6)}</TableCell>
                                                    <TableCell className="py-1 text-xs font-mono text-right">{coord[0].toFixed(6)}</TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
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

export default Dashboard;
