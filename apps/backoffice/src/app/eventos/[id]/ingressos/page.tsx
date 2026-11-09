import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoIngressosPage() {
  return <EventoSubpaginaClient modo="ingressos" codigoMatriz="EVT-06" titulo="Categorias e Preços" />;
}
