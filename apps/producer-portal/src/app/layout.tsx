import React from 'react';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Portal do Produtor | BRAVO_II',description:'Gestão dos seus eventos na DiskIngressos'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body style={{margin:0}}>{children}</body></html>;}
