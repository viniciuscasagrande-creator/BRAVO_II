import {notFound} from 'next/navigation';
import FinanceiroVideoWorkspace from '../../../../modules/financeiro-disk-video/FinanceiroVideoWorkspace';
import {FINANCEIRO_TELAS, findFinanceView} from '../../../../modules/financeiro-disk-video/catalogo';

export function generateStaticParams() {
  return FINANCEIRO_TELAS.map((s) => ({ slug: s.id.split('/') }));
}

export default async function FinanceiroOperacoesPage({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;const id=slug.join('/');if(!findFinanceView(id))notFound();return <FinanceiroVideoWorkspace screenId={id}/>;}
