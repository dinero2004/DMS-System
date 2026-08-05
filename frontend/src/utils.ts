export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "n/a";
  }
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
