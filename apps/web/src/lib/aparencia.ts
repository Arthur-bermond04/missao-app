import { supabase } from './supabase';

/**
 * Cor de destaque da marca da comunidade: o quadrado "CT", o círculo do usuário,
 * o ícone do item ativo do menu, a linha sob o logo e o próprio símbolo do logo.
 * É só aparência — a comunidade escolhe em Configurações › Aparência.
 */
export const COR_DESTAQUE_PADRAO = '#FFB400';

export const PRESETS_COR: { nome: string; hex: string }[] = [
  { nome: 'Âmbar vivo', hex: '#FFB400' },
  { nome: 'Laranja', hex: '#FF7A00' },
  { nome: 'Rosa', hex: '#F43F5E' },
  { nome: 'Violeta', hex: '#8B5CF6' },
  { nome: 'Azul', hex: '#2F80ED' },
  { nome: 'Turquesa', hex: '#14B8A6' },
  { nome: 'Esmeralda', hex: '#10B981' },
  { nome: 'Dourado clássico', hex: '#D8B45F' },
];

export function hexValido(valor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(valor.trim());
}

function rgbDe(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Matiz (0–360), saturação e luminosidade (0–1) de uma cor hex. */
function hslDe(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = rgbDe(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/** Texto legível sobre a cor: escuro em cores claras, branco em cores escuras (contraste WCAG). */
export function corDoTexto(hex: string): string {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgbDe(hex);
  const luminancia = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminancia > 0.38 ? '#1f2937' : '#ffffff';
}

// O símbolo do logo é uma imagem dourada (matiz ~42°). Para ele acompanhar a cor
// escolhida, giramos o matiz e ajustamos saturação e brilho por filtro de CSS —
// assim os detalhes do desenho (circuito, setas, raios) são preservados.
const MATIZ_BASE_DO_SIMBOLO = 42;

export function filtroDoLogo(hex: string): string {
  const { h, s, l } = hslDe(hex);
  const giro = Math.round(h - MATIZ_BASE_DO_SIMBOLO);
  const saturacao = Math.min(2.6, Math.max(0.25, (s * 2.1) / 0.9 + 0.35));
  const brilho = Math.min(1.35, Math.max(0.8, 0.55 + l));
  return `hue-rotate(${giro}deg) saturate(${saturacao.toFixed(2)}) brightness(${brilho.toFixed(2)})`;
}

/** Aplica a cor em todo o app (variáveis de CSS na raiz). `null` volta ao padrão. */
export function aplicarCorDestaque(hex: string | null | undefined) {
  if (typeof document === 'undefined') return;
  const raiz = document.documentElement.style;
  if (!hex || !hexValido(hex)) {
    raiz.removeProperty('--cor-destaque');
    raiz.removeProperty('--cor-destaque-texto');
    raiz.removeProperty('--cor-destaque-filtro');
    return;
  }
  raiz.setProperty('--cor-destaque', hex);
  raiz.setProperty('--cor-destaque-texto', corDoTexto(hex));
  raiz.setProperty('--cor-destaque-filtro', filtroDoLogo(hex));
}

/** Cor salva da comunidade. Se a coluna ainda não existe no banco, devolve null (usa o padrão). */
export async function carregarCorDestaque(comunidadeId: string): Promise<string | null> {
  const { data, error } = await supabase.from('comunidades').select('cor_destaque').eq('id', comunidadeId).single();
  if (error) return null;
  const cor = (data as { cor_destaque: string | null } | null)?.cor_destaque ?? null;
  return cor && hexValido(cor) ? cor : null;
}

export async function salvarCorDestaque(comunidadeId: string, hex: string | null): Promise<void> {
  const { error } = await supabase.from('comunidades').update({ cor_destaque: hex }).eq('id', comunidadeId);
  if (error) throw error;
}
