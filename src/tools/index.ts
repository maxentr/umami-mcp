import type { ToolContext, ToolDef } from "./_helpers";
import { websiteTools } from "./websites";
import { meTools } from "./me";
import { statsTools } from "./stats";
import { sessionTools } from "./sessions";
import { eventTools } from "./events";
import { reportTools } from "./reports";
import { teamTools } from "./teams";
import { userTools } from "./users";

export function buildTools(ctx: ToolContext): ToolDef[] {
  const base: ToolDef[] = [
    ...meTools(ctx),
    ...websiteTools(ctx),
    ...statsTools(ctx),
    ...sessionTools(ctx),
    ...eventTools(ctx),
    ...reportTools(ctx),
    ...teamTools(ctx),
  ];
  if (ctx.mode === "self-hosted") {
    base.push(...userTools(ctx));
  }
  return base;
}
