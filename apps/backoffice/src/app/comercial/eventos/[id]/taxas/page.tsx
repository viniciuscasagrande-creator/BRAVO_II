import React from 'react';
import { EventoTaxasClient } from './evento-taxas-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function FeesPage() {
  return <EventoTaxasClient />;
}
