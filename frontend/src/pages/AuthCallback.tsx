import { useEffect } from 'react';
import { isAxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const { completeInstitutionalLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const remoteError = searchParams.get('error');

    if (remoteError) {
      navigate('/login', {
        replace: true,
        state: {
          ssoError: 'A autenticação institucional foi cancelada ou recusada.',
        },
      });
      return;
    }

    if (!code) {
      navigate('/login', {
        replace: true,
        state: {
          ssoError: 'O retorno do SSO não trouxe um código de autorização válido.',
        },
      });
      return;
    }

    const completeLogin = async () => {
      try {
        await completeInstitutionalLogin(code);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        let message =
          'Não foi possível concluir a autenticação institucional. Tente novamente.';

        if (isAxiosError<{ message?: string }>(error)) {
          message = error.response?.data?.message || message;
        } else {
          console.error(error);
        }

        navigate('/login', {
          replace: true,
          state: {
            ssoError: message,
          },
        });
      }
    };

    void completeLogin();
  }, [completeInstitutionalLogin, navigate, searchParams]);

  return (
    <div className="corporate-gradient flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-3xl border border-slate-200 bg-white/95 px-8 py-10 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          Concluindo login institucional
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aguarde enquanto validamos seu acesso com a Câmara Municipal.
        </p>
      </div>
    </div>
  );
}
