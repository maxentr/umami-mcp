import type { ToolResult } from "./tools/_helpers";

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

const escapeCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
};

export function formatList(
  rows: readonly Record<string, unknown>[],
  columns: readonly string[],
): string {
  if (rows.length === 0) return "(no results)";
  const header = `| ${columns.join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (row) => `| ${columns.map((c) => escapeCell(row[c])).join(" | ")} |`,
    )
    .join("\n");
  return `${header}\n${sep}\n${body}\n\n\`\`\`json\n${formatJson(rows)}\n\`\`\``;
}

export function toolText(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
