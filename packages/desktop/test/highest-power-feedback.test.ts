import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("highest power button feedback", () => {
  it("renders highest-power action feedback next to the button area", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const buttonIndex = homePage.indexOf('onClick={() => void equipHighestPowerItems(selectedCharacter)}');
    const feedbackIndex = homePage.indexOf('className="character-action-feedback"');
    const templateMessageIndex = homePage.indexOf('{loadoutMessage ? <p className="notice">{loadoutMessage}</p> : null}\n              {loadoutTemplates.length ?');

    expect(buttonIndex).toBeGreaterThanOrEqual(0);
    expect(feedbackIndex).toBeGreaterThan(buttonIndex);
    expect(feedbackIndex - buttonIndex).toBeLessThan(800);
    expect(templateMessageIndex).toBe(-1);
  });
});
