import { randomBytes } from 'crypto';
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { userRepository } from '../repositories/userRepository.js';
import {
  ExternalServerAuthError,
  authenticateExternalServer,
} from '../services/externalServerAuthService.js';
import {
  InstitutionalSsoError,
  buildInstitutionalSsoAuthorizationUrl,
  exchangeInstitutionalSsoCode,
} from '../services/institutionalSsoService.js';
import { signToken } from '../utils/jwt.js';
import {
  normalizeCpf,
  normalizeMatricula,
  normalizeOptionalEmail,
  normalizeRequiredText,
  toExternalUserFields,
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

const buildExternalProfilePayload = (
  profile: Awaited<ReturnType<typeof authenticateExternalServer>>,
) => ({
  matricula: profile.matricula,
  cpf: profile.cpf,
  name: profile.nome,
  cargo: profile.cargo,
  lotacao: profile.lotacao,
  funcao: profile.funcao,
  vinculo: profile.vinculo,
  dataAdmissao: profile.dataAdmissao,
  dataDemissao: profile.dataDemissao,
  cargaHorariaSemanal: profile.cargaHorariaSemanal,
});

const respondExternalAuthError = (res: Response, error: unknown) => {
  if (error instanceof ExternalServerAuthError) {
    const statusCode = error.statusCode === 404 ? 401 : error.statusCode;
    return res.status(statusCode).json({ message: error.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
};

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
    const matchedUsers = await resolveInstitutionalUserCandidates({
      email: profile.email,
      matricula: profile.matricula,
      cpf: profile.cpf,
    });

    if (matchedUsers.length > 1) {
      return res.status(409).json({
        message:
          'Há conflito entre os dados institucionais recebidos e cadastros locais existentes. Contate o administrador do sistema.',
      });
    }

    const matchedUser = matchedUsers[0];

    if (matchedUser?.role === 'ADMIN') {
      return res.status(409).json({
        message:
          'O e-mail institucional informado está vinculado a um administrador local e não pode ser sobrescrito pelo SSO.',
      });
    }

    const normalizedFields = {
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
    };

    const authenticatedUser = matchedUser
      ? await userRepository.update(matchedUser.id, {
          ...normalizedFields,
        })
      : await userRepository.create({
          ...normalizedFields,
          password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          role: 'COLABORADOR',
        });

    return res.json({
      ...buildSessionResponse(authenticatedUser),
      institutionalAccessToken: accessToken,
      provisioned: !matchedUser,
    });
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

    const existingUser = await userRepository.findByEmail(email);

    if (!existingUser) {
      return res.status(403).json({
        code: 'FIRST_ACCESS_REQUIRED',
        message: 'Primeiro acesso necessário ou credenciais inválidas. Configure sua senha antes de entrar.',
      });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    let authenticatedUser: AuthUserPayload = existingUser;

    if (
      existingUser.authProvider === 'EXTERNAL' &&
      existingUser.role !== 'ADMIN'
    ) {
      try {
        const externalProfile = await authenticateExternalServer({
          matricula: existingUser.matricula || '',
          cpf: existingUser.cpf || '',
          rawCpf: existingUser.cpf || '',
        });
        authenticatedUser = await userRepository.update(existingUser.id, {
          ...toExternalUserFields(externalProfile),
        });
      } catch (syncError) {
        console.warn(
          `External sync skipped for user ${existingUser.id}:`,
          syncError,
        );
      }
    }

    res.json({
      user: buildAuthPayload(authenticatedUser),
      token: buildToken(authenticatedUser),
      provisioned: false,
    });
  } catch (error) {
    console.error(error);
    respondExternalAuthError(res, error);
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

    const existingUser = await userRepository.findByMatriculaAndCpf(matricula, cpf);

    if (existingUser) {
      return res.status(409).json({
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Este usuário já possui acesso local. Faça login com sua senha.',
      });
    }

    const externalProfile = await authenticateExternalServer({
      matricula,
      cpf,
      rawCpf,
    });

    return res.json({
      firstAccessRequired: true,
      profile: buildExternalProfilePayload(externalProfile),
    });
  } catch (error) {
    console.error(error);
    respondExternalAuthError(res, error);
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
    const matricula = normalizeMatricula(String(req.body.matricula || ''));
    const rawCpf = String(req.body.cpf || '');
    const cpf = normalizeCpf(rawCpf);
    const email = normalizeOptionalEmail(req.body.email);
    const password = normalizeRequiredText(req.body.password);

    if (!matricula || !cpf || !email || !password) {
      return res.status(400).json({
        message: 'Matrícula, CPF, e-mail institucional e senha são obrigatórios.',
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

    const existingUser = await userRepository.findByMatriculaAndCpf(matricula, cpf);

    if (existingUser) {
      return res.status(409).json({
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Este usuário já possui acesso local. Faça login com sua senha.',
      });
    }

    const conflictingEmail = await userRepository.findConflictingUser({
      email,
    });

    if (conflictingEmail) {
      return res.status(409).json({
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'Este e-mail já está em uso. Informe seu e-mail institucional correto.',
      });
    }

    const externalProfile = await authenticateExternalServer({
      matricula,
      cpf,
      rawCpf,
    });
    const hashedPassword = await bcrypt.hash(password, 10);

    const provisionedUser = await userRepository.create({
      ...toExternalUserFields(externalProfile),
      password: hashedPassword,
      email,
      authProvider: 'EXTERNAL',
      role: 'COLABORADOR',
    });

    return res.status(201).json({
      user: buildAuthPayload(provisionedUser),
      token: buildToken(provisionedUser),
      provisioned: true,
    });
  } catch (error) {
    console.error(error);
    respondExternalAuthError(res, error);
  }
};
