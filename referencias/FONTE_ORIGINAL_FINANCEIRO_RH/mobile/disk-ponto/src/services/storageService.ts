export interface BatidaOffline {
  uuidDispositivo: string;
  colaboradorId: string;
  tipo: 'ENTRADA' | 'INTERVALO_INICIO' | 'INTERVALO_FIM' | 'SAIDA';
  dataHoraMarcacao: string;
  latitude: number;
  longitude: number;
  precisaoMetros: number;
  geofenceId?: string;
  dentroGeofence: boolean;
  distanciaGeofence: number;
  sincronizado: boolean;
}

export class StorageService {
  private static filaOffline: BatidaOffline[] = [];
  private static historicoLocal: any[] = [
    {
      nsr: 1001,
      tipo: 'ENTRADA',
      dataHoraFormatada: '03/10/2026 07:58:12',
      geofenceNome: 'Sede DiskIngressos Curitiba',
      comprovanteNsr: 'MTE671-000001001-A7F9C2D1',
      hash: 'a7f9c2d1e4b8650f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f'
    },
    {
      nsr: 1002,
      tipo: 'INTERVALO_INICIO',
      dataHoraFormatada: '03/10/2026 12:02:44',
      geofenceNome: 'Sede DiskIngressos Curitiba',
      comprovanteNsr: 'MTE671-000001002-B8E1F3A5',
      hash: 'b8e1f3a5c7d9e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2'
    },
    {
      nsr: 1003,
      tipo: 'INTERVALO_FIM',
      dataHoraFormatada: '03/10/2026 13:01:10',
      geofenceNome: 'Sede DiskIngressos Curitiba',
      comprovanteNsr: 'MTE671-000001003-C9D2E4F6',
      hash: 'c9d2e4f6a8b0c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d3'
    }
  ];

  public static async salvarPontoOffline(ponto: BatidaOffline): Promise<void> {
    this.filaOffline.push(ponto);
  }

  public static async obterPontosOfflinePendentes(): Promise<BatidaOffline[]> {
    return [...this.filaOffline];
  }

  public static async marcarPontosComoSincronizados(uuids: string[]): Promise<void> {
    this.filaOffline = this.filaOffline.filter(p => !uuids.includes(p.uuidDispositivo));
  }

  public static async obterHistoricoLocal(): Promise<any[]> {
    return [...this.historicoLocal];
  }

  public static async adicionarAoHistoricoLocal(registro: any): Promise<void> {
    this.historicoLocal.unshift(registro);
  }
}
