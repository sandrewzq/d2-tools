import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("highest power button feedback", () => {
  it("renders highest-power action feedback next to the button area", () => {
    const accountPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"),
      "utf8"
    );
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );

    const buttonIndex = accountPage.indexOf("onClick={() => props.onEquipHighestPowerItems(selectedCharacter)}");
    const feedbackIndex = accountPage.indexOf('className="character-action-feedback"');
    const templateMessageIndex = accountPage.indexOf('{props.loadoutMessage ? <p className="notice">{props.loadoutMessage}</p> : null}\n              {props.loadoutTemplates');

    expect(buttonIndex).toBeGreaterThanOrEqual(0);
    expect(feedbackIndex).toBeGreaterThan(buttonIndex);
    expect(feedbackIndex - buttonIndex).toBeLessThan(800);
    expect(accountPage).toContain('aria-describedby="highest-power-feedback"');
    expect(accountPage).toContain('id="highest-power-feedback"');
    expect(accountPage).toContain('role="status"');
    expect(accountPage).toContain('aria-live="polite"');
    expect(styles).toContain(".character-action-feedback");
    expect(styles).toContain("grid-column: 2 / -1");
    expect(templateMessageIndex).toBe(-1);
  });
});
