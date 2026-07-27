import "./globals.css";
import RootChrome from "@/components/layout/RootChrome";
import AppReadyGate from "@/components/layout/AppReadyGate";
import { Providers } from "./providers";

export const metadata = {
  title: "DACORIS",
  description: "DACORIS Application - Where Grants, Research and Data Converge",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppReadyGate>
            <RootChrome>{children}</RootChrome>
          </AppReadyGate>
        </Providers>
      </body>
    </html>
  );
}
