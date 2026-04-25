import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge, { getTierFromScore } from "../Badge";

describe("Badge", () => {
  it.each([
    ["bronze", "Bronze", "🥉"],
    ["silver", "Silver", "🥈"],
    ["gold", "Gold", "🥇"],
    ["diamond", "Diamond", "💎"],
  ] as const)("renders the %s tier with the right label and emoji", (tier, label, emoji) => {
    render(<Badge tier={tier} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(emoji)).toBeInTheDocument();
  });

  it("does not render the score parens when score is omitted", () => {
    render(<Badge tier="gold" />);
    // No element matching "(<number>)" pattern.
    expect(screen.queryByText(/^\(\d+\)$/)).toBeNull();
  });

  it("renders the score in parentheses when provided", () => {
    render(<Badge tier="gold" score={750} />);
    expect(screen.getByText("(750)")).toBeInTheDocument();
  });

  it("renders score=0 (zero is a valid value, not falsy)", () => {
    render(<Badge tier="bronze" score={0} />);
    expect(screen.getByText("(0)")).toBeInTheDocument();
  });

  it("merges a custom className onto the wrapper span", () => {
    const { container } = render(<Badge tier="silver" className="ml-4" />);
    expect(container.firstChild).toHaveClass("ml-4");
  });
});

describe("getTierFromScore", () => {
  it.each([
    [0, "bronze"],
    [400, "bronze"],
    [401, "silver"],
    [700, "silver"],
    [701, "gold"],
    [900, "gold"],
    [901, "diamond"],
    [1000, "diamond"],
  ] as const)("score %i → %s", (score, expected) => {
    expect(getTierFromScore(score)).toBe(expected);
  });
});
