function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanMetaNarration(text: string, worldTitle?: string) {
  let cleaned = text;

  if (worldTitle?.trim()) {
    const title = escapeRegExp(worldTitle.trim());
    cleaned = cleaned
      .replace(new RegExp(`在[""']?${title}[""']?世界(?:线)?中[，,]?`, "g"), "")
      .replace(new RegExp(`在[""']?${title}[""']?(?:这个)?设定(?:里|中)[，,]?`, "g"), "");
  }

  return cleaned
    .replace(/（[^）]*(?:虚构|照应|canon|Canon|按 canon|此处|应省略|应该省略|可改为|创作|设定备注|自检)[^）]*）/g, "")
    .replace(/\([^)]*(?:虚构|照应|canon|Canon|按 canon|此处|应省略|应该省略|可改为|创作|设定备注|自检)[^)]*\)/g, "")
    .replace(/在(?:本|该|这个)世界(?:线)?中[，,]?/g, "")
    .replace(/在(?:本|该|这个)设定(?:里|中)[，,]?/g, "")
    .replace(/在(?:本|该|这个)宇宙(?:里|中)[，,]?/g, "");
}
