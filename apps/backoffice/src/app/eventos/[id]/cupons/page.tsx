import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoCuponsPage() {
  return <EventoSubpaginaClient modo="cupons" codigoMatriz="EVT-07" titulo="Cupons do Evento" />;
}
