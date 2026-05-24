import "./globals.css";
import { Inter } from "next/font/google";
import RootChrome from "@/components/layout/RootChrome";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "DACORIS",
  description: "DACORIS Application - Where Grants, Research and Data Converge",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <RootChrome>{children}</RootChrome>
        </Providers>
      </body>
    </html>
  );
}
