import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
// Considerando que a API roda a partir de /backend, voltamos um nível para a raiz do projeto
const BACKUP_DIR = path.resolve(process.cwd(), '..', 'db', 'backups');
const DEFAULT_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin';

const ensureDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
};

const filename = (scope: string) => {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:T]/g, '-').split('.')[0];
  return `gestao_${scope}_${stamp}.dump`;
};

const scopeTables: Record<string, string[]> = {
  full: [],
  visits: ['visits', 'visitors', 'departments', 'users'],
  visitors: ['visitors'],
  departments: ['departments'],
  users: ['users'],
  totem: ['visitors', 'visits'],
};

const getPgBin = () => process.env.PG_BIN_PATH || DEFAULT_PG_BIN;

const guessTablesFromFilename = (file: string) => {
  const lower = file.toLowerCase();
  if (lower.includes('visits')) return ['visits', 'visitors'];
  if (lower.includes('visitors')) return ['visitors'];
  if (lower.includes('departments')) return ['departments'];
  if (lower.includes('users')) return ['users'];
  if (lower.includes('totem')) return ['visits', 'visitors'];
  return [];
};

const sanitizeUrl = (url: string) => url.split('?')[0]; // remove query params como schema=public

const buildPgDumpCmd = (scope: string, outFile: string) => {
  const urlRaw = process.env.DATABASE_URL;
  if (!urlRaw) throw new Error('DATABASE_URL não definido');
  const url = sanitizeUrl(urlRaw);
  const bin = getPgBin();
  const base = `"${path.join(bin, 'pg_dump.exe')}" -F c -f "${outFile}" -d "${url}"`;
  const tables = scopeTables[scope];
  if (!tables) throw new Error('Escopo inválido');
  if (scope === 'full') return base;
  const tablesArgs = tables.map((t) => `-t ${t}`).join(' ');
  return `${base} ${tablesArgs}`;
};

const buildPgRestoreCmd = (file: string) => {
  const urlRaw = process.env.DATABASE_URL;
  if (!urlRaw) throw new Error('DATABASE_URL não definido');
  const url = sanitizeUrl(urlRaw);
  const bin = getPgBin();
  // --clean remove objetos antes de recriar; --if-exists evita erro se não existirem; --no-owner / --no-privileges para evitar aplicar donos/ACL
  return `"${path.join(bin, 'pg_restore.exe')}" -c --if-exists --no-owner --no-privileges -d "${url}" "${file}"`;
};

export const listBackups = async (_req: Request, res: Response) => {
  ensureDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.dump'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { file: f, size: stat.size, modified: stat.mtime };
    })
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  res.json(files);
};

export const createBackup = async (req: Request, res: Response) => {
  try {
    const scope = (req.body?.scope as string) || 'full';
    ensureDir();
    const outPath = path.join(BACKUP_DIR, filename(scope));
    const cmd = buildPgDumpCmd(scope, outPath);
    await execAsync(cmd, { env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'PostgreSQL' } });
    res.json({ message: 'Backup concluído', file: path.basename(outPath), scope });
  } catch (err: any) {
    console.error('Backup error', err);
    res.status(500).json({ message: 'Erro ao gerar backup', detail: err?.message });
  }
};

export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { file } = req.body;
    if (!file) return res.status(400).json({ message: 'Arquivo é obrigatório' });
    const fullPath = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: 'Arquivo não encontrado' });
    // Para dumps parciais, limpamos as tabelas relevantes antes do restore (evita PK/FK duplicadas)
    const tablesToTruncate = guessTablesFromFilename(file);
    if (tablesToTruncate.length > 0) {
      const urlRaw = process.env.DATABASE_URL;
      if (!urlRaw) throw new Error('DATABASE_URL não definido');
      const url = sanitizeUrl(urlRaw);
      const bin = getPgBin();
      const psql = `"${path.join(bin, 'psql.exe')}" "${url}" -c "TRUNCATE ${tablesToTruncate.join(', ')} CASCADE;"`;
      await execAsync(psql, { env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'PostgreSQL' } });
    }
    const cmd = buildPgRestoreCmd(fullPath);
    await execAsync(cmd, { env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'PostgreSQL' } });
    res.json({ message: 'Restauração concluída', file });
  } catch (err: any) {
    console.error('Restore error', err);
    res.status(500).json({ message: 'Erro ao restaurar backup', detail: err?.message });
  }
};

export const deleteBackup = async (req: Request, res: Response) => {
  try {
    const { file } = req.params;
    if (!file) return res.status(400).json({ message: 'Arquivo é obrigatório' });
    const fullPath = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: 'Arquivo não encontrado' });
    fs.unlinkSync(fullPath);
    res.json({ message: 'Backup removido', file });
  } catch (err: any) {
    console.error('Delete backup error', err);
    res.status(500).json({ message: 'Erro ao remover backup', detail: err?.message });
  }
};
