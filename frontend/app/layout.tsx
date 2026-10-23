import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"Edebiyat Atölyesi · Hatırla, anlat, öğren",description:"9–12. sınıflar için aktif hatırlama, konu çalışması ve aralıklı tekrar.",icons:{icon:"/favicon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
