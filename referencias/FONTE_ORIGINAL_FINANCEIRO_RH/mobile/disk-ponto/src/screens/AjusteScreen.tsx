import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';

export const AjusteScreen: React.FC = () => {
  const [dataPonto, setDataPonto] = useState<string>('02/10/2026');
  const [tipoBatida, setTipoBatida] = useState<string>('SAIDA');
  const [horarioCorreto, setHorarioCorreto] = useState<string>('18:18');
  const [motivo, setMotivo] = useState<string>('ESQUECIMENTO');
  const [justificativa, setJustificativa] = useState<string>('');
  const [enviado, setEnviado] = useState<boolean>(false);

  const handleSubmit = () => {
    if (!justificativa || justificativa.length < 5) {
      Alert.alert('Atenção', 'A justificativa é obrigatória (mínimo 5 caracteres).');
      return;
    }

    setEnviado(true);
    Alert.alert(
      'Solicitação Enviada',
      'Seu pedido de ajuste foi encaminhado para análise do Gestor/RH. Você será notificado assim que aprovado.',
      [{ text: 'OK', onPress: () => setJustificativa('') }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Solicitar Ajuste de Ponto</Text>
        <Text style={styles.headerSub}>Justificativa de batida esquecida, serviço externo ou atestado</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Data da Ocorrência</Text>
          <TextInput
            style={styles.input}
            value={dataPonto}
            onChangeText={setDataPonto}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tipo da Batida</Text>
          <View style={styles.tipoRow}>
            {['ENTRADA', 'INTERVALO_INICIO', 'INTERVALO_FIM', 'SAIDA'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tipoBtn, tipoBatida === t && styles.tipoBtnActive]}
                onPress={() => setTipoBatida(t)}
              >
                <Text style={[styles.tipoBtnText, tipoBatida === t && styles.tipoBtnTextActive]}>
                  {t.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Horário Correto Efetivo</Text>
          <TextInput
            style={styles.input}
            value={horarioCorreto}
            onChangeText={setHorarioCorreto}
            placeholder="HH:MM"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Motivo</Text>
          <TextInput
            style={styles.input}
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ex: ESQUECIMENTO, SERVICO_EXTERNO"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Justificativa Detalhada *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={justificativa}
            onChangeText={setJustificativa}
            placeholder="Explique o motivo do não registro ou divergência..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>ENVIAR SOLICITAÇÃO AO RH</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ As alterações solicitadas só constarão no espelho oficial após a formalização e homologação pelo Gestor de RH (Portaria 671 MTE).
        </Text>
      </View>
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
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16
  },
  fieldGroup: {
    marginBottom: 14
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top'
  },
  tipoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  tipoBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  tipoBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa'
  },
  tipoBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold'
  },
  tipoBtnTextActive: {
    color: '#ffffff'
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  infoBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 30
  },
  infoText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16
  }
});
