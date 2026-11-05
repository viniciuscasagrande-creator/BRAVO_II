import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert
} from 'react-native';
import { StorageService } from '../services/storageService';

export const EspelhoScreen: React.FC = () => {
  const [historico, setHistorico] = useState<any[]>([]);

  useEffect(() => {
    StorageService.obterHistoricoLocal().then(setHistorico);
  }, []);

  const handleCompartilharComprovante = async (item: any) => {
    try {
      await Share.share({
        message: `[DISK INGRESSOS - PORTARIA 671 MTE]\nComprovante de Registro de Ponto\nColaborador: Carlos Eduardo Mendes (DISK-00101)\nNSR: #${item.nsr}\nTipo: ${item.tipo}\nData/Hora: ${item.dataHoraFormatada}\nLocal: ${item.geofenceNome}\nCódigo: ${item.comprovanteNsr}\nSHA-256: ${item.hash}`
      });
    } catch (e: any) {
      Alert.alert('Erro ao compartilhar', e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Meu Espelho de Ponto</Text>
        <Text style={styles.headerSub}>Competência: Outubro / 2026</Text>
      </View>

      {/* Cards de Resumo da Jornada */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Horas Trabalhadas</Text>
          <Text style={styles.summaryVal}>168h 45m</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Banco de Horas</Text>
          <Text style={[styles.summaryVal, { color: '#4ade80' }]}>+14h 20m</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Atrasos / Faltas</Text>
          <Text style={styles.summaryVal}>0h 00m</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Batidas Registradas neste Mês</Text>

      {historico.map((item, idx) => (
        <View key={idx} style={styles.punchCard}>
          <View style={styles.punchHeader}>
            <View style={styles.nsrPill}>
              <Text style={styles.nsrText}>NSR #{item.nsr}</Text>
            </View>
            <Text style={styles.punchDate}>{item.dataHoraFormatada}</Text>
          </View>

          <View style={styles.punchBody}>
            <View>
              <Text style={styles.punchType}>{item.tipo.replace('_', ' ')}</Text>
              <Text style={styles.punchLocation}>📍 {item.geofenceNome}</Text>
            </View>
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={() => handleCompartilharComprovante(item)}
            >
              <Text style={styles.receiptButtonText}>Comprovante</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.punchFooter}>
            <Text style={styles.receiptCode} numberOfLines={1}>
              Autenticação: {item.comprovanteNsr}
            </Text>
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16
  },
  headerBox: {
    marginBottom: 16
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold'
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 11
  },
  summaryVal: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12
  },
  punchCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  punchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  nsrPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  nsrText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: 'bold'
  },
  punchDate: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600'
  },
  punchBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  punchType: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  punchLocation: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  receiptButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  receiptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  punchFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  receiptCode: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace'
  }
});
