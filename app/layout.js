import "./globals.css";
import PWAInit from "./dashboard/components/PWAInit";

export const metadata = {
  title: "Производственный Календарь Компьютролс 2026",
  description: "Калькулятор зарплаты с учётом переработок",
  manifest: "/manifest.json",
  themeColor: "#6c63ff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Production Calendar",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#6c63ff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <PWAInit />
      </body>
    </html>
  );
}
