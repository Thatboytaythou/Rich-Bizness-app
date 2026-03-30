import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        upload: resolve(__dirname, "upload.html"),
        gallery: resolve(__dirname, "gallery/index.html"),
        artist: resolve(__dirname, "artist/index.html"),
      },
    },
  },
});
