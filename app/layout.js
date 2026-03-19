import "./globals.css";

export const metadata = {
  title: "Производственный Календарь Компьютролс 2026",
  description: "Калькулятор зарплаты с учётом переработок",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
