import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  return (
    <div className="corporate-gradient flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-3xl border border-slate-200 bg-white/95 px-8 py-10 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          Fluxo legado desativado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O acesso institucional agora acontece diretamente na página de login, sem callback externo.
        </p>
        <Button asChild className="mt-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Link>
        </Button>
      </div>
    </div>
  );
}
