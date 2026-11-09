import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoCortesiasPage() {
  return <EventoSubpaginaClient modo="cortesias" codigoMatriz="EVT-08" titulo="Cortesias do Evento" />;
}
