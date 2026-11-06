import type {ReactNode} from 'react';
import './global.css';
import '../components/bravo-p06.css';
export const metadata={title:'BRAVO_II | DiskIngressos',description:'ERP corporativo da DiskIngressos — homologação'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
