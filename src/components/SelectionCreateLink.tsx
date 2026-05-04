"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { titleToSlug } from "@/lib/wiki";

type SelectionState = {
  text: string;
  x: number;
  y: number;
};

export function SelectionCreateLink({ worldId }: { worldId: string }) {
  const router = useRouter();
  const [selection, setSelection] = useState<SelectionState | null>(null);

  useEffect(() => {
    function updateSelection() {
      const selected = window.getSelection();
      const text = selected?.toString().replace(/\s+/g, " ").trim() ?? "";

      if (!selected || selected.rangeCount === 0 || text.length < 2 || text.length > 40) {
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

  return (
    <button
      className="selection-link-button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        router.push(`/world/${worldId}/wiki/${titleToSlug(selection.text)}`);
        window.getSelection()?.removeAllRanges();
        setSelection(null);
      }}
      style={{
        left: selection.x,
        top: selection.y
      }}
      type="button"
    >
      打开「{selection.text}」
    </button>
  );
}
