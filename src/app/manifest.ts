import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PCG ePTW",
    short_name: "PCG ePTW",
    description: "Electronic Permit to Work & Safety Control System",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#11263d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
