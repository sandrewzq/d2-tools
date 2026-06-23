import type { DailySummary } from "../../api/client";
import { DailySummaryPanel } from "../../shared/components/DailySummaryPanel";

export function DailyPage(props: {
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoading: boolean;
  onRefresh: () => void;
  onCopyDailySummary: () => void;
  onCopyWeeklyFocus: () => void;
}) {
  return <DailySummaryPanel {...props} />;
}
