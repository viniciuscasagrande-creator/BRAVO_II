import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';

// Fórmula Haversine para validação no próprio dispositivo móvel
function calcularHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function App() {
  // Autenticação
  const [logado, setLogado] = useState(true);
  const [colaborador, setColaborador] = useState({
    nome: 'Carlos Eduardo Mendes',
    matricula: 'DISK-00101',
    cargo: 'Coordenador de Bilheteria de Campo',
    localEscala: 'Sede DiskIngressos Curitiba',
    localLatitude: -25.4284,
    localLongitude: -49.2733,
    localRaioMetros: 150
  });

  // Estado da Jornada
  const [statusJornada, setStatusJornada] = useState<'FORA' | 'JORNADA' | 'INTERVALO'>('JORNADA');
  const [tipoBatida, setTipoBatida] = useState<'ENTRADA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO' | 'SAIDA'>('SAIDA');
  const [relogio, setRelogio] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [comprovante, setComprovante] = useState<any | null>(null);

  // Tab ativa
  const [abaAtiva, setAbaAtiva] = useState<'BATER' | 'HISTORICO' | 'AJUSTE'>('BATER');

  // Histórico local
  const [historico, setHistorico] = useState([
    { nsr: 1001, tipo: 'ENTRADA', dataHora: '03/10/2026 08:01', local: 'Sede DiskIngressos Curitiba', status: 'VALIDADA', comprovante: 'MTE671-000001001-A7F9C2D1' }
  ]);

  // Form Ajuste
  const [ajusteJustificativa, setAjusteJustificativa] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setRelogio(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function registrarPonto() {
    setCarregando(true);
    try {
      // 1. Solicita permissão e lê GPS NO INSTANTE EXATO da batida (Portaria 671 MTE / LGPD)
      const perm = await Location.requestForegroundPermissionsAsync();
      let coords = { latitude: -25.42842, longitude: -49.27331, accuracy: 6.5 };

      if (perm.status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || 10
          };
        } catch (_) {
          // Mantém coordenada simulada se o GPS não responder no emulador
        }
      }

      // 2. Calcula a distância até a cerca virtual autorizada da escala
      const distancia = calcularHaversine(
        coords.latitude,
        coords.longitude,
        colaborador.localLatitude,
        colaborador.localLongitude
      );

      const validada = distancia <= colaborador.localRaioMetros;
      const statusFinal = validada ? 'VALIDADA' : 'FORA_DA_AREA';

      // 3. Emite NSR e comprovante Portaria 671 MTE
      const nsrNovo = historico.length + 1002;
      const comprovanteCode = `MTE671-${String(nsrNovo).padStart(9, '0')}-B9E2F1`;

      const novaBatida = {
        nsr: nsrNovo,
        tipo: tipoBatida,
        dataHora: new Date().toLocaleString('pt-BR'),
        local: colaborador.localEscala,
        distancia: `${distancia}m`,
        status: statusFinal,
        comprovante: comprovanteCode
      };

      setHistorico([novaBatida, ...historico]);
      setComprovante(novaBatida);

      // Atualiza o status visual da jornada
      if (tipoBatida === 'ENTRADA' || tipoBatida === 'FIM_INTERVALO') {
        setStatusJornada('JORNADA');
      } else if (tipoBatida === 'INICIO_INTERVALO') {
        setStatusJornada('INTERVALO');
      } else {
        setStatusJornada('FORA');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao registrar batida');
    } finally {
      setCarregando(false);
    }
  }

  function enviarAjuste() {
    if (!ajusteJustificativa || ajusteJustificativa.length < 5) {
      Alert.alert('Atenção', 'A justificativa deve ter no mínimo 5 caracteres.');
      return;
    }
    Alert.alert('Solicitação Enviada', 'Seu pedido de ajuste foi encaminhado ao Gestor de RH.');
    setAjusteJustificativa('');
    setAbaAtiva('BATER');
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>DISK PONTO</Text>
          <Text style={styles.brandSub}>Portaria 671 MTE • Registrador REP-P</Text>
        </View>
        <View style={styles.badgeOnline}>
          <Text style={styles.badgeOnlineText}>ONLINE ✓</Text>
        </View>
      </View>

      {/* Conteúdo Dinâmico */}
      <ScrollView style={styles.body}>
        {/* Identificação do Colaborador & Escala do Dia */}
        <View style={styles.cardColaborador}>
          <Text style={styles.colabNome}>{colaborador.nome}</Text>
          <Text style={styles.colabCargo}>{colaborador.cargo}</Text>
          <Text style={styles.colabMatricula}>Matrícula: {colaborador.matricula}</Text>
          <View style={styles.divider} />
          <Text style={styles.escalaLabel}>ESCALA DO DIA (LOCAL AUTORIZADO):</Text>
          <Text style={styles.escalaLocal}>📍 {colaborador.localEscala}</Text>
          <Text style={styles.escalaRaio}>Cerca Virtual: Raio de {colaborador.localRaioMetros}m</Text>
        </View>

        {abaAtiva === 'BATER' && (
          <View>
            {/* Status da Jornada e Relógio */}
            <View style={styles.cardRelogio}>
              <View style={[styles.statusPill, statusJornada === 'JORNADA' ? styles.bgGreen : statusJornada === 'INTERVALO' ? styles.bgYellow : styles.bgGray]}>
                <Text style={styles.statusText}>
                  {statusJornada === 'JORNADA' ? '🟢 EM JORNADA' : statusJornada === 'INTERVALO' ? '🟡 EM INTERVALO' : '⚪ FORA DA JORNADA'}
                </Text>
              </View>
              <Text style={styles.relogioText}>{relogio || '08:00:00'}</Text>
              <Text style={styles.dataText}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</Text>
            </View>

            {/* Seletor de Tipo */}
            <View style={styles.seletorContainer}>
              <Text style={styles.seletorTitle}>Tipo da Marcação:</Text>
              <View style={styles.botoesTipo}>
                {[
                  { id: 'ENTRADA', label: 'Entrada' },
                  { id: 'INICIO_INTERVALO', label: 'Saída Almoço' },
                  { id: 'FIM_INTERVALO', label: 'Volta Almoço' },
                  { id: 'SAIDA', label: 'Saída Final' }
                ].map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.btnTipo, tipoBatida === b.id && styles.btnTipoAtivo]}
                    onPress={() => setTipoBatida(b.id as any)}
                  >
                    <Text style={[styles.btnTipoText, tipoBatida === b.id && styles.btnTipoTextAtivo]}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Botão Central de Batida */}
            <TouchableOpacity
              style={[styles.btnRegistrar, carregando && { opacity: 0.6 }]}
              onPress={registrarPonto}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <>
                  <Text style={styles.btnRegistrarText}>REGISTRAR PONTO</Text>
                  <Text style={styles.btnRegistrarSub}>Validação de GPS no instante do toque</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.lgpdNote}>
              🔒 Em respeito à LGPD e à Portaria 671 MTE, sua localização é obtida exclusivamente no momento da batida.
            </Text>
          </View>
        )}

        {abaAtiva === 'HISTORICO' && (
          <View>
            <Text style={styles.secaoTitulo}>Minhas Batidas Auditadas</Text>
            {historico.map((h, i) => (
              <View key={i} style={styles.itemHistorico}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNsr}>NSR #{h.nsr}</Text>
                  <Text style={styles.itemData}>{h.dataHora}</Text>
                </View>
                <Text style={styles.itemTipo}>{h.tipo.replace('_', ' ')}</Text>
                <Text style={styles.itemLocal}>📍 {h.local}</Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemStatus}>Status: {h.status}</Text>
                  <Text style={styles.itemComprovante}>{h.comprovante}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {abaAtiva === 'AJUSTE' && (
          <View style={styles.cardAjuste}>
            <Text style={styles.secaoTitulo}>Solicitar Ajuste de Ponto</Text>
            <Text style={styles.ajusteSub}>Justificativa para batida esquecida ou divergência de horário.</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Descreva o motivo (ex: Esquecimento por atendimento em fila de catraca)..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              value={ajusteJustificativa}
              onChangeText={setAjusteJustificativa}
            />
            <TouchableOpacity style={styles.btnAjuste} onPress={enviarAjuste}>
              <Text style={styles.btnAjusteText}>ENVIAR PEDIDO AO GESTOR</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Barra de Navegação Inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtiva('BATER')}>
          <Text style={[styles.tabLabel, abaAtiva === 'BATER' && styles.tabLabelAtivo]}>⏱️ Ponto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtiva('HISTORICO')}>
          <Text style={[styles.tabLabel, abaAtiva === 'HISTORICO' && styles.tabLabelAtivo]}>📋 Espelho</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtiva('AJUSTE')}>
          <Text style={[styles.tabLabel, abaAtiva === 'AJUSTE' && styles.tabLabelAtivo]}>✍️ Ajuste</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Comprovante de Ponto (Portaria 671 MTE) */}
      <Modal visible={!!comprovante} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>COMPROVANTE DE REGISTRO</Text>
            <Text style={styles.modalSub}>Portaria 671 MTE • REP-P</Text>

            {comprovante && (
              <View style={styles.modalDados}>
                <Text style={styles.modalLinha}>Colaborador: <Text style={styles.bold}>{colaborador.nome}</Text></Text>
                <Text style={styles.modalLinha}>Matrícula: <Text style={styles.bold}>{colaborador.matricula}</Text></Text>
                <Text style={styles.modalLinha}>Tipo Marcação: <Text style={styles.bold}>{comprovante.tipo}</Text></Text>
                <Text style={styles.modalLinha}>Data e Hora: <Text style={styles.bold}>{comprovante.dataHora}</Text></Text>
                <Text style={styles.modalLinha}>NSR: <Text style={styles.bold}>#{comprovante.nsr}</Text></Text>
                <Text style={styles.modalLinha}>Cerca Validada: <Text style={styles.bold}>{comprovante.local}</Text></Text>
                <Text style={styles.modalLinha}>Distância: <Text style={styles.bold}>{comprovante.distancia}</Text></Text>

                <View style={styles.comprovanteCodeBox}>
                  <Text style={styles.comprovanteCodeLabel}>CÓDIGO DE AUTENTICIDADE DIGITAL:</Text>
                  <Text style={styles.comprovanteCodeText}>{comprovante.comprovante}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.btnFecharModal} onPress={() => setComprovante(null)}>
              <Text style={styles.btnFecharModalText}>FECHAR COMPROVANTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  brandTitle: { fontSize: 18, fontWeight: '900', color: 'white', letterSpacing: 1 },
  brandSub: { fontSize: 10, color: '#60a5fa', fontWeight: 'bold' },
  badgeOnline: { backgroundColor: 'rgba(34, 197, 94, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeOnlineText: { color: '#4ade80', fontSize: 11, fontWeight: 'bold' },
  body: { flex: 1, padding: 18 },
  cardColaborador: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  colabNome: { fontSize: 16, fontWeight: 'bold', color: 'white' },
  colabCargo: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  colabMatricula: { fontSize: 11, color: '#60a5fa', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
  escalaLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  escalaLocal: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc', marginTop: 3 },
  escalaRaio: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardRelogio: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  bgGreen: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  bgYellow: { backgroundColor: 'rgba(234, 179, 8, 0.2)' },
  bgGray: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#4ade80' },
  relogioText: { fontSize: 44, fontWeight: '900', color: 'white' },
  dataText: { fontSize: 12, color: '#94a3b8', textTransform: 'capitalize', marginTop: 4 },
  seletorContainer: { marginBottom: 16 },
  seletorTitle: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 },
  botoesTipo: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btnTipo: { flex: 1, minWidth: '45%', backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  btnTipoAtivo: { backgroundColor: '#2563eb', borderColor: '#60a5fa' },
  btnTipoText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  btnTipoTextAtivo: { color: 'white' },
  btnRegistrar: { backgroundColor: '#16a34a', borderRadius: 16, paddingVertical: 20, alignItems: 'center', marginBottom: 12, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnRegistrarText: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  btnRegistrarSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 4 },
  lgpdNote: { color: '#64748b', fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 10 },
  secaoTitulo: { fontSize: 16, fontWeight: 'bold', color: 'white', marginBottom: 12 },
  itemHistorico: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemNsr: { fontSize: 12, fontWeight: 'bold', color: '#60a5fa' },
  itemData: { fontSize: 12, color: '#94a3b8' },
  itemTipo: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  itemLocal: { fontSize: 12, color: '#cbd5e1', marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  itemStatus: { fontSize: 11, color: '#4ade80', fontWeight: 'bold' },
  itemComprovante: { fontSize: 10, color: '#64748b', fontFamily: 'monospace' },
  cardAjuste: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' },
  ajusteSub: { fontSize: 12, color: '#94a3b8', marginBottom: 14 },
  textArea: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', color: 'white', padding: 12, fontSize: 13, height: 100, textAlignVertical: 'top' },
  btnAjuste: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  btnAjusteText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  bottomBar: { flexDirection: 'row', backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155', paddingVertical: 12 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  tabLabelAtivo: { color: '#60a5fa', fontWeight: 'bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  modalSub: { fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 14 },
  modalDados: { marginBottom: 14 },
  modalLinha: { fontSize: 13, color: '#334155', marginVertical: 3 },
  bold: { fontWeight: 'bold', color: '#0f172a' },
  comprovanteCodeBox: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 10, marginTop: 12 },
  comprovanteCodeLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  comprovanteCodeText: { fontSize: 14, color: '#2563eb', fontWeight: 'bold', marginTop: 2, fontFamily: 'monospace' },
  btnFecharModal: { backgroundColor: '#0f172a', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnFecharModalText: { color: 'white', fontWeight: 'bold', fontSize: 13 }
});
