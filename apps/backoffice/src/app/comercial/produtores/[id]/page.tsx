import React from 'react';
import { ProdutorDetalheClient } from './produtor-detalhe-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function ProducerDetailPage() {
  return <ProdutorDetalheClient />;
}
