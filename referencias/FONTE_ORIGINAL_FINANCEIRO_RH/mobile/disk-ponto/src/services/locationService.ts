export interface GeofenceZone {
  id: string;
  nome: string;
  tipo: 'SEDE' | 'ARENA_EVENTO';
  latitude: number;
  longitude: number;
  raioMetros: number;
  endereco: string;
}

export const GEOFENCES_AUTORIZADAS: GeofenceZone[] = [
  {
    id: 'geo-sede-disk',
    nome: 'Sede DiskIngressos Curitiba',
    tipo: 'SEDE',
    latitude: -25.4284,
    longitude: -49.2733,
    raioMetros: 150,
    endereco: 'Rua Visconde de Nácar, 1505 - Centro'
  },
  {
    id: 'geo-arena-baixada',
    nome: 'Arena da Baixada (Ligga Arena)',
    tipo: 'ARENA_EVENTO',
    latitude: -25.4484,
    longitude: -49.2770,
    raioMetros: 350,
    endereco: 'Rua Buenos Aires, 1260 - Água Verde'
  },
  {
    id: 'geo-pedreira-paulo-leminski',
    nome: 'Pedreira Paulo Leminski',
    tipo: 'ARENA_EVENTO',
    latitude: -25.3855,
    longitude: -49.2789,
    raioMetros: 400,
    endereco: 'Rua João Gava, 970 - Abranches'
  },
  {
    id: 'geo-teatro-positivo',
    nome: 'Teatro Positivo Grande Auditório',
    tipo: 'ARENA_EVENTO',
    latitude: -25.4503,
    longitude: -49.3601,
    raioMetros: 250,
    endereco: 'Rua Prof. Pedro Viriato Parigot de Souza, 5300'
  }
];

export class LocationService {
  /**
   * Cálculo geodésico de distância usando a fórmula de Haversine.
   * Retorna a distância exata em metros entre duas coordenadas.
   */
  public static calcularDistanciaHaversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Verifica a cerca virtual mais próxima para a coordenada informada.
   */
  public static verificarGeofenceMaisProxima(
    lat: number,
    lon: number
  ): {
    geofence: GeofenceZone;
    distanciaMetros: number;
    dentroDoRaio: boolean;
  } {
    let maisProxima = GEOFENCES_AUTORIZADAS[0];
    let menorDistancia = Infinity;

    for (const geo of GEOFENCES_AUTORIZADAS) {
      const d = this.calcularDistanciaHaversine(lat, lon, geo.latitude, geo.longitude);
      if (d < menorDistancia) {
        menorDistancia = d;
        maisProxima = geo;
      }
    }

    return {
      geofence: maisProxima,
      distanciaMetros: menorDistancia,
      dentroDoRaio: menorDistancia <= maisProxima.raioMetros
    };
  }
}
