import { AlertTriangle, Loader2 } from "lucide-react";

type StatusProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyLabel?: string;
};

export function Status({ loading, error, empty, emptyLabel = "No records found" }: StatusProps) {
  if (loading) {
    return (
      <div className="state-line">
        <Loader2 aria-hidden="true" className="spin" size={16} />
        <span>Loading</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-line error">
        <AlertTriangle aria-hidden="true" size={16} />
        <span>{error}</span>
      </div>
    );
  }

  if (empty) {
    return <div className="state-line">{emptyLabel}</div>;
  }

  return null;
}
