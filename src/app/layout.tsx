import type { Metadata, Viewport } from "next";
// Fonts are bundled with the app (no download from Google at dev or build
// time, so they can never silently fall back to Arial). Each package ships
// latin + latin-ext subsets; latin-ext carries the ₹ glyph (U+20B9).
import "@fontsource-variable/anek-latin"; // words
import "@fontsource-variable/manrope"; // every number
import "./globals.css";

export const metadata: Metadata = {
  title: "Kharcha: expense tracker",
  description: "Log what you spend, see where it went. Everything stays in your browser.",
};

export const viewport: Viewport = {
  themeColor: "#f4eee3",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
