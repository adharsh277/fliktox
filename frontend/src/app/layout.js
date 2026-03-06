import "./globals.css";

export const metadata = {
  title: "Fliktox",
  description: "Track, rate and share movies with friends"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
