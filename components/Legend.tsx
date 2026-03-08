import { getStatusColor, getStatusLabel, MatchStatus } from "@/lib/matching";

const statuses: MatchStatus[] = ["matched", "mismatch", "missing"];

export function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {statuses.map(status => (
        <div key={status} className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: getStatusColor(status), opacity: 0.6 }}
          />
          <span>{getStatusLabel(status)}</span>
        </div>
      ))}
    </div>
  );
}
