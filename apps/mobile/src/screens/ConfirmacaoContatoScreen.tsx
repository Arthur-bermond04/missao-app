import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { BadgeInteresse } from '../components/BadgeInteresse';
import type { NivelInteresse } from '../types/database';

type Params = {
  contatoId: string;
  nome: string;
  telefone: string;
  localAbordagem: string;
  nivelInteresse: NivelInteresse;
};

function numeroWhatsapp(telefone: string) {
  const apenasDigitos = telefone.replace(/\D/g, '');
  if (!apenasDigitos) return null;
  return apenasDigitos.startsWith('55') ? apenasDigitos : `55${apenasDigitos}`;
}

export function ConfirmacaoContatoScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const { contatoId, nome, telefone, localAbordagem, nivelInteresse } = params as Params;

  function abrirWhatsapp() {
    const numero = numeroWhatsapp(telefone);
    if (!numero) return;
    const texto = encodeURIComponent(
      `Paz e bem, ${nome}! Foi muito bom falar com você hoje. 🙏`
    );
    Linking.openURL(`https://wa.me/${numero}?text=${texto}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconeSucesso}>
        <Text style={styles.iconeSucessoTexto}>✓</Text>
      </View>

      <Text style={styles.titulo}>Contato salvo!</Text>
      <Text style={styles.subtitulo}>
        Deus se importa com cada encontro. Essa semente foi plantada. 🌱
      </Text>

      <View style={styles.resumoCard}>
        <Text style={styles.resumoNome}>{nome}</Text>
        {!!localAbordagem && <Text style={styles.resumoLinha}>📍 {localAbordagem}</Text>}
        {!!telefone && <Text style={styles.resumoLinha}>📱 {telefone}</Text>}
        <View style={{ marginTop: 8 }}>
          <BadgeInteresse nivel={nivelInteresse} />
        </View>
      </View>

      <Text style={styles.lembreteBanner}>
        🔔 Um lembrete de acompanhamento foi criado para os próximos dias.
      </Text>

      <View style={styles.acoes}>
        {!!telefone && (
          <Pressable style={[styles.acaoBotao, styles.whatsapp]} onPress={abrirWhatsapp}>
            <Text style={styles.acaoTexto}>Enviar mensagem no WhatsApp</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.acaoBotaoSecundario}
          onPress={() => navigation.navigate('PerfilContato', { contatoId })}
        >
          <Text style={styles.acaoTextoSecundario}>Agendar próximo contato</Text>
        </Pressable>
        <Pressable
          style={styles.acaoBotaoSecundario}
          onPress={() => navigation.navigate('PerfilContato', { contatoId })}
        >
          <Text style={styles.acaoTextoSecundario}>Convidar para célula</Text>
        </Pressable>
      </View>

      <Pressable style={styles.voltar} onPress={() => navigation.navigate('ListaContatos')}>
        <Text style={styles.voltarTexto}>Voltar para a lista</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, alignItems: 'center' },
  iconeSucesso: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  iconeSucessoTexto: { fontSize: 30, color: colors.success, fontWeight: '800' },
  titulo: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 16 },
  subtitulo: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  resumoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resumoNome: { fontSize: 18, fontWeight: '700', color: colors.text },
  resumoLinha: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  lembreteBanner: {
    backgroundColor: colors.warningLight,
    color: colors.warning,
    fontSize: 13,
    padding: 12,
    borderRadius: 12,
    width: '100%',
    marginTop: 16,
    textAlign: 'center',
  },
  acoes: { width: '100%', marginTop: 24, gap: 10 },
  acaoBotao: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  whatsapp: { backgroundColor: '#25D366' },
  acaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  acaoBotaoSecundario: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  acaoTextoSecundario: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  voltar: { marginTop: 20 },
  voltarTexto: { color: colors.textMuted, fontSize: 13 },
});
