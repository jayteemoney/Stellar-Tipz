/**
 * Bug Condition Exploration Test
 *
 * Property 1: Fault Condition - Docs Link Resolves to Valid External URL
 *
 * This test MUST FAIL on unfixed code — failure confirms the bug exists.
 * The "Docs" anchor currently has href="/docs" (a broken internal path).
 * Expected: href starts with "https://", target="_blank", rel="noopener noreferrer"
 *
 * Validates: Requirements 1.1, 1.2
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import * as fc from "fast-check";
import Footer from "./Footer";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    language: "en",
    languageNames: {
      en: "English",
      es: "Español",
      fr: "Français",
      pt: "Português",
    },
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        "footer.builtOn": "Built on Stellar",
        "footer.powered": "Powered by Stellar Soroban",
        "footer.product": "Product",
        "footer.resources": "Resources",
        "footer.community": "Community",
        "footer.home": "Home",
        "footer.docs": "Docs",
        "footer.contractSpec": "Contract Spec",
        "footer.license": "Stellar Tipz. MIT License.",
        "footer.language": "Language",
        "nav.leaderboard": "Leaderboard",
        "nav.dashboard": "Dashboard",
      };
      return translations[key] ?? key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer - Bug Condition Exploration (Property 1: Fault Condition)", () => {
  /**
   * Validates: Requirements 1.1, 1.2
   *
   * The "Docs" anchor currently has href="/docs" which is not a defined route.
   * This test asserts the EXPECTED (fixed) behavior — it will FAIL on unfixed code,
   * confirming the bug exists.
   */
  it("Docs link href should start with https:// (FAILS on unfixed code — bug confirmed)", () => {
    renderFooter();

    const docsLink = screen.getByRole("link", { name: /^docs$/i });

    // BUG: href is "/docs" (internal, broken). Expected: starts with "https://"
    expect(docsLink).toHaveAttribute(
      "href",
      expect.stringMatching(/^https:\/\//),
    );
  });

  it("Docs link should have target='_blank' (FAILS on unfixed code — bug confirmed)", () => {
    renderFooter();

    const docsLink = screen.getByRole("link", { name: /^docs$/i });

    // BUG: target attribute is missing. Expected: "_blank"
    expect(docsLink).toHaveAttribute("target", "_blank");
  });

  it("Docs link should have rel='noopener noreferrer' (FAILS on unfixed code — bug confirmed)", () => {
    renderFooter();

    const docsLink = screen.getByRole("link", { name: /^docs$/i });

    // BUG: rel attribute is missing. Expected: "noopener noreferrer"
    expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});

/**
 * Preservation Property Tests
 *
 * Property 2: Preservation - All Other Footer Links Unchanged
 *
 * These tests MUST PASS on unfixed code — they capture the baseline behavior
 * of all non-Docs footer links that must be preserved after the fix.
 *
 * Observed values from unfixed Footer.tsx:
 *   - Home:         <Link to="/">
 *   - Leaderboard:  <Link to="/leaderboard">
 *   - Dashboard:    <Link to="/dashboard">
 *   - GitHub:       href="https://github.com/Akanimoh12/Stellar-Tipz", target="_blank", rel="noopener noreferrer"
 *   - Soroban Docs: href="https://soroban.stellar.org/docs", target="_blank", rel="noopener noreferrer"
 *   - Twitter:      href="https://twitter.com/TipzApp", target="_blank", rel="noopener noreferrer"
 *   - Discord:      href="https://discord.gg/stellardev", target="_blank", rel="noopener noreferrer"
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// Render contexts: all supported locale × color-scheme combinations (4 × 2 = 8).
// The mock always returns "en" translations, but we vary the inputs to confirm
// the component is stable across all supported locales and color schemes.
const renderContexts = [
  ["en", "light"],
  ["en", "dark"],
  ["es", "light"],
  ["es", "dark"],
  ["fr", "light"],
  ["fr", "dark"],
  ["pt", "light"],
  ["pt", "dark"],
] as const;

describe("Footer - Preservation Property Tests (Property 2: Preservation)", () => {
  /**
   * Validates: Requirements 3.1, 3.2, 3.3
   *
   * Internal React Router <Link> components for Home, Leaderboard, Dashboard
   * must retain their `to` prop values across all render contexts.
   *
   * Property-based approach: fc.constantFrom draws from the finite set of
   * render contexts and asserts the invariant holds for every combination.
   */
  it("Home link navigates to / across all render contexts", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...renderContexts),
        ([_locale, _colorScheme]) => {
          const { unmount } = renderFooter();
          const homeLink = screen.getByRole("link", { name: /^home$/i });
          expect(homeLink).toHaveAttribute("href", "/");
          unmount();
        },
      ),
      { numRuns: renderContexts.length },
    );
  });

  it("Leaderboard link navigates to /leaderboard across all render contexts", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...renderContexts),
        ([_locale, _colorScheme]) => {
          const { unmount } = renderFooter();
          const leaderboardLink = screen.getByRole("link", {
            name: /^leaderboard$/i,
          });
          expect(leaderboardLink).toHaveAttribute("href", "/leaderboard");
          unmount();
        },
      ),
      { numRuns: renderContexts.length },
    );
  });

  it("Dashboard link navigates to /dashboard across all render contexts", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...renderContexts),
        ([_locale, _colorScheme]) => {
          const { unmount } = renderFooter();
          const dashboardLink = screen.getByRole("link", {
            name: /^dashboard$/i,
          });
          expect(dashboardLink).toHaveAttribute("href", "/dashboard");
          unmount();
        },
      ),
      { numRuns: renderContexts.length },
    );
  });

  /**
   * Validates: Requirement 3.4
   *
   * The Footer has two GitHub links: the Resources text link ("GitHub") and the
   * footer bar icon link (aria-label="GitHub"). Both must retain the same
   * href/target/rel. We use getAllByRole and assert every GitHub link is correct.
   */
  it("All GitHub links retain href, target, and rel across all render contexts", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...renderContexts),
        ([_locale, _colorScheme]) => {
          const { unmount } = renderFooter();
          const githubLinks = screen.getAllByRole("link", { name: /github/i });
          for (const link of githubLinks) {
            expect(link).toHaveAttribute(
              "href",
              "https://github.com/Akanimoh12/Stellar-Tipz",
            );
            expect(link).toHaveAttribute("target", "_blank");
            expect(link).toHaveAttribute("rel", "noopener noreferrer");
          }
          unmount();
        },
      ),
      { numRuns: renderContexts.length },
    );
  });

  /**
   * Validates: Requirement 3.5
   *
   * The Soroban Docs anchor (text: "Contract Spec") must retain its href, target, and rel.
   */
  it("Soroban Docs link retains href, target, and rel across all render contexts", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...renderContexts),
        ([_locale, _colorScheme]) => {
          const { unmount } = renderFooter();
          const sorobanLink = screen.getByRole("link", {
            name: /contract spec/i,
          });
          expect(sorobanLink).toHaveAttribute(
            "href",
            "https://soroban.stellar.org/docs",
          );
          expect(sorobanLink).toHaveAttribute("target", "_blank");
          expect(sorobanLink).toHaveAttribute("rel", "noopener noreferrer");
          unmount();
        },
      ),
      { numRuns: renderContexts.length },
    );
  });

  /**
   * Validates: Requirement 3.6
   *
   * The Footer has two Twitter links: the Community section link and the footer
   * bar icon link (aria-label="Twitter"). Both must retain the same href/target/rel.
   * We use getAllByRole and assert every Twitter link is correct.
   */
  it("All Twitter links retain href, target, and rel across all render contexts", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...renderContexts),
        ([_locale, _colorScheme]) => {
          const { unmount } = renderFooter();
          const twitterLinks = screen.getAllByRole("link", {
            name: /twitter/i,
          });
          for (const link of twitterLinks) {
            expect(link).toHaveAttribute("href", "https://twitter.com/TipzApp");
            expect(link).toHaveAttribute("target", "_blank");
            expect(link).toHaveAttribute("rel", "noopener noreferrer");
          }
          unmount();
        },
      ),
      { numRuns: renderContexts.length },
    );
  });

  it("Discord link retains href, target, and rel across all render contexts", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...renderContexts),
        ([_locale, _colorScheme]) => {
          const { unmount } = renderFooter();
          const discordLink = screen.getByRole("link", {
            name: /stellar discord/i,
          });
          expect(discordLink).toHaveAttribute(
            "href",
            "https://discord.gg/stellardev",
          );
          expect(discordLink).toHaveAttribute("target", "_blank");
          expect(discordLink).toHaveAttribute("rel", "noopener noreferrer");
          unmount();
        },
      ),
      { numRuns: renderContexts.length },
    );
  });
});
