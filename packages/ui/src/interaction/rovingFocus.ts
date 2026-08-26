export type RovingFocusOrientation = "horizontal" | "vertical" | "both";

export function getRovingFocusIndex(input: {
  key: string;
  currentIndex: number;
  itemCount: number;
  orientation: RovingFocusOrientation;
}): number | null {
  if (input.itemCount <= 0 || input.currentIndex < 0) return null;
  if (input.key === "Home") return 0;
  if (input.key === "End") return input.itemCount - 1;

  const isPrevious = (input.key === "ArrowLeft" && input.orientation !== "vertical")
    || (input.key === "ArrowUp" && input.orientation !== "horizontal");
  const isNext = (input.key === "ArrowRight" && input.orientation !== "vertical")
    || (input.key === "ArrowDown" && input.orientation !== "horizontal");

  if (!isPrevious && !isNext) return null;
  const offset = isNext ? 1 : -1;
  return (input.currentIndex + offset + input.itemCount) % input.itemCount;
}
