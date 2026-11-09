import React from 'react';
import { PedidoDetalheClient } from './pedido-detalhe-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function PedidoDetalhePage() {
  return <PedidoDetalheClient />;
}
