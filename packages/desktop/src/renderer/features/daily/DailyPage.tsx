import type { DailySummary } from "../../api/types";
import { DailySummaryPanel } from "../../shared/components/DailySummaryPanel";

export function DailyPage(props: {
  dailySummary: DailySummary | null;
  dailyMessage: string;
  dailyError: string;
  isLoading: boolean;
  onRefresh: () => void;
  onCopyWeeklyFocus: () => void;
}) {
  return <DailySummaryPanel {...props} />;
}
