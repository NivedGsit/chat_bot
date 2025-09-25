export const metadata = {
    title: "Assent | Backend Console",
    description: "Assent",
  };
  
  import "../../../globals.css";
  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }