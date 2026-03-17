import axios from 'axios';
import {
  formatCpf,
  normalizeCpf,
  normalizeMatricula,
  normalizeOptionalText,
  parseDateOnly,
  type ExternalServerProfile,
} from '../utils/userProfile.js';

const DEFAULT_AUTH_URL =
  'https://syqqkqdvyxkyqqniguds.supabase.co/functions/v1/autenticar';

interface ExternalServerPayload {
  matricula?: string | null;
  cpf?: string | null;
  nome?: string | null;
  cargo?: string | null;
  lotacao?: string | null;
  funcao?: string | null;
  vinculo?: string | null;
  data_admissao?: string | null;
  data_demissao?: string | null;
  carga_horaria_semanal?: number | null;
}

interface ExternalAuthSuccessResponse {
  sucesso?: boolean;
  mensagem?: string;
  token?: string;
  servidor?: ExternalServerPayload;
}

interface ExternalAuthErrorResponse {
  sucesso?: boolean;
  mensagem?: string;
}

export class ExternalServerAuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'ExternalServerAuthError';
    this.statusCode = statusCode;
  }
}

const mapAxiosErrorToExternalAuthError = (error: unknown) => {
  if (error instanceof ExternalServerAuthError) {
    return error;
  }

  if (axios.isAxiosError<ExternalAuthErrorResponse>(error)) {
    const statusCode = error.response?.status;
    const remoteMessage = error.response?.data?.mensagem;

    if (statusCode === 400) {
      return new ExternalServerAuthError(
        remoteMessage || 'Matrícula e CPF são obrigatórios para autenticação.',
        400,
      );
    }

    if (statusCode === 401 || statusCode === 403) {
      return new ExternalServerAuthError(
        remoteMessage || 'A integração externa recusou a autenticação do sistema.',
        statusCode,
      );
    }

    if (statusCode === 404) {
      return new ExternalServerAuthError(
        remoteMessage || 'Servidor não encontrado na API externa.',
        404,
      );
    }

    if (statusCode === 429) {
      return new ExternalServerAuthError(
        remoteMessage || 'Limite de requisições da API externa excedido.',
        429,
      );
    }

    return new ExternalServerAuthError(
      remoteMessage || 'Não foi possível consultar a API externa no momento.',
      statusCode || 502,
    );
  }

  return new ExternalServerAuthError(
    'Falha inesperada ao consultar a API externa.',
    502,
  );
};

const normalizeExternalServerProfile = (
  payload: ExternalServerPayload,
): ExternalServerProfile => {
  const matricula = normalizeMatricula(payload.matricula ?? '');
  const cpf = normalizeCpf(payload.cpf ?? '');
  const nome = normalizeOptionalText(payload.nome);

  if (!matricula || !cpf || !nome) {
    throw new ExternalServerAuthError(
      'A API externa retornou um cadastro incompleto para este servidor.',
      502,
    );
  }

  return {
    matricula,
    cpf,
    nome,
    cargo: normalizeOptionalText(payload.cargo),
    lotacao: normalizeOptionalText(payload.lotacao),
    funcao: normalizeOptionalText(payload.funcao),
    vinculo: normalizeOptionalText(payload.vinculo),
    dataAdmissao: parseDateOnly(payload.data_admissao),
    dataDemissao: parseDateOnly(payload.data_demissao),
    cargaHorariaSemanal:
      typeof payload.carga_horaria_semanal === 'number'
        ? payload.carga_horaria_semanal
        : null,
  };
};

export const authenticateExternalServer = async ({
  matricula,
  cpf,
  rawCpf,
}: {
  matricula: string;
  cpf: string;
  rawCpf?: string;
}) => {
  const apiUrl = process.env.SERVIDOR_AUTH_API_URL || DEFAULT_AUTH_URL;
  const apiKey = process.env.SERVIDOR_AUTH_API_KEY;
  const timeoutMs = Number(process.env.SERVIDOR_AUTH_TIMEOUT_MS || 8000);

  if (!apiKey) {
    throw new ExternalServerAuthError(
      'Integração externa não configurada. Defina SERVIDOR_AUTH_API_KEY no backend.',
      503,
    );
  }

  const cpfCandidates = Array.from(
    new Set(
      [
        normalizeOptionalText(rawCpf),
        cpf,
        formatCpf(cpf),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  let lastError: ExternalServerAuthError | null = null;

  for (const cpfCandidate of cpfCandidates) {
    try {
      const response = await axios.post<ExternalAuthSuccessResponse>(
        apiUrl,
        { matricula, cpf: cpfCandidate },
        {
          headers: {
            'X-API-Key': apiKey,
          },
          timeout: timeoutMs,
        },
      );

      if (!response.data?.sucesso || !response.data.servidor) {
        throw new ExternalServerAuthError(
          response.data?.mensagem || 'Falha ao validar o servidor na API externa.',
          502,
        );
      }

      return normalizeExternalServerProfile(response.data.servidor);
    } catch (error) {
      const mappedError = mapAxiosErrorToExternalAuthError(error);
      lastError = mappedError;

      if (mappedError.statusCode === 400 || mappedError.statusCode === 404) {
        continue;
      }

      throw mappedError;
    }
  }

  throw (
    lastError ??
    new ExternalServerAuthError(
      'Não foi possível validar matrícula e CPF na API externa.',
      404,
    )
  );
};
