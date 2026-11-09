import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoSessoesPage() {
  return <EventoSubpaginaClient modo="sessoes" codigoMatriz="EVT-04" titulo="Sessões do Evento" />;
}
