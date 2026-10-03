import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 若部署在子路徑（例如 GitHub Pages 的 /repo-name/），把 base 改成 "/repo-name/"
export default defineConfig(({ command, mode }) => {
  let base = "/"

  if (command === "build") {
    if (mode === "github") base = "/diablo-builds-2026/"
    if (mode === "zoekang") base = "/app/diablo/"
  }

  return {
    plugins: [react()],
    base,
  }
})
