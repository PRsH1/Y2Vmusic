import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Y2V Music",
  description: "YouTube URL에서 오디오 파일을 추출하는 개인용 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
