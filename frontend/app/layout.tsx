import type {Metadata,Viewport} from "next";import "./globals.css";
export const metadata:Metadata={title:"EdebLab · Edebiyatı Keşfet, Anlat, Öğren.",description:"9–12. sınıflar için aktif hatırlama, konu çalışması ve aralıklı tekrar.",manifest:"/site.webmanifest",icons:{icon:"/favicon.svg",apple:"/icon-180.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#103D32"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
