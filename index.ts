#!/usr/bin/env bun
import { runStdio } from "./src/server";

runStdio().catch((error) => {
  console.error("Fatal error starting @climactic/umami-mcp:", error);
  process.exit(1);
});
