import React from 'react';
import { EventoSubpaginaClient } from '../evento-subpagina-client';

export function generateStaticParams() {
  return [{ id: '__dynamic__' }];
}

export default function EventoReservasPage() {
  return <EventoSubpaginaClient modo="reservas" codigoMatriz="MAP-03" titulo="Reservas de Assentos do Evento" />;
}
