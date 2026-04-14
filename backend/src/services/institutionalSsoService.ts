import axios from 'axios';
import {
  normalizeCpf,
  normalizeMatricula,
  normalizeOptionalEmail,
  normalizeOptionalText,
  parseDateOnly,
} from '../utils/userProfile.js';

const DEFAULT_TIMEOUT_MS = 8000;
const PLACEHOLDER_REDIRECT_HOST = 'SEU-SISTEMA.gov.br';

interface InstitutionalSsoServerPayload {
  nome?: string | null;
  matricula?: string | null;
  email?: string | null;
  cargo?: string | null;
  lotacao?: string | null;
  funcao?: string | null;
  vinculo?: string | null;
  data_admissao?: string | null;
  data_demissao?: string | null;
  carga_horaria_semanal?: number | null;
}

interface InstitutionalSsoTokenResponse {
  sucesso?: boolean;
  mensagem?: string;
  token?: string;
  servidor?: InstitutionalSsoServerPayload;
}

interface InstitutionalSsoErrorResponse {
  sucesso?: boolean;
  mensagem?: string;
}

export interface InstitutionalSsoProfile {
  nome: string;
  matricula: string;
  cpf: string;
  email: string;
  cargo: string | null;
  lotacao: string | null;
  funcao: string | null;
  vinculo: string | null;
  dataAdmissao: Date | null;
  dataDemissao: Date | null;
  cargaHorariaSemanal: number | null;
}

export class InstitutionalSsoError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'InstitutionalSsoError';
    this.statusCode = statusCode;
  }
}

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const isPlaceholderRedirectUri = (value: string) =>
  value.includes(PLACEHOLDER_REDIRECT_HOST);

const getInstitutionalSsoConfig = () => {
  const platformUrl = removeTrailingSlash(
    normalizeOptionalText(process.env.SSO_PLATFORM_URL) || '',
  );
  const apiBaseUrl = removeTrailingSlash(
    normalizeOptionalText(process.env.SSO_API_BASE_URL) || '',
  );
  const clientId = normalizeOptionalText(process.env.SSO_CLIENT_ID) || '';
  const redirectUri = normalizeOptionalText(process.env.SSO_REDIRECT_URI) || '';
  const appBaseUrl = removeTrailingSlash(
    normalizeOptionalText(process.env.APP_PUBLIC_URL) || '',
  );
  const timeoutMs = Number(process.env.SSO_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  if (!platformUrl || !apiBaseUrl || !clientId) {
    throw new InstitutionalSsoError(
      'Integração SSO não configurada. Defina SSO_PLATFORM_URL, SSO_API_BASE_URL e SSO_CLIENT_ID no backend.',
      503,
    );
  }

  return {
    platformUrl,
    apiBaseUrl,
    clientId,
    redirectUri,
    appBaseUrl,
    timeoutMs,
  };
};

const buildCallbackUriFromBaseUrl = (baseUrl: string) =>
  `${removeTrailingSlash(baseUrl)}/auth/callback`;

export const resolveInstitutionalSsoRedirectUri = (options?: {
  requestOrigin?: string | null;
}) => {
  const { redirectUri, appBaseUrl } = getInstitutionalSsoConfig();
  const requestOrigin = normalizeOptionalText(options?.requestOrigin || '');

  if (redirectUri && !isPlaceholderRedirectUri(redirectUri)) {
    return redirectUri;
  }

  if (appBaseUrl) {
    return buildCallbackUriFromBaseUrl(appBaseUrl);
  }

  if (requestOrigin) {
    return buildCallbackUriFromBaseUrl(requestOrigin);
  }

  if (redirectUri && isPlaceholderRedirectUri(redirectUri)) {
    throw new InstitutionalSsoError(
      'A redirect_uri do SSO ainda está com o placeholder. Defina APP_PUBLIC_URL ou uma SSO_REDIRECT_URI real no backend.',
      503,
    );
  }

  throw new InstitutionalSsoError(
    'A redirect_uri do SSO não foi configurada. Defina APP_PUBLIC_URL ou SSO_REDIRECT_URI no backend.',
    503,
  );
};

const normalizeInstitutionalSsoProfile = (
  payload: InstitutionalSsoServerPayload,
): InstitutionalSsoProfile => {
  const nome = normalizeOptionalText(payload.nome);
  const matricula = normalizeMatricula(payload.matricula ?? '');
  const email = normalizeOptionalEmail(payload.email);

  if (!nome || !matricula || !email) {
    throw new InstitutionalSsoError(
      'A plataforma SSO retornou um cadastro institucional incompleto.',
      502,
    );
  }

  if (!email.endsWith('@parauapebas.pa.leg.br')) {
    throw new InstitutionalSsoError(
      'A plataforma SSO retornou um e-mail fora do domínio institucional permitido.',
      502,
    );
  }

  return {
    nome,
    matricula,
    email,
    cpf: '',
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

const mapAxiosErrorToInstitutionalSsoError = (error: unknown) => {
  if (error instanceof InstitutionalSsoError) {
    return error;
  }

  if (axios.isAxiosError<InstitutionalSsoErrorResponse>(error)) {
    const statusCode = error.response?.status;
    const remoteMessage = error.response?.data?.mensagem;

    if (statusCode === 400) {
      return new InstitutionalSsoError(
        remoteMessage || 'O código de autorização é inválido ou expirou.',
        400,
      );
    }

    if (statusCode === 401 || statusCode === 403) {
      return new InstitutionalSsoError(
        remoteMessage || 'A plataforma SSO recusou a autenticação institucional.',
        401,
      );
    }

    return new InstitutionalSsoError(
      remoteMessage || 'Não foi possível validar o login institucional no momento.',
      statusCode || 502,
    );
  }

  return new InstitutionalSsoError(
    'Falha inesperada ao consultar a plataforma SSO.',
    502,
  );
};

export const buildInstitutionalSsoAuthorizationUrl = (options?: {
  requestOrigin?: string | null;
}) => {
  const { platformUrl, clientId } = getInstitutionalSsoConfig();
  const redirectUri = resolveInstitutionalSsoRedirectUri(options);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return `${platformUrl}/sso/validar?${params.toString()}`;
};

export const exchangeInstitutionalSsoCode = async (code: string) => {
  try {
    const normalizedCode = normalizeOptionalText(code);

    if (!normalizedCode) {
      throw new InstitutionalSsoError(
        'Código de autorização não informado.',
        400,
      );
    }

    const { apiBaseUrl, clientId, timeoutMs } = getInstitutionalSsoConfig();

    const response = await axios.post<InstitutionalSsoTokenResponse>(
      `${apiBaseUrl}/sso-token`,
      {
        code: normalizedCode,
        client_id: clientId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs,
      },
    );

    if (!response.data?.sucesso || !response.data.servidor || !response.data.token) {
      throw new InstitutionalSsoError(
        response.data?.mensagem ||
          'A plataforma SSO não confirmou a autenticação institucional.',
        401,
      );
    }

    return {
      accessToken: response.data.token,
      profile: normalizeInstitutionalSsoProfile(response.data.servidor),
    };
  } catch (error) {
    throw mapAxiosErrorToInstitutionalSsoError(error);
  }
};
