import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PCG ePTW",
    short_name: "PCG ePTW",
    description: "Electronic Permit to Work & Safety Control System",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8f6",
    theme_color: "#004e46",
    icons: [
      {
        src: "/brand/pcg-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
