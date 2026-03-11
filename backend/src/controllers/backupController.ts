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

const buildPgDumpCmd = (scope: string, outFile: string) => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definido');
  const bin = getPgBin();
  const base = `"${path.join(bin, 'pg_dump.exe')}" -F c -f "${outFile}" -d "${url}"`;
  const tables = scopeTables[scope];
  if (!tables) throw new Error('Escopo inválido');
  if (scope === 'full') return base;
  const tablesArgs = tables.map((t) => `-t ${t}`).join(' ');
  return `${base} ${tablesArgs}`;
};

const buildPgRestoreCmd = (file: string) => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definido');
  const bin = getPgBin();
  return `"${path.join(bin, 'pg_restore.exe')}" -d "${url}" "${file}"`;
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
    const cmd = buildPgRestoreCmd(fullPath);
    await execAsync(cmd, { env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'PostgreSQL' } });
    res.json({ message: 'Restauração concluída', file });
  } catch (err: any) {
    console.error('Restore error', err);
    res.status(500).json({ message: 'Erro ao restaurar backup', detail: err?.message });
  }
};
