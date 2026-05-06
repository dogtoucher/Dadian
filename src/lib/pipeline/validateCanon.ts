import type { CanonExtraction } from "@/lib/validation/schemas";
import {
  checkRejectedDirectionReappears,
  checkHardConstraintViolations
} from "@/lib/validation/conflicts";
import type { Constraint } from "@/lib/db/constraints";
import type { Fact } from "@/lib/db/facts";

export type ValidationResult = {
  safeToCommit: boolean;
  conflicts: Array<{
    severity: "low" | "medium" | "high";
    newClaim: string;
    existingClaim?: string;
    recommendation:
      | "accept"
      | "reject"
      | "mark_disputed"
      | "requires_user_review";
  }>;
};

export function validateCanon(
  extraction: CanonExtraction,
  existingAcceptedFacts: Fact[],
  constraints: Constraint[]
): ValidationResult {
  const conflicts: ValidationResult["conflicts"] = [];

  const rejectedDirections = constraints
    .filter((c) => c.constraintType === "negative")
    .map((c) => c.text);

  const hardConstraints = constraints.filter(
    (c) => c.constraintType === "negative" && c.strength === "hard"
  );

  const reappearing = checkRejectedDirectionReappears(
    extraction.facts.map((f) => ({ factText: f.factText })),
    rejectedDirections
  );

  for (const msg of reappearing) {
    conflicts.push({ severity: "high", newClaim: msg, recommendation: "reject" });
  }

  const violations = checkHardConstraintViolations(
    extraction.facts.map((f) => ({ factText: f.factText })),
    hardConstraints
  );

  for (const msg of violations) {
    conflicts.push({ severity: "high", newClaim: msg, recommendation: "reject" });
  }

  for (const fact of extraction.facts) {
    if (fact.statusHint === "disputed" || fact.statusHint === "legendary") {
      const existing = existingAcceptedFacts.find(
        (ef) =>
          ef.subjectEntityId &&
          fact.subject &&
          ef.factText.toLowerCase().includes(fact.subject.toLowerCase())
      );
      if (existing) {
        conflicts.push({
          severity: "medium",
          newClaim: fact.factText,
          existingClaim: existing.factText,
          recommendation: "mark_disputed"
        });
      }
    }
  }

  return {
    safeToCommit: !conflicts.some(
      (c) => c.severity === "high" && c.recommendation === "reject"
    ),
    conflicts
  };
}
