import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { EspelhoScreen } from './src/screens/EspelhoScreen';
import { AjusteScreen } from './src/screens/AjusteScreen';

export default function App() {
  const [tabAtiva, setTabAtiva] = useState<'HOME' | 'ESPELHO' | 'AJUSTE'>('HOME');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Top Bar Corporativo */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topLogo}>DISK INGRESSOS</Text>
          <Text style={styles.topSub}>REP-P Oficial • Portaria 671 MTE</Text>
        </View>
        <View style={styles.appBadge}>
          <Text style={styles.appBadgeText}>v1.0 APK</Text>
        </View>
      </View>

      {/* Conteúdo Principal */}
      <View style={styles.content}>
        {tabAtiva === 'HOME' && <HomeScreen />}
        {tabAtiva === 'ESPELHO' && <EspelhoScreen />}
        {tabAtiva === 'AJUSTE' && <AjusteScreen />}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navTab, tabAtiva === 'HOME' && styles.navTabActive]}
          onPress={() => setTabAtiva('HOME')}
        >
          <Text style={[styles.navIcon, tabAtiva === 'HOME' && styles.navIconActive]}>⏱️</Text>
          <Text style={[styles.navLabel, tabAtiva === 'HOME' && styles.navLabelActive]}>Bater Ponto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, tabAtiva === 'ESPELHO' && styles.navTabActive]}
          onPress={() => setTabAtiva('ESPELHO')}
        >
          <Text style={[styles.navIcon, tabAtiva === 'ESPELHO' && styles.navIconActive]}>📋</Text>
          <Text style={[styles.navLabel, tabAtiva === 'ESPELHO' && styles.navLabelActive]}>Meu Espelho</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, tabAtiva === 'AJUSTE' && styles.navTabActive]}
          onPress={() => setTabAtiva('AJUSTE')}
        >
          <Text style={[styles.navIcon, tabAtiva === 'AJUSTE' && styles.navIconActive]}>✍️</Text>
          <Text style={[styles.navLabel, tabAtiva === 'AJUSTE' && styles.navLabelActive]}>Ajustes</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a'
  },
  topLogo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1
  },
  topSub: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: 'bold'
  },
  appBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb'
  },
  appBadgeText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingBottom: 16
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navTabActive: {
    borderTopWidth: 2,
    borderTopColor: '#2563eb'
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2
  },
  navIconActive: {
    transform: [{ scale: 1.1 }]
  },
  navLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600'
  },
  navLabelActive: {
    color: '#60a5fa',
    fontWeight: 'bold'
  }
});
