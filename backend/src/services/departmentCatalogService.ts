import axios from 'axios';
import prisma from '../utils/prisma.js';
import { normalizeOptionalText } from '../utils/userProfile.js';

const DEFAULT_TIMEOUT_MS = 8000;

interface RemoteDepartmentItem {
  nome?: string | null;
  total_servidores?: number | null;
}

interface RemoteDepartmentListResponse {
  sucesso?: boolean;
  lotacoes?: RemoteDepartmentItem[];
  total?: number;
  mensagem?: string;
}

export class DepartmentCatalogError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'DepartmentCatalogError';
    this.statusCode = statusCode;
  }
}

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeDepartmentName = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/\s+/g, ' ') : null;
};

const getDepartmentCatalogConfig = () => {
  const apiBaseUrl = removeTrailingSlash(
    normalizeOptionalText(process.env.SSO_API_BASE_URL) || '',
  );
  const apiKey =
    normalizeOptionalText(process.env.INSTITUTIONAL_DATA_API_KEY) ||
    normalizeOptionalText(process.env.SERVIDOR_AUTH_API_KEY) ||
    normalizeOptionalText(process.env.SSO_CLIENT_ID) ||
    '';
  const timeoutMs = Number(process.env.SSO_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  if (!apiBaseUrl || !apiKey) {
    throw new DepartmentCatalogError(
      'Integração de lotações não configurada. Defina SSO_API_BASE_URL e INSTITUTIONAL_DATA_API_KEY no backend.',
      503,
    );
  }

  return { apiBaseUrl, apiKey, timeoutMs };
};

const mapAxiosError = (error: unknown) => {
  if (error instanceof DepartmentCatalogError) {
    return error;
  }

  if (axios.isAxiosError<{ mensagem?: string }>(error)) {
    const message =
      error.response?.data?.mensagem ||
      'Não foi possível consultar as lotações padronizadas no momento.';

    return new DepartmentCatalogError(message, error.response?.status || 502);
  }

  return new DepartmentCatalogError(
    'Falha inesperada ao consultar o catálogo de lotações.',
    502,
  );
};

export const fetchRemoteDepartmentCatalog = async () => {
  try {
    const { apiBaseUrl, apiKey, timeoutMs } = getDepartmentCatalogConfig();
    const response = await axios.get<RemoteDepartmentListResponse>(
      `${apiBaseUrl}/listar-lotacoes`,
      {
        headers: {
          apikey: apiKey,
          'X-API-Key': apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: timeoutMs,
      },
    );

    if (!response.data?.sucesso || !Array.isArray(response.data.lotacoes)) {
      throw new DepartmentCatalogError(
        response.data?.mensagem || 'A API de lotações retornou uma resposta inválida.',
      );
    }

    return response.data.lotacoes
      .map((item) => ({
        name: normalizeDepartmentName(item.nome),
        employeeCount:
          typeof item.total_servidores === 'number' && item.total_servidores >= 0
            ? item.total_servidores
            : 0,
      }))
      .filter(
        (
          item,
        ): item is {
          name: string;
          employeeCount: number;
        } => Boolean(item.name),
      );
  } catch (error) {
    throw mapAxiosError(error);
  }
};

export const syncDepartmentCatalog = async () => {
  const remoteDepartments = await fetchRemoteDepartmentCatalog();
  const syncedAt = new Date();

  const existingDepartments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const normalizedDepartmentMap = new Map(
    existingDepartments.map((department) => [
      normalizeDepartmentName(department.name)?.toLocaleLowerCase('pt-BR') || '',
      department,
    ]),
  );

  let created = 0;
  let updated = 0;

  for (const remoteDepartment of remoteDepartments) {
    const normalizedName = remoteDepartment.name.toLocaleLowerCase('pt-BR');
    const existingDepartment = normalizedDepartmentMap.get(normalizedName);

    if (existingDepartment) {
      await prisma.department.update({
        where: { id: existingDepartment.id },
        data: {
          name: remoteDepartment.name,
          employeeCount: remoteDepartment.employeeCount,
          lastSyncedAt: syncedAt,
        },
      });
      updated += 1;
      continue;
    }

    const createdDepartment = await prisma.department.create({
      data: {
        name: remoteDepartment.name,
        employeeCount: remoteDepartment.employeeCount,
        lastSyncedAt: syncedAt,
      },
    });

    normalizedDepartmentMap.set(normalizedName, createdDepartment);
    created += 1;
  }

  return {
    total: remoteDepartments.length,
    created,
    updated,
    syncedAt,
  };
};
