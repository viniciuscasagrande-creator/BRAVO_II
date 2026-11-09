import React from 'react';
import { ChamadoDetalheClient } from './chamado-detalhe-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function ChamadoDetalhePage() {
  return <ChamadoDetalheClient />;
}
