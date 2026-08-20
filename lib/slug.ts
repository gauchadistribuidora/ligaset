// Códigos de link legíveis. Um endereço cheio de número aleatório assusta
// quem recebe — parece golpe. Aqui o link carrega o nome do jogo e só um
// pedacinho aleatório, o suficiente para ninguém adivinhar.

// Sem 0/o, 1/l/i: em letra pequena no celular dá para confundir.
const ALFABETO = "23456789abcdefghjkmnpqrstuvwxyz";

function pedacoAleatorio(tamanho: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

export function apelidar(texto: string, maximo = 28): string {
  const limpo = (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpo.slice(0, maximo).replace(/-+$/g, "");
}

// Ex.: "1ª QUINTA" -> "1a-quinta-x7k2"
export function codigoAmigavel(nome: string, tamanhoSufixo = 4): string {
  const base = apelidar(nome);
  const sufixo = pedacoAleatorio(tamanhoSufixo);
  return base ? `${base}-${sufixo}` : `jogo-${pedacoAleatorio(6)}`;
}
