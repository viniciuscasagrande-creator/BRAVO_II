import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoLotesPage() {
  return <EventoSubpaginaClient modo="lotes" codigoMatriz="EVT-05" titulo="Lotes e Virada Automática" />;
}
