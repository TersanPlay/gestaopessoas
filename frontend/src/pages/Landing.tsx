import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Building, ArrowRight, CheckCircle2, BarChart3, Lock } from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { useEffect } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  
  // Mouse Parallax Logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring animation for mouse movement
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate mouse position relative to window center (-1 to 1)
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
      
      mouseX.set(x * 20); // Max movement 20px
      mouseY.set(y * 20);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Scroll Parallax Transforms
  const yHeroText = useTransform(scrollY, [0, 300], [0, 50]);
  const yCard1 = useTransform(scrollY, [0, 300], [0, -40]);
  const yCard2 = useTransform(scrollY, [0, 300], [0, -80]);
  const yCard3 = useTransform(scrollY, [0, 300], [0, -20]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200"
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
              SC
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500">
              Sistema Corporativo
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Funcionalidades</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">Segurança</a>
            <a href="#about" className="hover:text-indigo-600 transition-colors">Sobre</a>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-600 hover:text-indigo-600">
              Login
            </Button>
            <Button onClick={() => navigate('/login')} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105">
              Começar Agora
            </Button>
          </div>
        </div>
      </motion.nav>

      <main className="flex-1">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
            <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob"></div>
            <div className="absolute top-40 right-40 w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
          </div>

          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              
              {/* Left Content */}
              <motion.div 
                style={{ y: yHeroText }}
                className="lg:w-1/2 space-y-8"
              >
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  Versão 2.0 Disponível
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight"
                >
                  Gestão inteligente para empresas <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">do futuro</span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl text-gray-600 max-w-lg leading-relaxed"
                >
                  Centralize o controle de acessos, departamentos e visitantes em uma única plataforma segura, intuitiva e compatível com LGPD.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Button size="lg" onClick={() => navigate('/login')} className="bg-indigo-600 hover:bg-indigo-700 h-14 px-8 text-lg shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1">
                    Criar Conta Grátis <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-gray-300 hover:bg-gray-50 hover:text-gray-900">
                    Agendar Demo
                  </Button>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-6 text-sm text-gray-500"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Sem cartão de crédito
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Setup em 2 minutos
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Content - Floating Cards with Parallax */}
              <div className="lg:w-1/2 relative h-[600px] w-full flex items-center justify-center perspective-1000">
                
                {/* Main Card - Dashboard Preview */}
                <motion.div
                  style={{ 
                    y: yCard2,
                    rotateX: useTransform(springY, [-20, 20], [5, -5]),
                    rotateY: useTransform(springX, [-20, 20], [-5, 5]),
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="relative z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-md mx-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Visão Geral</h3>
                      <p className="text-sm text-gray-500">Últimos 30 dias</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-gray-400">
                      <BarChart3 className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="h-24 bg-indigo-50 rounded-lg w-full flex items-end justify-between p-4 gap-2">
                      {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                        <div key={i} className="w-full bg-indigo-200 rounded-t-sm" style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Visitantes</p>
                        <p className="text-xl font-bold text-gray-900">1,284</p>
                      </div>
                      <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Check-ins</p>
                        <p className="text-xl font-bold text-green-600">+12.5%</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Card 1 - Top Right (Visitor Notification) */}
                <motion.div
                  style={{ 
                    y: yCard1,
                    x: useTransform(springX, [-20, 20], [10, -10]),
                  }}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="absolute top-20 -right-4 md:right-0 z-30 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/50 w-64 animate-float"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Acesso Permitido</p>
                      <p className="text-xs text-gray-500">Ricardo Silva acabou de fazer check-in na recepção.</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Card 2 - Bottom Left (Security Status) */}
                <motion.div
                  style={{ 
                    y: yCard3,
                    x: useTransform(springX, [-20, 20], [-10, 10]),
                  }}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="absolute bottom-32 -left-4 md:left-0 z-30 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/50 w-56 animate-float-delayed"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-bold text-gray-900">Segurança Ativa</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                    <div className="bg-green-500 h-1.5 rounded-full w-full"></div>
                  </div>
                  <p className="text-xs text-gray-500">Sistema operacional e protegido</p>
                </motion.div>

                {/* Background Decor Elements */}
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-30 pointer-events-none">
                  <div className="w-[600px] h-[600px] border border-gray-200 rounded-full"></div>
                  <div className="absolute w-[400px] h-[400px] border border-gray-200 rounded-full"></div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tudo que você precisa em um só lugar</h2>
              <p className="text-lg text-gray-600">Nossa plataforma foi desenhada para escalar com sua empresa, mantendo a simplicidade e segurança.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 - Large Span */}
              <Card className="md:col-span-2 bg-indigo-600 text-white border-none overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  <Shield className="w-64 h-64" />
                </div>
                <CardContent className="p-8 relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-6 backdrop-blur-sm">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Controle de Acesso (RBAC)</h3>
                    <p className="text-indigo-100 max-w-md">
                      Defina permissões granulares para Administradores, Colaboradores e Recepcionistas. Garanta que cada usuário tenha acesso apenas ao necessário.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="bg-gray-50 border-gray-100 hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Gestão de Visitantes</h3>
                  <p className="text-gray-600 text-sm">
                    Registro digital rápido, histórico de visitas e notificações automáticas para os anfitriões.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="bg-gray-50 border-gray-100 hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Múltiplos Departamentos</h3>
                  <p className="text-gray-600 text-sm">
                    Organize sua empresa por setores e vincule colaboradores e visitantes automaticamente.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4 - Large Span */}
              <Card className="md:col-span-2 bg-slate-900 text-white border-none overflow-hidden relative">
                <CardContent className="p-8 flex items-center justify-between">
                  <div>
                    <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6">
                      <Lock className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Conformidade LGPD</h3>
                    <p className="text-slate-400 max-w-md">
                      Seus dados protegidos e anonimizados conforme a Lei Geral de Proteção de Dados.
                    </p>
                  </div>
                  <div className="hidden md:block">
                     <Lock className="w-32 h-32 text-slate-800" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 bg-indigo-50">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Comece a transformar sua gestão hoje.
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Junte-se a empresas que já modernizaram seus processos de recepção e segurança.
            </p>
            <Button size="lg" onClick={() => navigate('/login')} className="bg-indigo-600 hover:bg-indigo-700 h-16 px-10 text-xl shadow-xl shadow-indigo-200 transition-transform hover:scale-105">
              Acessar Plataforma
            </Button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">
              SC
            </div>
            <span className="font-bold text-gray-900">Sistema Corporativo</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 Sistema Corporativo. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-indigo-600">Termos</a>
            <a href="#" className="hover:text-indigo-600">Privacidade</a>
            <a href="#" className="hover:text-indigo-600">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
