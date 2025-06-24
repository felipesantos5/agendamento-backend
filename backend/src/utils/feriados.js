// utils/feriados.js
export class FeriadosBrasil {
  constructor() {
    this.cache = new Map();
    
    // ✅ CONFIGURAÇÃO: Feriados que você quer ativar
    this.feriadosAtivos = {
      'confraternizacao': true,        // 01/01
      'carnaval_segunda': true,        // Segunda de Carnaval
      'carnaval_terca': true,          // Terça de Carnaval
      'sexta_santa': true,             // Sexta-feira Santa
      'tiradentes': true,              // 21/04
      'dia_trabalhador': true,         // 01/05
      'independencia': true,           // 07/09
      'nossa_senhora': true,           // 12/10
      'finados': true,                 // 02/11
      'proclamacao_republica': true,   // 15/11
      'natal': true                    // 25/12
    };

    // ✅ NOMES DOS FERIADOS
    this.nomesFeriados = {
      'confraternizacao': 'Confraternização Universal',
      'carnaval_segunda': 'Segunda-feira de Carnaval',
      'carnaval_terca': 'Terça-feira de Carnaval',
      'sexta_santa': 'Sexta-feira Santa',
      'tiradentes': 'Tiradentes',
      'dia_trabalhador': 'Dia do Trabalhador',
      'independencia': 'Independência do Brasil',
      'nossa_senhora': 'Nossa Senhora Aparecida',
      'finados': 'Finados',
      'proclamacao_republica': 'Proclamação da República',
      'natal': 'Natal'
    };
  }

  // ✅ MÉTODO PARA ATIVAR/DESATIVAR FERIADOS
  configurarFeriado(feriado, ativo = true) {
    if (this.feriadosAtivos.hasOwnProperty(feriado)) {
      this.feriadosAtivos[feriado] = ativo;
      this.cache.clear(); // Limpar cache quando configuração mudar
    }
  }

  // ✅ MÉTODO PARA OBTER CONFIGURAÇÃO ATUAL
  getConfiguracaoFeriados() {
    return { ...this.feriadosAtivos };
  }

  // Calcular Páscoa (base para outros feriados)
  calcularPascoa(ano) {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = Math.floor((h + l - 7 * m + 114) / 31);
    const p = (h + l - 7 * m + 114) % 31;
    
    return new Date(ano, n - 1, p + 1);
  }

  // Calcular Carnaval (47 dias antes da Páscoa)
  calcularCarnaval(ano) {
    const pascoa = this.calcularPascoa(ano);
    const carnaval = new Date(pascoa);
    carnaval.setDate(pascoa.getDate() - 47);
    
    return {
      segunda: new Date(carnaval),
      terca: new Date(carnaval.getTime() + 24 * 60 * 60 * 1000)
    };
  }

  // Calcular Sexta-feira Santa (2 dias antes da Páscoa)
  calcularSextaSanta(ano) {
    const pascoa = this.calcularPascoa(ano);
    const sextaSanta = new Date(pascoa);
    sextaSanta.setDate(pascoa.getDate() - 2);
    return sextaSanta;
  }

  // Obter todos os feriados de um ano (apenas os ativos)
  getFeriadosAno(ano) {
    if (this.cache.has(ano)) {
      return this.cache.get(ano);
    }

    const feriadosMap = new Map();
    
    // Feriados fixos
    if (this.feriadosAtivos.confraternizacao) {
      feriadosMap.set(new Date(ano, 0, 1).toISOString().split('T')[0], 'confraternizacao');
    }
    if (this.feriadosAtivos.tiradentes) {
      feriadosMap.set(new Date(ano, 3, 21).toISOString().split('T')[0], 'tiradentes');
    }
    if (this.feriadosAtivos.dia_trabalhador) {
      feriadosMap.set(new Date(ano, 4, 1).toISOString().split('T')[0], 'dia_trabalhador');
    }
    if (this.feriadosAtivos.independencia) {
      feriadosMap.set(new Date(ano, 8, 7).toISOString().split('T')[0], 'independencia');
    }
    if (this.feriadosAtivos.nossa_senhora) {
      feriadosMap.set(new Date(ano, 9, 12).toISOString().split('T')[0], 'nossa_senhora');
    }
    if (this.feriadosAtivos.finados) {
      feriadosMap.set(new Date(ano, 10, 2).toISOString().split('T')[0], 'finados');
    }
    if (this.feriadosAtivos.proclamacao_republica) {
      feriadosMap.set(new Date(ano, 10, 15).toISOString().split('T')[0], 'proclamacao_republica');
    }
    if (this.feriadosAtivos.natal) {
      feriadosMap.set(new Date(ano, 11, 25).toISOString().split('T')[0], 'natal');
    }

    // Feriados móveis
    const carnaval = this.calcularCarnaval(ano);
    const sextaSanta = this.calcularSextaSanta(ano);

    if (this.feriadosAtivos.carnaval_segunda) {
      feriadosMap.set(carnaval.segunda.toISOString().split('T')[0], 'carnaval_segunda');
    }
    if (this.feriadosAtivos.carnaval_terca) {
      feriadosMap.set(carnaval.terca.toISOString().split('T')[0], 'carnaval_terca');
    }
    if (this.feriadosAtivos.sexta_santa) {
      feriadosMap.set(sextaSanta.toISOString().split('T')[0], 'sexta_santa');
    }

    this.cache.set(ano, feriadosMap);
    return feriadosMap;
  }

  // ✅ MÉTODO PARA VERIFICAR SE É FERIADO (compatível com sua rota)
  isHoliday(date) {
    const ano = date.getFullYear();
    const dateString = date.toISOString().split('T')[0];
    const feriadosAno = this.getFeriadosAno(ano);
    
    return feriadosAno.has(dateString);
  }

  // ✅ MÉTODO PARA OBTER NOME DO FERIADO (compatível com sua rota)
  getHolidayName(date) {
    const ano = date.getFullYear();
    const dateString = date.toISOString().split('T')[0];
    const feriadosAno = this.getFeriadosAno(ano);
    
    if (feriadosAno.has(dateString)) {
      const feriadoKey = feriadosAno.get(dateString);
      return this.nomesFeriados[feriadoKey];
    }
    
    return null;
  }

  // Verificar se uma data é feriado (método alternativo)
  isFeriado(date) {
    return this.isHoliday(date);
  }

  // Método auxiliar para verificar dias úteis
  isDiaUtil(date) {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado
    const isFeriadoNacional = this.isHoliday(date);
    
    return !isWeekend && !isFeriadoNacional;
  }
}

// ✅ Exportar instância única
const feriadosBrasil = new FeriadosBrasil();

// ✅ Exportações compatíveis com CommonJS e ES Modules
module.exports = feriadosBrasil;
module.exports.FeriadosBrasil = FeriadosBrasil;
module.exports.default = feriadosBrasil;