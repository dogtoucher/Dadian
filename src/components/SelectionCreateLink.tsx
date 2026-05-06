"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { constraintsApiPath, wikiTitlePath } from "@/lib/routes";

type SelectionState = {
  text: string;
  x: number;
  y: number;
};

type Action = "open" | "reject";

export function SelectionCreateLink({
  worldId,
  isEditMode = false
}: {
  worldId: string;
  isEditMode?: boolean;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<SelectionState | null>(null);

  useEffect(() => {
    function updateSelection() {
      const selected = window.getSelection();
      const text = selected?.toString().replace(/\s+/g, " ").trim() ?? "";

      if (
        !selected ||
        selected.rangeCount === 0 ||
        text.length < 2 ||
        text.length > 40
      ) {
        setSelection(null);
        return;
      }

      const range = selected.getRangeAt(0);
      const container = document.querySelector(".article-body");
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        setSelection(null);
        return;
      }

      setSelection({
        text,
        x: rect.left + rect.width / 2,
        y: Math.max(12, rect.top - 12)
      });
    }

    document.addEventListener("selectionchange", updateSelection);
    window.addEventListener("scroll", updateSelection, true);
    window.addEventListener("resize", updateSelection);

    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      window.removeEventListener("scroll", updateSelection, true);
      window.removeEventListener("resize", updateSelection);
    };
  }, []);

  if (!selection) {
    return null;
  }

  const handleAction = async (action: Action) => {
    if (action === "open") {
      router.push(wikiTitlePath(worldId, selection.text));
    } else if (action === "reject") {
      try {
        await fetch(constraintsApiPath(worldId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scopeType: "world",
            constraintType: "negative",
            text: selection.text,
            strength: "hard"
          })
        });
      } catch {
        // silently ignore
      }
    }

    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  return (
    <div
      className="selection-menu"
      style={{
        left: selection.x,
        top: selection.y
      }}
    >
      <button
        className="selection-link-button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => handleAction("open")}
        type="button"
      >
        打开「{selection.text}」
      </button>
      {isEditMode && (
        <button
          className="selection-reject-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleAction("reject")}
          type="button"
        >
          拒绝方向
        </button>
      )}
    </div>
  );
}
