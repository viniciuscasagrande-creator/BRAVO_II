import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LocationService, GEOFENCES_AUTORIZADAS } from '../services/locationService';
import { StorageService } from '../services/storageService';

export const HomeScreen: React.FC = () => {
  const [horaAtual, setHoraAtual] = useState<string>('');
  const [dataAtual, setDataAtual] = useState<string>('');
  const [tipoBatida, setTipoBatida] = useState<'ENTRADA' | 'INTERVALO_INICIO' | 'INTERVALO_FIM' | 'SAIDA'>('SAIDA');
  const [statusJornada, setStatusJornada] = useState<'EM_JORNADA' | 'EM_INTERVALO' | 'FORA_JORNADA'>('EM_JORNADA');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [comprovanteModal, setComprovanteModal] = useState<any | null>(null);

  // Coordenadas simuladas/obtidas de Curitiba (Sede Disk / Ligga Arena)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number; acc: number }>({
    lat: -25.42841,
    lon: -49.27329,
    acc: 8.5
  });

  const geofenceInfo = LocationService.verificarGeofenceMaisProxima(currentCoords.lat, currentCoords.lon);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraAtual(now.toLocaleTimeString('pt-BR'));
      setDataAtual(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRegistrarPonto = async () => {
    setCarregando(true);

    try {
      // Simulação da leitura precisa de GPS no instante exato do clique (Portaria 671 MTE)
      const lat = currentCoords.lat;
      const lon = currentCoords.lon;
      const geo = LocationService.verificarGeofenceMaisProxima(lat, lon);

      const nsrSimulado = Math.floor(1004 + Math.random() * 50);
      const nowIso = new Date().toISOString();
      const hashSimulado = 'f' + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2);
      const comprovanteCode = `MTE671-${String(nsrSimulado).padStart(9, '0')}-${hashSimulado.substring(0, 8).toUpperCase()}`;

      const novoRegistro = {
        nsr: nsrSimulado,
        tipo: tipoBatida,
        dataHoraFormatada: new Date().toLocaleString('pt-BR'),
        geofenceNome: geo.geofence.nome,
        distanciaMetros: geo.distanciaMetros,
        dentroGeofence: geo.dentroDoRaio,
        hash: hashSimulado,
        comprovanteNsr: comprovanteCode,
        colaborador: 'Carlos Eduardo Mendes',
        matricula: 'DISK-00101'
      };

      await StorageService.adicionarAoHistoricoLocal(novoRegistro);

      // Atualiza o estado da jornada
      if (tipoBatida === 'ENTRADA' || tipoBatida === 'INTERVALO_FIM') {
        setStatusJornada('EM_JORNADA');
      } else if (tipoBatida === 'INTERVALO_INICIO') {
        setStatusJornada('EM_INTERVALO');
      } else {
        setStatusJornada('FORA_JORNADA');
      }

      setComprovanteModal(novoRegistro);
    } catch (e: any) {
      Alert.alert('Erro ao Registrar Ponto', e.message || 'Falha na validação do dispositivo.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header do Colaborador */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>CE</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.collaboratorName}>Carlos Eduardo Mendes</Text>
            <Text style={styles.collaboratorRole}>Coordenador de Bilheteria de Campo</Text>
            <Text style={styles.collaboratorBadge}>Matrícula: DISK-00101 • CLT</Text>
          </View>
        </View>

        {/* Status da Jornada */}
        <View style={styles.statusRow}>
          <View style={[styles.statusTag, statusJornada === 'EM_JORNADA' ? styles.statusGreen : statusJornada === 'EM_INTERVALO' ? styles.statusYellow : styles.statusGray]}>
            <Text style={styles.statusTagText}>
              {statusJornada === 'EM_JORNADA' ? '🟢 EM JORNADA' : statusJornada === 'EM_INTERVALO' ? '🟡 INTERVALO' : '⚪ FORA DA JORNADA'}
            </Text>
          </View>
          <Text style={styles.networkStatus}>Online (Sincronizado) ✓</Text>
        </View>
      </View>

      {/* Relógio Digital Oficial */}
      <View style={styles.clockCard}>
        <Text style={styles.dateText}>{dataAtual}</Text>
        <Text style={styles.clockText}>{horaAtual || '08:00:00'}</Text>
        <Text style={styles.shiftText}>Jornada Prevista: 08:00 às 17:48 (Tolerância: 10m)</Text>
      </View>

      {/* Validação de Cerca Virtual no Toque (Geofence) */}
      <View style={styles.geofenceCard}>
        <View style={styles.geofenceHeader}>
          <Text style={styles.geofenceTitle}>📍 Localização & Cerca Virtual (GPS)</Text>
          <View style={[styles.badgePill, geofenceInfo.dentroDoRaio ? styles.badgeSuccess : styles.badgeDanger]}>
            <Text style={styles.badgePillText}>{geofenceInfo.dentroDoRaio ? 'AUTORIZADO' : 'FORA DA CERCA'}</Text>
          </View>
        </View>

        <Text style={styles.geofenceName}>{geofenceInfo.geofence.nome}</Text>
        <Text style={styles.geofenceAddress}>{geofenceInfo.geofence.endereco}</Text>
        
        <View style={styles.coordsRow}>
          <Text style={styles.coordsText}>
            GPS: {currentCoords.lat.toFixed(5)}, {currentCoords.lon.toFixed(5)}
          </Text>
          <Text style={styles.distanceText}>
            Distância do Centro: <Text style={{ fontWeight: 'bold' }}>{geofenceInfo.distanciaMetros}m</Text> (Raio máx: {geofenceInfo.geofence.raioMetros}m)
          </Text>
        </View>
      </View>

      {/* Seletor de Batida */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Selecione o Tipo de Registro:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.typeButton, tipoBatida === 'ENTRADA' && styles.typeButtonActive]}
            onPress={() => setTipoBatida('ENTRADA')}
          >
            <Text style={[styles.typeButtonText, tipoBatida === 'ENTRADA' && styles.typeButtonTextActive]}>Entrada</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, tipoBatida === 'INTERVALO_INICIO' && styles.typeButtonActive]}
            onPress={() => setTipoBatida('INTERVALO_INICIO')}
          >
            <Text style={[styles.typeButtonText, tipoBatida === 'INTERVALO_INICIO' && styles.typeButtonTextActive]}>Saída Almoço</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, tipoBatida === 'INTERVALO_FIM' && styles.typeButtonActive]}
            onPress={() => setTipoBatida('INTERVALO_FIM')}
          >
            <Text style={[styles.typeButtonText, tipoBatida === 'INTERVALO_FIM' && styles.typeButtonTextActive]}>Retorno Almoço</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, tipoBatida === 'SAIDA' && styles.typeButtonActive]}
            onPress={() => setTipoBatida('SAIDA')}
          >
            <Text style={[styles.typeButtonText, tipoBatida === 'SAIDA' && styles.typeButtonTextActive]}>Saída Final</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Botão de Ação Principal: REGISTRAR PONTO */}
      <TouchableOpacity
        style={[styles.mainPunchButton, carregando && styles.buttonDisabled]}
        onPress={handleRegistrarPonto}
        disabled={carregando}
      >
        {carregando ? (
          <ActivityIndicator color="#ffffff" size="large" />
        ) : (
          <>
            <Text style={styles.punchButtonTitle}>REGISTRAR PONTO</Text>
            <Text style={styles.punchButtonSub}>Toque para registrar {tipoBatida.replace('_', ' ')}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>
          🔒 Conforme Portaria 671 MTE • REP-P homologado DiskIngressos • Hash SHA-256 e NSR emitidos instantaneamente.
        </Text>
      </View>

      {/* Modal de Comprovante de Registro (Portaria 671 MTE) */}
      <Modal visible={!!comprovanteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>COMPROVANTE DE REGISTRO DE PONTO</Text>
              <Text style={styles.receiptSubtitle}>Portaria 671 MTE • Registrador REP-P</Text>
            </View>

            {comprovanteModal && (
              <View style={styles.receiptBody}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Empregador:</Text>
                  <Text style={styles.receiptVal}>Disk Ingressos Entretenimento Ltda.</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Colaborador:</Text>
                  <Text style={styles.receiptVal}>{comprovanteModal.colaborador}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Matrícula:</Text>
                  <Text style={styles.receiptVal}>{comprovanteModal.matricula}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Tipo Marcação:</Text>
                  <Text style={styles.receiptValBold}>{comprovanteModal.tipo}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Data e Horário:</Text>
                  <Text style={styles.receiptValBold}>{comprovanteModal.dataHoraFormatada}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>NSR Sequencial:</Text>
                  <Text style={styles.receiptValBold}>#{comprovanteModal.nsr}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Local Validação:</Text>
                  <Text style={styles.receiptVal}>{comprovanteModal.geofenceNome}</Text>
                </View>

                <View style={styles.hashBox}>
                  <Text style={styles.hashLabel}>CÓDIGO DE AUTENTICIDADE DIGITAL:</Text>
                  <Text style={styles.hashCode}>{comprovanteModal.comprovanteNsr}</Text>
                  <Text style={styles.hashFull} numberOfLines={2}>SHA-256: {comprovanteModal.hash}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeReceiptButton}
              onPress={() => setComprovanteModal(null)}
            >
              <Text style={styles.closeReceiptText}>FECHAR COMPROVANTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarInitials: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18
  },
  profileText: {
    flex: 1
  },
  collaboratorName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold'
  },
  collaboratorRole: {
    color: '#94a3b8',
    fontSize: 13
  },
  collaboratorBadge: {
    color: '#60a5fa',
    fontSize: 11,
    marginTop: 2
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)'
  },
  statusYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)'
  },
  statusGray: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)'
  },
  statusTagText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: 'bold'
  },
  networkStatus: {
    color: '#94a3b8',
    fontSize: 12
  },
  clockCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 13,
    textTransform: 'capitalize',
    marginBottom: 4
  },
  clockText: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2
  },
  shiftText: {
    color: '#60a5fa',
    fontSize: 12,
    marginTop: 6
  },
  geofenceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  geofenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  geofenceTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold'
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)'
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)'
  },
  badgePillText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: 'bold'
  },
  geofenceName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  geofenceAddress: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8
  },
  coordsRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  coordsText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  distanceText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  selectorContainer: {
    marginBottom: 16
  },
  selectorLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: 'bold'
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  typeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa'
  },
  typeButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold'
  },
  typeButtonTextActive: {
    color: '#ffffff'
  },
  mainPunchButton: {
    backgroundColor: '#16a34a',
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 16
  },
  buttonDisabled: {
    opacity: 0.6
  },
  punchButtonTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1
  },
  punchButtonSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 4
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 30
  },
  footerNoteText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20
  },
  receiptHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 16
  },
  receiptTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  receiptSubtitle: {
    fontSize: 12,
    color: '#64748b'
  },
  receiptBody: {
    marginBottom: 16
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  receiptLabel: {
    color: '#64748b',
    fontSize: 13
  },
  receiptVal: {
    color: '#0f172a',
    fontSize: 13
  },
  receiptValBold: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold'
  },
  hashBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    marginTop: 12
  },
  hashLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold'
  },
  hashCode: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: 'bold',
    marginTop: 2
  },
  hashFull: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
    fontFamily: 'monospace'
  },
  closeReceiptButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  closeReceiptText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  }
});
