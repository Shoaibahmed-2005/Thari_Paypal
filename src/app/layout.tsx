import type { Metadata } from "next";
import { Fraunces, Manrope, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

/*
 * Fonts are self-hosted by next/font. The brand tokens refer to the families by
 * name ("Manrope", "Fraunces", "Noto Sans Tamil"), so each font is loaded with
 * a CSS variable; next/font keeps the literal family names, so the tokens work as-is.
 */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--nf-manrope",
  display: "swap",
});
const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["500", "700"],
  variable: "--nf-tamil",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--nf-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thari — handwoven, sold by the weaver",
  description: "Indian handloom, sold directly by the weavers who made it — in their own language.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${tamil.variable} ${fraunces.variable}`}>
      <body className="th-root min-h-dvh">{children}</body>
    </html>
  );
}
