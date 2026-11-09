import React from 'react';
import { EventoDetalheClient } from './evento-detalhe-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventBuilderPage() {
  return <EventoDetalheClient />;
}
