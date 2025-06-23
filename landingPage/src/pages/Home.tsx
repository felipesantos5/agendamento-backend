import { useState } from "react";
import { Calendar, Clock, Smartphone, Users, BarChart3, MessageCircle, CheckCircle, Star, Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import image1 from "../assets/Screenshot_1.png";
import RippleButton from "@/components/RippleButton";

const BarbershopLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const features = [
    {
      icon: <Calendar className="w-8 h-8" style={{ color: "var(--chart-2)" }} />,
      title: "Agendamento Online 24/7",
      description: "Seus clientes agendam serviços de forma autônoma, escolhendo barbeiro, serviço e horário.",
      benefits: [
        "Ofereça total liberdade para seus clientes agendarem quando quiserem",
        "Reduza drasticamente o tempo gasto ao telefone",
        "Mantenha sua agenda preenchida, mesmo fora do horário comercial",
      ],
    },
    {
      icon: <BarChart3 className="w-8 h-8" style={{ color: "var(--chart-2)" }} />,
      title: "Dashboard Completo de Gestão",
      description: "Controle total da sua barbearia em um único lugar com estatísticas detalhadas.",
      benefits: [
        "Gerencie todas as operações de forma centralizada",
        "Tome decisões baseadas em dados reais",
        "Identifique horários de pico e oportunidades de crescimento",
      ],
    },
    {
      icon: <Users className="w-8 h-8" style={{ color: "var(--chart-2)" }} />,
      title: "Gestão de Barbeiros e Serviços",
      description: "Organize facilmente sua equipe e todos os serviços oferecidos.",
      benefits: [
        "Permita que clientes escolham o profissional ideal",
        "Evite conflitos de agenda entre barbeiros",
        "Destaque as especialidades de cada membro da equipe",
      ],
    },
    {
      icon: <MessageCircle className="w-8 h-8" style={{ color: "var(--chart-2)" }} />,
      title: "Notificações via WhatsApp",
      description: "Comunicação automática e instantânea com barbeiros e clientes.",
      benefits: [
        "Barbeiros recebem notificação de novos agendamentos",
        "Clientes recebem lembretes automáticos",
        "Reduza drasticamente a taxa de esquecimento de clientes.",
      ],
    },
  ];

  const testimonials = [
    {
      name: "Carlos Silva",
      business: "Barbearia Moderna",
      text: "Desde que começamos a usar o sistema, nossos agendamentos aumentaram 40% e praticamente não temos mais 'no-shows'. Os lembretes via WhatsApp funcionam perfeitamente!",
      rating: 5,
    },
    {
      name: "Roberto Santos",
      business: "Santos Barber Shop",
      text: "O que mais me impressionou foi a facilidade de uso. Em menos de 30 minutos já estava tudo configurado e funcionando. Meus clientes adoraram poder agendar pelo celular.",
      rating: 5,
    },
    {
      name: "André Costa",
      business: "Barbearia Elite",
      text: "O dashboard com estatísticas me ajudou a entender melhor meu negócio. Agora sei exatamente quais são meus horários de pico e posso planejar melhor minha equipe.",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "O sistema é realmente fácil de configurar e usar no dia a dia?",
      answer:
        "Sim! Nosso sistema foi desenvolvido pensando na simplicidade. A configuração inicial leva menos de 30 minutos e a interface é intuitiva para uso diário.",
    },
    {
      question: "Preciso instalar algum programa no meu computador ou celular?",
      answer: "Não! Nosso sistema funciona 100% online através do navegador. Você pode acessar de qualquer dispositivo com internet.",
    },
    {
      question: "Os dados da minha barbearia e dos meus clientes estão seguros?",
      answer: "Absolutamente! Utilizamos criptografia de ponta e seguimos todas as normas de segurança e privacidade de dados (LGPD).",
    },
    {
      question: "Como funciona o suporte técnico caso eu precise de ajuda?",
      answer:
        "Oferecemos suporte via WhatsApp, email e chat online. Nossa equipe está sempre pronta para ajudar você a aproveitar ao máximo o sistema.",
    },
    {
      question: "O aplicativo funciona bem em qualquer celular?",
      answer: "Sim! Nosso sistema é totalmente responsivo e funciona perfeitamente em smartphones, tablets e computadores de qualquer marca.",
    },
    {
      question: "Posso personalizar a página de agendamento com a minha marca?",
      answer: "Claro! Você pode personalizar cores, adicionar seu logo e deixar a página de agendamento com a identidade visual da sua barbearia.",
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      {/* <header className="shadow-sm sticky top-0 z-50" style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary)" }}>
                <Calendar className="w-6 h-6" style={{ color: "var(--primary-foreground)" }} />
              </div>
              <span className="ml-3 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                BarbeariAgendamento
              </span>
            </div>

            <nav className="hidden md:flex space-x-8">
              <a
                href="#funcionalidades"
                className="font-medium transition-colors"
                style={{ color: "var(--muted-foreground)" }}
                onMouseEnter={(e) => (e.target.style.color = "var(--primary)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--muted-foreground)")}
              >
                Funcionalidades
              </a>
              <a
                href="#depoimentos"
                className="font-medium transition-colors"
                style={{ color: "var(--muted-foreground)" }}
                onMouseEnter={(e) => (e.target.style.color = "var(--primary)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--muted-foreground)")}
              >
                Depoimentos
              </a>
              <a
                href="#faq"
                className="font-medium transition-colors"
                style={{ color: "var(--muted-foreground)" }}
                onMouseEnter={(e: any) => (e.target.style.color = "var(--primary)")}
                onMouseLeave={(e: any) => (e.target.style.color = "var(--muted-foreground)")}
              >
                FAQ
              </a>
            </nav>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 cursor-pointer">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <nav className="flex flex-col space-y-4">
                <a href="#funcionalidades" className="font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Funcionalidades
                </a>
                <a href="#depoimentos" className="font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Depoimentos
                </a>
                <a href="#faq" className="font-medium" style={{ color: "var(--muted-foreground)" }}>
                  FAQ
                </a>
              </nav>
            </div>
          )}
        </div>
      </header> */}

      <section className="pt-16 lg:pt-24" style={{ background: `linear-gradient(to bottom right, var(--accent), var(--secondary))` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            <h1 className="text-[40px] lg:text-6xl font-bold leading-tight mb-6 text-center" style={{ color: "var(--foreground)" }}>
              Transforme a Gestão da Sua Barbearia e<span style={{ color: "var(--primary)" }}> Conquiste Mais Clientes</span>
            </h1>
            <p className="text-2xl lg:text-2xl mb-8 leading-relaxed text-center" style={{ color: "var(--muted-foreground)" }}>
              Simplifique agendamentos, reduza faltas e ofereça uma experiência moderna aos seus clientes com nosso sistema completo, fácil de usar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                className="px-8 py-4 rounded-lg text-2xl font-semibold transition-opacity hover:opacity-90 text-red-400"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                Experimente Grátis por 30 Dias
              </button>
              {/* <a href="https://barbeariagendamento.com.br/primer" target="_blank">
                <button
                  className="border-2 px-8 py-4 rounded-lg text-2xl font-semibold transition-colors cursor-pointer w-full"
                  style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                >
                  Ver Demonstração
                </button>
              </a> */}
            </div>
            {/* <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
                ✅ Sem necessidade de cartão de crédito • ✅ Configuração em minutos
              </p> */}
          </div>
          {/* <div className="relative">
              <div
                className="rounded-2xl shadow-xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="rounded-lg p-6 mb-4" style={{ backgroundColor: "var(--muted)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: "var(--card-foreground)" }}>
                      Agendamentos Hoje
                    </h3>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
                    >
                      +15%
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: "var(--card-foreground)" }}>
                          João Silva
                        </p>
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                          Corte + Barba
                        </p>
                      </div>
                      <span className="font-medium" style={{ color: "var(--primary)" }}>
                        14:30
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: "var(--card-foreground)" }}>
                          Carlos Santos
                        </p>
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                          Corte Degradê
                        </p>
                      </div>
                      <span className="font-medium" style={{ color: "var(--primary)" }}>
                        15:00
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <Smartphone className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--primary)" }} />
                  <p style={{ color: "var(--muted-foreground)" }}>100% Mobile</p>
                </div>
              </div>
            </div> */}
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--muted)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
              Sua Barbearia Ainda Sofre Com Agendamentos Complicados?
            </h2>
            <p className="text-2xl lg:text-2xl max-w-4xl mx-auto leading-relaxed text-neutral-800">
              Sabemos como é frustrante lidar com os desafios diários que estão freando o sucesso da sua barbearia.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: "var(--accent)" }}>
                <Clock className="w-8 h-8" style={{ color: "var(--chart-2)" }} />
              </div>
              <h3 className="text-2xl font-bold mb-4 " style={{ color: "var(--card-foreground)" }}>
                Telefone Não Para de Tocar
              </h3>
              <p className="text-lg leading-relaxed text-neutral-700">
                Interrupções constantes durante os cortes, atrapalhando o atendimento e causando estresse para você e sua equipe.
              </p>
            </div>

            <div className="p-8 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: "var(--accent)" }}>
                <Calendar className="w-8 h-8" style={{ color: "var(--chart-2)" }} />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--card-foreground)" }}>
                Clientes Esquecem o Horário
              </h3>
              <p className="text-lg leading-relaxed text-neutral-700">
                Frequentes resultam em horários vagos, perda de receita e agenda desorganizada.
              </p>
            </div>

            <div className="p-8 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: "var(--accent)" }}>
                <Users className="w-8 h-8" style={{ color: "var(--chart-2)" }} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Gestão Desorganizada</h3>
              <p className="text-lg leading-relaxed text-neutral-700">
                Dificuldade para organizar múltiplos barbeiros, serviços e horários de forma eficiente.
              </p>
            </div>
          </div>

          {/* <div className="text-center mt-12">
            <p className="text-2xl lg:text-2xl font-semibold" style={{ color: "var(--destructive)" }}>
              Isso significa menos clientes atendidos, receita perdida e uma equipe frustrada!
            </p>
          </div> */}
        </div>
      </section>

      {/* Solution Section */}
      <section id="funcionalidades" className="py-16 lg:py-24" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
              Apresentamos: A Solução Completa para Sua Barbearia Prosperar!
            </h2>
            <p className="text-2xl lg:text-2xl max-w-4xl mx-auto leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Veja como nosso sistema simplifica sua rotina e impulsiona seus resultados.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 md:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start space-x-6 relative">
                  <div className="flex-shrink-0 absolute translate-y-4 md:translate-y-0">{feature.icon}</div>
                  <div className="flex-1 ">
                    <div className="ml-12">
                      <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--card-foreground)" }}>
                        {feature.title}
                      </h3>
                      <p className="text-lg mb-6 leading-relaxed text-neutral-900">{feature.description}</p>
                    </div>
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: "var(--chart-2)" }} />
                          <span className="text-lg text-neutral-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile-First Section */}
      <section className="py-16 lg:py-24" style={{ background: `linear-gradient(to right, var(--primary), var(--chart-2))` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: "var(--primary-foreground)" }}>
                Sua Barbearia na Palma da Mão
              </h2>
              <p className="text-2xl lg:text-2xl mb-8 leading-relaxed" style={{ color: "var(--primary-foreground)", opacity: 0.8 }}>
                Design pensado para você e seus clientes usarem onde estiverem, quando quiserem. Experiência mobile impecável!
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-6 h-6" style={{ color: "var(--primary-foreground)" }} />
                  <span className="text-lg" style={{ color: "var(--primary-foreground)" }}>
                    Interface otimizada para celular
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-6 h-6" style={{ color: "var(--primary-foreground)" }} />
                  <span className="text-lg" style={{ color: "var(--primary-foreground)" }}>
                    Textos grandes e fáceis de ler
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-6 h-6" style={{ color: "var(--primary-foreground)" }} />
                  <span className="text-lg" style={{ color: "var(--primary-foreground)" }}>
                    Navegação intuitiva e rápida
                  </span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <img src={image1} alt="" />
                {/* <div className="text-center">
                  <Smartphone className="w-20 h-20 mx-auto mb-6" style={{ color: "var(--primary)" }} />
                  <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--card-foreground)" }}>
                    100% Responsivo
                  </h3>
                  <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
                    Funciona perfeitamente em qualquer dispositivo
                  </p>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--muted)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
              Comece a Usar em Minutos: Simples Assim!
            </h2>
            <p className="text-2xl lg:text-2xl max-w-4xl mx-auto leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Veja como é fácil transformar a gestão da sua barbearia.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "var(--chart-1)" }}>
                <span className="text-3xl font-bold" style={{ color: "var(--primary-foreground)" }}>
                  1
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
                Cadastre sua Barbearia
              </h3>
              <p className="text-lg leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                Crie sua conta em poucos cliques e adicione as informações básicas da sua barbearia.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "var(--chart-2)" }}>
                <span className="text-3xl font-bold" style={{ color: "var(--primary-foreground)" }}>
                  2
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
                Configure Serviços e Equipe
              </h3>
              <p className="text-lg leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                Adicione seus serviços, cadastre seus barbeiros e defina horários de funcionamento.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "var(--chart-3)" }}>
                <span className="text-3xl font-bold" style={{ color: "var(--primary-foreground)" }}>
                  3
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
                Receba Agendamentos
              </h3>
              <p className="text-lg leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                Compartilhe o link da sua página e comece a receber agendamentos online imediatamente!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-16 lg:py-24" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
              O Que Donos de Barbearias Como Você Estão Dizendo
            </h2>
            <p className="text-2xl lg:text-2xl max-w-4xl mx-auto leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Junte-se às barbearias que já estão revolucionando sua gestão.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-8 rounded-xl shadow-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current text-yellow-500" />
                  ))}
                </div>
                <p className="text-lg mb-6 leading-relaxed italic" style={{ color: "var(--muted-foreground)" }}>
                  "{testimonial.text}"
                </p>
                <div>
                  <p className="font-bold text-lg" style={{ color: "var(--card-foreground)" }}>
                    {testimonial.name}
                  </p>
                  <p style={{ color: "var(--muted-foreground)" }}>{testimonial.business}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 lg:py-24" style={{ backgroundColor: "var(--muted)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
              Ainda Tem Dúvidas? A Gente Responde!
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl shadow-lg overflow-hidden transition-all duration-300 ease-in-out"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="cursor-pointer w-full px-8 py-6 text-left flex justify-between items-center rounded-xl transition-all duration-200 hover:opacity-80"
                >
                  <span className="text-lg lg:text-2xl font-semibold pr-4" style={{ color: "var(--card-foreground)" }}>
                    {faq.question}
                  </span>
                  <div className="transition-transform duration-300 ease-in-out">
                    {openFaq === index ? (
                      <ChevronUp className="w-6 h-6 flex-shrink-0" style={{ color: "var(--chart-2)" }} />
                    ) : (
                      <ChevronDown className="w-6 h-6 flex-shrink-0" style={{ color: "var(--chart-2)" }} />
                    )}
                  </div>
                </button>
                <div
                  className={`transition-all duration-500 ease-in-out ${openFaq === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-8 pb-6">
                    <p className="text-lg leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-24" style={{ background: `linear-gradient(to right, var(--primary), var(--chart-2))` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: "var(--primary-foreground)" }}>
            Pronto para Levar Sua Barbearia para o Próximo Nível?
          </h2>
          <p className="text-2xl lg:text-2xl mb-8 leading-relaxed text-zinc-200">
            Chega de complicação e perda de tempo. Junte-se a centenas de barbearias que já transformaram sua gestão e aumentaram sua receita.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button className="px-8 py-4 rounded-lg text-2xl font-semibold transition-colors cursor-pointer bg-white hover:opacity-90 md:max-w-72 w-full">
              Adquir agora
            </button>
            <a
              href="https://wa.me/554891930508?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20aplicativo%20BarbeariAgedamento."
              className="md:max-w-72 w-full"
            >
              <button className="border-2 px-8 py-4 rounded-lg text-2xl font-semibold transition-colors cursor-pointer text-white hover:opacity-90 ">
                Falar com Especialista
              </button>
            </a>
          </div>
          {/* <p className="text-lg" style={{ color: "var(--primary-foreground)", opacity: 0.8 }}>
            ✅ Sem necessidade de cartão de crédito • ✅ Suporte completo • ✅ Cancele quando quiser
          </p> */}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-10 pb-6" style={{ backgroundColor: "var(--card)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex-row flex-col flex gap-8 justify-between">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary)" }}>
                  <Calendar className="w-6 h-6" style={{ color: "var(--primary-foreground)" }} />
                </div>
                <span className="ml-3 text-2xl font-bold" style={{ color: "var(--card-foreground)" }}>
                  BarbeariAgendamento
                </span>
              </div>
              <p className="text-lg leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                A plataforma completa de agendamento para barbearias modernas.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4" style={{ color: "var(--card-foreground)" }}>
                Suporte
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://wa.me/554891930508?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20aplicativo%20BarbeariAgedamento."
                    className="text-lg transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 text-center" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
              © 2025 BarbeariAgendamento. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BarbershopLanding;
