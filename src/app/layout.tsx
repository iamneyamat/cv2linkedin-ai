import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://cv2linkedin-ai.vercel.app'),
  title: 'CV2LinkedIn AI | Transform Your CV into a Recruiter-Ready LinkedIn Profile',
  description: 'Free, privacy-first AI tool to turn your resume or CV into a high-converting, professionally optimized LinkedIn profile package.',
  keywords: ['LinkedIn optimizer', 'resume to linkedin', 'CV to linkedin', 'AI resume parser', 'recruiter optimization'],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'CV2LinkedIn AI | Transform Your CV into a Recruiter-Ready LinkedIn Profile',
    description: 'Free, privacy-first AI tool to turn your resume or CV into a high-converting, professionally optimized LinkedIn profile package.',
    type: 'website',
    url: 'https://cv2linkedin-ai.vercel.app',
    siteName: 'CV2LinkedIn AI',
  },
  twitter: {
    card: 'summary',
    title: 'CV2LinkedIn AI',
    description: 'Free, privacy-first AI tool to turn your resume or CV into a high-converting, professionally optimized LinkedIn profile package.',
  },
  alternates: {
    canonical: 'https://cv2linkedin-ai.vercel.app'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
