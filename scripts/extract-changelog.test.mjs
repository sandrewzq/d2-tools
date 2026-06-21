import { describe, it, expect } from 'vitest';
import { extractChangelogSection } from './extract-changelog.mjs';

describe('extractChangelogSection', () => {
  it('returns trimmed section content for matching version', () => {
    const content = `## 0.0.4 - 2026-06-20\n\n### Added\n- Feature A\n\n## 0.0.3 - 2026-06-19\n\n### Fixed\n- Bug B`;
    const result = extractChangelogSection(content, '0.0.4');
    expect(result).toBe('### Added\n- Feature A');
  });

  it('returns null when version section is not found', () => {
    const content = `## 0.0.4\n\n- Feature`;
    const result = extractChangelogSection(content, '0.0.99');
    expect(result).toBeNull();
  });
});
