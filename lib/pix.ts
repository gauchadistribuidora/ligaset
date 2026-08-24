// Pix "copia e cola" (BR Code). É um padrão aberto do Banco Central: o texto é
// montado aqui mesmo, sem gateway, sem taxa e sem serviço de terceiro. O QR é
// só o desenho desse texto.

export type TipoChave = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF) — o padrão exige no fim.
function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Cada campo é id + tamanho (2 dígitos) + valor.
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

// Tira acento e o que o padrão não aceita. Nome e cidade vão sem firula.
function limpar(texto: string, maximo: number): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo)
    .trim();
}

// Onze dígitos podem ser CPF ou celular com DDD — por isso o tipo é escolhido
// no cadastro. Quando não vier, o dígito verificador do CPF desempata.
export function inferirTipo(chave: string): TipoChave {
  const bruto = (chave || "").trim();
  if (bruto.includes("@")) return "email";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bruto))
    return "aleatoria";

  const so = bruto.replace(/\D/g, "");
  if (so.length === 14) return "cnpj";
  if (so.length === 11) return cpfValido(so) ? "cpf" : "telefone";
  if (so.length === 10) return "telefone";
  return "aleatoria";
}

function cpfValido(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

// O banco só reconhece a chave no formato certo: telefone com +55, CPF e CNPJ
// só dígitos, e-mail como está.
export function normalizarChave(chave: string, tipo?: TipoChave | null): string {
  const bruto = (chave || "").trim();
  const t = tipo ?? inferirTipo(bruto);
  const so = bruto.replace(/\D/g, "");

  if (t === "email") return bruto.toLowerCase();
  if (t === "cpf" || t === "cnpj") return so;
  if (t === "telefone") {
    const semPais = so.startsWith("55") && so.length > 11 ? so.slice(2) : so;
    return `+55${semPais}`;
  }
  return bruto.toLowerCase();
}

export function pixCopiaECola({
  chave,
  tipo,
  nome,
  cidade,
  valor,
  descricao,
}: {
  chave: string;
  tipo?: TipoChave | null;
  nome: string;
  cidade?: string | null;
  valor?: number | null;
  descricao?: string | null;
}): string {
  const conta =
    campo("00", "br.gov.bcb.pix") +
    campo("01", normalizarChave(chave, tipo)) +
    (descricao ? campo("02", limpar(descricao, 40)) : "");

  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor && valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(nome, 25) || "RECEBEDOR") +
    campo("60", limpar(cidade || "SAO PAULO", 15) || "SAO PAULO") +
    campo("62", campo("05", "***"));

  const semCrc = `${corpo}6304`;
  return `${semCrc}${crc16(semCrc)}`;
}
