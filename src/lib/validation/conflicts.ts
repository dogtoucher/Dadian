import type { Fact } from "@/lib/db/facts";
import type { Constraint } from "@/lib/db/constraints";

export function checkDuplicateEntitySlug(facts: Fact[]): string[] {
  const slugs = new Set<string>();
  const duplicates: string[] = [];
  for (const f of facts) {
    if (f.subjectEntityId && slugs.has(f.subjectEntityId)) {
      duplicates.push(f.factText);
    }
    if (f.subjectEntityId) slugs.add(f.subjectEntityId);
  }
  return duplicates;
}

export function checkRejectedDirectionReappears(
  newFacts: { factText: string }[],
  rejectedTexts: string[]
) {
  const problems: string[] = [];
  for (const fact of newFacts) {
    const lower = fact.factText.toLowerCase();
    for (const rejected of rejectedTexts) {
      if (lower.includes(rejected.toLowerCase())) {
        problems.push(
          `事实 "${fact.factText}" 与已拒绝方向冲突: "${rejected}"`
        );
      }
    }
  }
  return problems;
}

export function checkHardConstraintViolations(
  newFacts: { factText: string }[],
  constraints: Constraint[]
) {
  const hardNegatives = constraints.filter(
    (c) => c.constraintType === "negative" && c.strength === "hard"
  );
  const violations: string[] = [];

  for (const fact of newFacts) {
    for (const c of hardNegatives) {
      if (fact.factText.toLowerCase().includes(c.text.toLowerCase())) {
        violations.push(
          `事实 "${fact.factText}" 违反硬约束: "${c.text}"`
        );
      }
    }
  }

  return violations;
}
