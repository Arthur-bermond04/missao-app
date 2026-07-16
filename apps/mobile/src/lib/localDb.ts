import * as SQLite from 'expo-sqlite';
import type { Contato, EtapaJornada, NivelInteresse } from '../types/database';

const DB_NAME = 'missaoapp.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initLocalDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS contatos (
      id TEXT PRIMARY KEY NOT NULL,
      comunidade_id TEXT NOT NULL,
      missionario_id TEXT,
      nome TEXT NOT NULL,
      telefone TEXT,
      idade INTEGER,
      nivel_interesse TEXT NOT NULL DEFAULT 'morno',
      local_abordagem TEXT,
      latitude REAL,
      longitude REAL,
      data_abordagem TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      observacoes TEXT,
      etapa_jornada TEXT NOT NULL DEFAULT 'abordagem',
      proximo_contato TEXT,
      sincronizado INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL
    );
  `);
}

type NovoContatoLocal = {
  id: string;
  comunidade_id: string;
  missionario_id: string;
  nome: string;
  telefone?: string;
  idade?: number;
  nivel_interesse: NivelInteresse;
  local_abordagem?: string;
  latitude?: number;
  longitude?: number;
  tags: string[];
  observacoes?: string;
};

export async function salvarContatoLocal(contato: NovoContatoLocal) {
  const db = await getDb();
  const agora = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO contatos (
      id, comunidade_id, missionario_id, nome, telefone, idade,
      nivel_interesse, local_abordagem, latitude, longitude,
      data_abordagem, tags, observacoes, etapa_jornada, proximo_contato,
      sincronizado, criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contato.id,
      contato.comunidade_id,
      contato.missionario_id,
      contato.nome,
      contato.telefone ?? null,
      contato.idade ?? null,
      contato.nivel_interesse,
      contato.local_abordagem ?? null,
      contato.latitude ?? null,
      contato.longitude ?? null,
      agora,
      JSON.stringify(contato.tags),
      contato.observacoes ?? null,
      'abordagem',
      null,
      0,
      agora,
    ]
  );
}

function mapRow(row: any): Contato {
  return {
    ...row,
    tags: JSON.parse(row.tags ?? '[]'),
    sincronizado: !!row.sincronizado,
  };
}

export async function listarContatosLocais(): Promise<Contato[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM contatos ORDER BY data_abordagem DESC'
  );
  return rows.map(mapRow);
}

export async function listarPendentesSincronizacao(): Promise<Contato[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM contatos WHERE sincronizado = 0'
  );
  return rows.map(mapRow);
}

export async function marcarComoSincronizado(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE contatos SET sincronizado = 1 WHERE id = ?', [id]);
}

export async function atualizarEtapaJornadaLocal(id: string, etapa: EtapaJornada) {
  const db = await getDb();
  await db.runAsync('UPDATE contatos SET etapa_jornada = ?, sincronizado = 0 WHERE id = ?', [
    etapa,
    id,
  ]);
}

export async function upsertContatosRemotos(contatos: Contato[]) {
  const db = await getDb();
  for (const c of contatos) {
    await db.runAsync(
      `INSERT INTO contatos (
        id, comunidade_id, missionario_id, nome, telefone, idade,
        nivel_interesse, local_abordagem, latitude, longitude,
        data_abordagem, tags, observacoes, etapa_jornada, proximo_contato,
        sincronizado, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        nome=excluded.nome, telefone=excluded.telefone, idade=excluded.idade,
        nivel_interesse=excluded.nivel_interesse, local_abordagem=excluded.local_abordagem,
        latitude=excluded.latitude, longitude=excluded.longitude, tags=excluded.tags,
        observacoes=excluded.observacoes, etapa_jornada=excluded.etapa_jornada,
        proximo_contato=excluded.proximo_contato, sincronizado=1`,
      [
        c.id,
        c.comunidade_id,
        c.missionario_id,
        c.nome,
        c.telefone,
        c.idade,
        c.nivel_interesse,
        c.local_abordagem,
        c.latitude,
        c.longitude,
        c.data_abordagem,
        JSON.stringify(c.tags),
        c.observacoes,
        c.etapa_jornada,
        c.proximo_contato,
        c.criado_em,
      ]
    );
  }
}
