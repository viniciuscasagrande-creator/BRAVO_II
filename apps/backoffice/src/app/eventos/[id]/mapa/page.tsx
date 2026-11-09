import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoMapaPage() {
  return <EventoSubpaginaClient modo="mapa" codigoMatriz="MAP-02" titulo="Mapa e Ocupação do Evento" />;
}
