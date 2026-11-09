import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoAprovacoesPage() {
  return <EventoSubpaginaClient modo="aprovacoes" codigoMatriz="EVT-09" titulo="Aprovações Multi-Área do Evento" />;
}
