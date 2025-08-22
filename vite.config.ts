import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import suidPlugin from "@suid/vite-plugin";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS_BASE || undefined,
  plugins: [suidPlugin(), solid()],
  worker: {
    format: 'es'
  }
});
