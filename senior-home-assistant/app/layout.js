import "./globals.css";

export const metadata = {
  title: "Helping Hands Home Assistance",
  description: "Subscription yard work & household help for seniors and their families.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
