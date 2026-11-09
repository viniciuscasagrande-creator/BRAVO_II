// Inventário de telas observadas na gravação; nenhuma operação bancária é simulada.
import raw from './catalogo.json';
export type ViewKind='dashboard'|'table'|'list'|'workflow'|'rules'|'report'|'settings'|'calendar'|'simulator';
export type ScreenConfig={id:string;groupId:string;group:string;title:string;kind:ViewKind;columns:string[];anchorSecond:number;status:string};
export const FINANCEIRO_TELAS=raw.screens as ScreenConfig[];
export const FINANCEIRO_GRUPOS=[...new Set(FINANCEIRO_TELAS.map(s=>s.groupId))].map(id=>({id,label:FINANCEIRO_TELAS.find(x=>x.groupId===id)!.group,items:FINANCEIRO_TELAS.filter(x=>x.groupId===id)}));
export function findFinanceView(slug:string){return FINANCEIRO_TELAS.find(s=>s.id===slug);}
export const FINANCEIRO_BASE='/financeiro/operacoes';
