import "./globals.css";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import RootChrome from "@/components/layout/RootChrome";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "DACORIS",
  description: "DACORIS Application - Where Grants, Research and Data Converge",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansArabic.variable}`}>
      <body>
        <Providers>
          <RootChrome>{children}</RootChrome>
        </Providers>
      </body>
    </html>
  );
}
