import React from 'react';

export const metadata = {
  title: 'Penny — Receipt Tracking Assistant',
  description: 'Personal finance receipt-tracking assistant powered by AI and Google Sheets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
