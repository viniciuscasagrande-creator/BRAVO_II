# 📱 Disk Ponto Mobile (Android APK)

Aplicativo Oficial de Registro Eletrônico de Ponto via Programa (REP-P) da **DiskIngressos**, em conformidade com a **Portaria 671 MTE**, conectado diretamente ao módulo de **Recursos Humanos (RH Disk)** e ao **Core Financeiro V1**.

---

## 🚀 Principais Funcionalidades

1. **Registro de Ponto com Validação de Cerca Virtual (Geofence):**
   - **Sede DiskIngressos Curitiba:** Raio de 150m (Rua Visconde de Nácar, 1505).
   - **Ligga Arena (Arena da Baixada):** Raio de 350m para equipes de shows/jogos.
   - **Pedreira Paulo Leminski:** Raio de 400m para festivais.
   - **Teatro Positivo:** Raio de 250m para espetáculos e peças.
   - **Privacidade & LGPD:** A localização é capturada **estritamente no momento do clique** no botão de bater ponto, sem nenhum rastreamento contínuo da posição do colaborador.

2. **Garantia de Integridade e Portaria 671 MTE:**
   - Emissão de **NSR (Número Sequencial de Registro)** atômico e sequencial.
   - Assinatura digital com hash **SHA-256** inviolável.
   - Comprovante de registro emitido imediatamente para visualização e compartilhamento.

3. **Operação Offline com Sincronização Automática:**
   - Em locais de evento ou subsolos sem sinal de internet, os registros são armazenados localmente de forma criptografada.
   - Ao recuperar conectividade, a fila é transmitida com **idempotência estrita** (cada batida possui UUID único para evitar duplicidades).

4. **Espelho de Ponto e Solicitação de Ajustes:**
   - Visualização diária de entradas, intervalos e saídas.
   - Saldo de banco de horas e horas extras.
   - Formulário para solicitação de ajuste com motivo, comprovante e justificativa.

---

## 🛠️ Como Gerar o Arquivo APK para Instalação no Android

### Pré-requisitos:
- Node.js instalado (v18+)
- EAS CLI instalado globalmente:
  ```bash
  npm install -g eas-cli
  ```

### Passo a Passo para Gerar o APK:

1. **Entrar na pasta do projeto móvel:**
   ```bash
   cd mobile/disk-ponto
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Gerar o APK de Distribuição Direta (Preview Profile):**
   ```bash
   eas build -p android --profile preview
   ```
   *O EAS gerará o link direto de download do arquivo `.apk` pronto para instalar em qualquer aparelho Android.*

4. **Execução Local / Emulador (Opcional):**
   ```bash
   npx expo start --android
   ```
