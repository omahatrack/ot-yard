import './globals.css';
export const dynamic='force-dynamic';
export const metadata={title:'OT Equipment',description:'Omaha Track Equipment parts, inventory and service'};
export const viewport={width:'device-width',initialScale:1};
export default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>}
