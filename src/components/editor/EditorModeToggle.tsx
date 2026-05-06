"use client";

export function EditorModeToggle({
  isEditMode,
  onToggle
}: {
  isEditMode: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="edit-toggle"
      onClick={onToggle}
      type="button"
    >
      {isEditMode ? "退出编辑" : "编辑模式"}
    </button>
  );
}
