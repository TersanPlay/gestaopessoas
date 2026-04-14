import { randomBytes } from 'crypto';
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { userRepository } from '../repositories/userRepository.js';
import {
  InstitutionalSsoError,
  authenticateInstitutionalSso,
  buildInstitutionalSsoAuthorizationUrl,
  exchangeInstitutionalSsoCode,
  registerInstitutionalFirstAccess,
  type InstitutionalSsoProfile,
  validateInstitutionalFirstAccess,
} from '../services/institutionalSsoService.js';
import { signToken } from '../utils/jwt.js';
import {
  normalizeCpf,
  normalizeMatricula,
  normalizeOptionalEmail,
  normalizeRequiredText,
  toUserResponse,
} from '../utils/userProfile.js';

type AuthUserPayload = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'matricula'
  | 'cpf'
  | 'role'
  | 'authProvider'
  | 'departmentId'
  | 'cargo'
  | 'lotacao'
  | 'funcao'
  | 'vinculo'
  | 'dataAdmissao'
  | 'dataDemissao'
  | 'cargaHorariaSemanal'
  | 'createdAt'
  | 'updatedAt'
>;

const buildAuthPayload = (user: AuthUserPayload) =>
  toUserResponse({
    ...user,
    department: null,
  });

const buildToken = (
  user: Pick<User, 'id' | 'role' | 'departmentId'>,
) => signToken({ id: user.id, role: user.role, departmentId: user.departmentId });

const buildSessionResponse = (user: AuthUserPayload) => ({
  user: buildAuthPayload(user),
  token: buildToken(user),
});

const respondInstitutionalSsoError = (res: Response, error: unknown) => {
  if (error instanceof InstitutionalSsoError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
};

const resolveInstitutionalUserCandidates = async (params: {
  email: string;
  matricula: string;
  cpf?: string | null;
}) => {
  const [emailUser, matriculaUser, cpfUser] = await Promise.all([
    userRepository.findByEmail(params.email),
    userRepository.findByMatricula(params.matricula),
    params.cpf ? userRepository.findByCpf(params.cpf) : Promise.resolve(null),
  ]);

  return Array.from(
    new Map(
      [emailUser, matriculaUser, cpfUser]
        .filter((user): user is NonNullable<typeof emailUser> => Boolean(user))
        .map((user) => [user.id, user]),
    ).values(),
  );
};

const resolveRequestOrigin = (req: AuthRequest) => {
  const explicitOrigin = req.get('origin');

  if (explicitOrigin) {
    return explicitOrigin;
  }

  const referer = req.get('referer');

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignora referer inválido e tenta com host/proto abaixo
    }
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = req.get('host');

  if (!host) {
    return null;
  }

  return `${req.protocol}://${host}`;
};

const buildInstitutionalUserFields = (profile: InstitutionalSsoProfile) => ({
  name: profile.nome,
  email: profile.email,
  matricula: profile.matricula,
  cargo: profile.cargo,
  lotacao: profile.lotacao,
  funcao: profile.funcao,
  vinculo: profile.vinculo,
  dataAdmissao: profile.dataAdmissao,
  dataDemissao: profile.dataDemissao,
  cargaHorariaSemanal: profile.cargaHorariaSemanal,
  authProvider: 'EXTERNAL' as const,
  ...(profile.cpf ? { cpf: profile.cpf } : {}),
});

const provisionInstitutionalSession = async (params: {
  accessToken: string;
  profile: InstitutionalSsoProfile;
}) => {
  const matchedUsers = await resolveInstitutionalUserCandidates({
    email: params.profile.email,
    matricula: params.profile.matricula,
    cpf: params.profile.cpf,
  });

  if (matchedUsers.length > 1) {
    return {
      status: 409 as const,
      payload: {
        message:
          'Há conflito entre os dados institucionais recebidos e cadastros locais existentes. Contate o administrador do sistema.',
      },
    };
  }

  const matchedUser = matchedUsers[0];

  if (matchedUser?.role === 'ADMIN') {
    return {
      status: 409 as const,
      payload: {
        message:
          'O e-mail institucional informado está vinculado a um administrador local e não pode ser sobrescrito pelo SSO.',
      },
    };
  }

  const authenticatedUser = matchedUser
    ? await userRepository.update(
        matchedUser.id,
        buildInstitutionalUserFields(params.profile),
      )
    : await userRepository.create({
        ...buildInstitutionalUserFields(params.profile),
        password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        role: 'COLABORADOR',
      });

  return {
    status: 200 as const,
    payload: {
      ...buildSessionResponse(authenticatedUser),
      institutionalAccessToken: params.accessToken,
      provisioned: !matchedUser,
    },
  };
};

export const startInstitutionalSso = async (req: AuthRequest, res: Response) => {
  try {
    return res.redirect(
      302,
      buildInstitutionalSsoAuthorizationUrl({
        requestOrigin: resolveRequestOrigin(req),
      }),
    );
  } catch (error) {
    console.error(error);
    return respondInstitutionalSsoError(res, error);
  }
};

export const exchangeInstitutionalSso = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const code = normalizeRequiredText(req.body.code);

    if (!code) {
      return res.status(400).json({
        message: 'Código de autorização é obrigatório.',
      });
    }

    const { accessToken, profile } = await exchangeInstitutionalSsoCode(code);
    const session = await provisionInstitutionalSession({ accessToken, profile });
    return res.status(session.status).json(session.payload);
  } catch (error) {
    console.error(error);
    return respondInstitutionalSsoError(res, error);
  }
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const name = normalizeRequiredText(req.body.name);
    const email = normalizeOptionalEmail(req.body.email);
    const password = normalizeRequiredText(req.body.password);
    const matricula = normalizeMatricula(String(req.body.matricula || ''));
    const cpf = normalizeCpf(String(req.body.cpf || ''));
    const role = req.body.role;
    const departmentId =
      typeof req.body.departmentId === 'string' ? req.body.departmentId : undefined;

    if (!name || !password || !matricula || !cpf) {
      return res.status(400).json({
        message: 'Nome, matrícula, CPF e senha são obrigatórios.',
      });
    }

    const existingUser = await userRepository.findConflictingUser({
      email,
      matricula,
      cpf,
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Já existe um usuário com este e-mail, matrícula ou CPF.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      name,
      email,
      matricula,
      cpf,
      password: hashedPassword,
      authProvider: 'LOCAL',
      role: role || 'COLABORADOR',
      department: departmentId ? { connect: { id: departmentId } } : undefined,
    });

    res.status(201).json({
      user: buildAuthPayload(user),
      token: buildToken(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const email = normalizeOptionalEmail(req.body.email);
    const password = normalizeRequiredText(req.body.password);

    if (!email || !password) {
      return res.status(400).json({
        message: 'E-mail e senha são obrigatórios.',
      });
    }

    if (!email.endsWith('@parauapebas.pa.leg.br')) {
      return res.status(400).json({
        message: 'Use seu e-mail institucional no domínio @parauapebas.pa.leg.br.',
      });
    }

    const { accessToken, profile } = await authenticateInstitutionalSso({
      email,
      senha: password,
    });
    const session = await provisionInstitutionalSession({ accessToken, profile });
    return res.status(session.status).json(session.payload);
  } catch (error) {
    console.error(error);
    respondInstitutionalSsoError(res, error);
  }
};

export const loginAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const email = normalizeOptionalEmail(req.body.email);
    const password = normalizeRequiredText(req.body.password);

    if (!email || !password) {
      return res.status(400).json({
        message: 'E-mail e senha são obrigatórios.',
      });
    }

    const existingUser = await userRepository.findByEmail(email);

    if (
      !existingUser ||
      existingUser.role !== 'ADMIN' ||
      existingUser.authProvider !== 'LOCAL'
    ) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    return res.json({
      user: buildAuthPayload(existingUser),
      token: buildToken(existingUser),
      provisioned: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkFirstAccess = async (req: AuthRequest, res: Response) => {
  try {
    const matricula = normalizeMatricula(String(req.body.matricula || ''));
    const rawCpf = String(req.body.cpf || '');
    const cpf = normalizeCpf(rawCpf);

    if (!matricula || !cpf) {
      return res.status(400).json({
        message: 'Matrícula e CPF são obrigatórios.',
      });
    }

    const validation = await validateInstitutionalFirstAccess({
      matricula,
      cpf,
    });

    if (validation.contaExistente) {
      return res.status(409).json({
        code: 'ACCOUNT_ALREADY_EXISTS',
        emailCadastrado: validation.emailCadastrado,
        message: validation.emailCadastrado
          ? `Você já possui cadastro com o e-mail ${validation.emailCadastrado}. Faça login para continuar.`
          : 'Você já possui cadastro institucional. Faça login para continuar.',
      });
    }

    return res.json({
      firstAccessRequired: true,
      profile: {
        servidorId: validation.servidorId,
        matricula,
        cpf,
        name: validation.nome,
        systemName: validation.sistemaNome,
        emailCadastrado: validation.emailCadastrado,
        cargo: null,
        lotacao: null,
        funcao: null,
        vinculo: null,
        dataAdmissao: null,
        dataDemissao: null,
        cargaHorariaSemanal: null,
      },
    });
  } catch (error) {
    console.error(error);
    respondInstitutionalSsoError(res, error);
  }
};

export const checkEmailFirstAccess = async (req: AuthRequest, res: Response) => {
  try {
    const email = normalizeOptionalEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        message: 'E-mail é obrigatório.',
      });
    }

    const conflictingEmail = await userRepository.findConflictingUser({ email });

    if (conflictingEmail) {
      return res.status(409).json({
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'Este e-mail já possui senha cadastrada. Faça login ou recupere sua senha.',
      });
    }

    return res.json({
      available: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao verificar disponibilidade do e-mail.',
    });
  }
};

export const completeFirstAccess = async (req: AuthRequest, res: Response) => {
  try {
    const servidorId = normalizeRequiredText(req.body.servidorId);
    const matricula = normalizeMatricula(String(req.body.matricula || ''));
    const rawCpf = String(req.body.cpf || '');
    const cpf = normalizeCpf(rawCpf);
    const email = normalizeOptionalEmail(req.body.email);
    const password = normalizeRequiredText(req.body.password);

    if (!servidorId || !matricula || !cpf || !email || !password) {
      return res.status(400).json({
        message:
          'Servidor, matrícula, CPF, e-mail institucional e senha são obrigatórios.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'A senha precisa ter pelo menos 6 caracteres.',
      });
    }

    if (!email.endsWith('@parauapebas.pa.leg.br')) {
      return res.status(400).json({
        message:
          'Use seu e-mail institucional no domínio @parauapebas.pa.leg.br para concluir o primeiro acesso.',
      });
    }

    const { accessToken, profile } = await registerInstitutionalFirstAccess({
      servidorId,
      matricula,
      cpf,
      email,
      senha: password,
    });
    const session = await provisionInstitutionalSession({ accessToken, profile });
    return res.status(session.status === 200 ? 201 : session.status).json(session.payload);
  } catch (error) {
    console.error(error);
    respondInstitutionalSsoError(res, error);
  }
};
