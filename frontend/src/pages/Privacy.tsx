import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, UserMinus, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Política de Privacidade</h1>
          <p className="text-muted-foreground">Transparência e controle sobre seus dados pessoais (LGPD).</p>
        </div>

        <div className="grid gap-6">
          <Card className="card-corporate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Coleta e Uso de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Para garantir a segurança das instalações e o controle de acesso, coletamos os seguintes dados pessoais dos visitantes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Nome Completo:</strong> Para identificação.</li>
                <li><strong>Documento (CPF/RG):</strong> Para verificação de identidade única.</li>
                <li><strong>Telefone (Opcional):</strong> Para contato em caso de emergência ou notificações.</li>
                <li><strong>Foto (Opcional):</strong> Para identificação visual na portaria.</li>
              </ul>
              <p>
                Estes dados são utilizados estritamente para fins de controle de acesso, segurança patrimonial e registro de visitas.
              </p>
            </CardContent>
          </Card>

          <Card className="card-corporate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Armazenamento e Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Seus dados são armazenados em servidores seguros com acesso restrito apenas a pessoal autorizado (Recepcionistas e Administradores).
                Implementamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado.
              </p>
            </CardContent>
          </Card>

          <Card className="card-corporate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-primary" />
                Seus Direitos (LGPD)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Confirmar a existência de tratamento de dados.</li>
                <li>Acessar seus dados.</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                <li><strong>Solicitar a exclusão (Direito ao Esquecimento):</strong> Você pode solicitar a remoção dos seus dados do nosso sistema a qualquer momento, desde que não haja impedimento legal para a sua manutenção.</li>
              </ul>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground">Como exercer seus direitos?</p>
                <p className="mt-1">
                  Para solicitar a exclusão ou alteração de seus dados, entre em contato com a recepção ou administração presencialmente, ou solicite ao operador do sistema no momento do cadastro.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
