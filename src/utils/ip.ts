// src/utils/ip.ts

// =======================
// Tipos
// =======================
export type IPv4 = string;

export type SubnetResult = {
  index: number;
  network: IPv4;
  firstHost: IPv4 | null;
  lastHost: IPv4 | null;
  broadcast: IPv4 | null;
  mask: IPv4;
  prefix: number;
  hostsUsable: number;
};

export type CalcPolicy = {
  /** Exigir que todas as sub-redes tenham hosts utilizáveis (modelo clássico). Default: true */
  requireUsableHosts?: boolean;
};

// =======================
// Conversões IP ⇄ inteiro
// =======================
export function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p < 0 || p > 255)) return null;
  return (
    ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  );
}

export function intToIp(n: number): IPv4 {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(
    "."
  ) as IPv4;
}

// =======================
/* Máscara ⇄ prefixo */
// =======================
export function prefixToMask(prefix: number): IPv4 {
  if (prefix < 0 || prefix > 32) throw new Error("Prefixo inválido");
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

/** Converte máscara decimal (ex.: 255.255.255.0) para /xx. Retorna null se não for contígua. */
export function maskToPrefix(maskStr: string): number | null {
  const mask = ipToInt(maskStr);
  if (mask == null) return null;
  if (mask === 0) return 0;
  let countOnes = 0;
  let seenZero = false;
  for (let bit = 31; bit >= 0; bit--) {
    const isOne = ((mask >>> bit) & 1) === 1;
    if (isOne) {
      if (seenZero) return null; // 1 após já ter visto 0 -> não contígua
      countOnes++;
    } else {
      seenZero = true;
    }
  }
  return countOnes;
}

export function isValidMask(maskStr: string): boolean {
  return maskToPrefix(maskStr) !== null;
}

// =======================
// Normalização de rede
// =======================
export function normalizeNetwork(ipStr: string, prefix: number): IPv4 | null {
  const ip = ipToInt(ipStr);
  if (ip == null) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ip & mask;
  return intToIp(network);
}

// =======================
// Helpers matemáticos
// =======================
export function blockSize(prefix: number): number {
  return 2 ** (32 - prefix);
}

export function usableHosts(prefix: number): number {
  if (prefix >= 31) return 0; // modelo clássico
  return blockSize(prefix) - 2;
}

export function requiredPrefixForHosts(hosts: number): number {
  const total = hosts + 2; // network + broadcast
  const pow = Math.ceil(Math.log2(Math.max(total, 1)));
  return Math.max(0, Math.min(32, 32 - pow));
}

// =======================
// Subnetting por quantidade (iguais)
// =======================
export function subnetByCount(params: {
  network: IPv4;
  prefix: number;
  subnets: number;
  policy?: CalcPolicy;
}): SubnetResult[] {
  const { network, prefix, subnets, policy } = params;
  if (subnets <= 0) return [];

  // se a rede base já não tem hosts (ex.: /31 ou /32) e a policy exige hosts, aborta cedo
  if ((policy?.requireUsableHosts ?? true) && usableHosts(prefix) <= 0) {
    throw new Error("A rede base não possui hosts utilizáveis (/31 ou /32).");
  }

  const netInt = ipToInt(network);
  if (netInt == null) throw new Error("Endereço de rede inválido");

  const extraBits = Math.ceil(Math.log2(subnets));
  const newPrefix = prefix + extraBits;
  if (newPrefix > 32) {
    throw new Error("Quantidade de sub-redes excede o espaço disponível");
  }

  // regra geral: precisa haver hosts utilizáveis nas sub-redes resultantes
  if ((policy?.requireUsableHosts ?? true) && usableHosts(newPrefix) <= 0) {
    throw new Error(
      "Não é possível subdividir: as sub-redes resultantes não possuem hosts utilizáveis (/31 ou /32)."
    );
  }

  const size = blockSize(newPrefix);
  const results: SubnetResult[] = [];
  for (let i = 0; i < subnets; i++) {
    const base = (netInt + i * size) >>> 0;
    results.push(makeSubnet(base, newPrefix, i + 1));
  }
  return results;
}

// =======================
// VLSM (tamanhos variáveis por demanda de hosts)
// =======================
export function vlsmByHosts(params: {
  network: IPv4;
  prefix: number;
  hosts: number[];
  policy?: CalcPolicy;
}): SubnetResult[] {
  const { network, prefix, policy } = params;
  const reqs = [...params.hosts].filter((n) => n > 0).sort((a, b) => b - a);

  // rede base sem hosts utilizáveis
  if ((policy?.requireUsableHosts ?? true) && usableHosts(prefix) <= 0) {
    throw new Error("A rede base não possui hosts utilizáveis (/31 ou /32).");
  }

  const netInt = ipToInt(network);
  if (netInt == null) throw new Error("Rede inválida");

  const totalSpace = blockSize(prefix);
  let cursor = netInt >>> 0;
  const results: SubnetResult[] = [];

  reqs.forEach((hosts, idx) => {
    let p = requiredPrefixForHosts(hosts);
    if (p < prefix) p = prefix; // não pode menor que o prefixo base

    if ((policy?.requireUsableHosts ?? true) && usableHosts(p) <= 0) {
      throw new Error(
        `A demanda de ${hosts} hosts resultaria em sub-rede sem hosts utilizáveis (/31 ou /32).`
      );
    }

    const size = blockSize(p);
    // alinha ao boundary do bloco
    const aligned = (cursor + size - 1) & ~(size - 1);
    if (aligned - netInt + size > totalSpace) {
      throw new Error("As sub-redes solicitadas (VLSM) não cabem na rede base");
    }

    results.push(makeSubnet(aligned >>> 0, p, idx + 1));
    cursor = (aligned + size) >>> 0;
  });

  return results;
}

// =======================
// Modo Híbrido (VLSM + divisão igual do restante)
// =======================
export function hybridByCountAndHosts(params: {
  network: IPv4;
  prefix: number;
  subnetCount: number; // N total escolhido pelo usuário
  hosts: number[]; // lista com 0 para as que não têm demanda
  policy?: CalcPolicy;
}): SubnetResult[] {
  const { network, prefix, subnetCount, policy } = params;
  const requireUsable = policy?.requireUsableHosts ?? true;

  if (subnetCount <= 0) return [];
  if (requireUsable && usableHosts(prefix) <= 0) {
    throw new Error("A rede base não possui hosts utilizáveis (/31 ou /32).");
  }

  const netInt = ipToInt(network);
  if (netInt == null) throw new Error("Rede inválida");

  // 1) Separa demandas > 0 (ordem desc) e conta quantas foram especificadas
  const specifiedHosts = [...params.hosts]
    .filter((n) => n > 0)
    .sort((a, b) => b - a);
  const k = specifiedHosts.length;
  if (k > subnetCount) {
    throw new Error(
      "Quantidade de sub-redes selecionadas é menor que o número de demandas de hosts informadas."
    );
  }

  const totalSpace = blockSize(prefix);
  let cursor = netInt >>> 0;
  const results: SubnetResult[] = [];

  // 2) Aloca VLSM para as K demandas
  specifiedHosts.forEach((hosts) => {
    let p = requiredPrefixForHosts(hosts);
    if (p < prefix) p = prefix;

    if (requireUsable && usableHosts(p) <= 0) {
      throw new Error(
        `A demanda de ${hosts} hosts resultaria em sub-rede sem hosts utilizáveis (/31 ou /32).`
      );
    }

    const size = blockSize(p);
    const aligned = (cursor + size - 1) & ~(size - 1);
    if (aligned - netInt + size > totalSpace) {
      throw new Error("As sub-redes solicitadas (VLSM) não cabem na rede base");
    }
    results.push(makeSubnet(aligned >>> 0, p, results.length + 1));
    cursor = (aligned + size) >>> 0;
  });

  // 3) Subnetting padrão para as (N - K) restantes
  const remaining = subnetCount - k;
  if (remaining <= 0) {
    return results;
  }

  const used = cursor - netInt;
  const remainingSpace = totalSpace - used;
  if (remainingSpace <= 0) {
    throw new Error(
      "Não há espaço restante na rede para alocar as sub-redes adicionais."
    );
  }

  // Tamanho igual para cada uma das restantes:
  // escolhe a MAIOR potência de 2 <= floor(remainingSpace / remaining)
  const perBlockTarget = Math.floor(remainingSpace / remaining);
  if (perBlockTarget <= 0) {
    throw new Error(
      "Não há espaço suficiente para dividir igualmente as sub-redes restantes."
    );
  }

  const pow = 1 << Math.floor(Math.log2(perBlockTarget));
  const pEq = 32 - Math.floor(Math.log2(pow));

  if (requireUsable && usableHosts(pEq) <= 0) {
    throw new Error(
      "As sub-redes restantes ficariam sem hosts utilizáveis (/31 ou /32)."
    );
  }

  const sizeEq = blockSize(pEq);

  for (let i = 0; i < remaining; i++) {
    const aligned = (cursor + sizeEq - 1) & ~(sizeEq - 1);
    if (aligned - netInt + sizeEq > totalSpace) {
      throw new Error(
        "Não há espaço suficiente para alocar todas as sub-redes restantes igualmente."
      );
    }
    results.push(makeSubnet(aligned >>> 0, pEq, results.length + 1));
    cursor = (aligned + sizeEq) >>> 0;
  }

  return results;
}

// =======================
// Montagem do resultado
// =======================
function makeSubnet(base: number, prefix: number, index = 1): SubnetResult {
  const mask = prefixToMask(prefix);
  const size = blockSize(prefix);
  const network = base >>> 0;
  const broadcast = prefix >= 31 ? null : intToIp((network + size - 1) >>> 0);
  const firstHost = prefix >= 31 ? null : intToIp((network + 1) >>> 0);
  const lastHost = prefix >= 31 ? null : intToIp((network + size - 2) >>> 0);

  return {
    index,
    network: intToIp(network),
    firstHost,
    lastHost,
    broadcast,
    mask,
    prefix,
    hostsUsable: usableHosts(prefix),
  };
}

// =====================================================================
//                     VALIDAÇÃO REFORÇADA E PRECISA
// =====================================================================

/** Zeros à esquerda (ex.: "01", "001") – exceto o próprio "0". */
export function hasLeadingZeros(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true;
  return parts.some((p) => p.length > 1 && p.startsWith("0"));
}

type CidrBlock = { cidr: string; label: string };

function parseCIDR(cidr: string): { net: number; mask: number } {
  const [ip, pStr] = cidr.split("/");
  const prefix = Number(pStr);
  const ipInt = ipToInt(ip);
  if (ipInt == null || isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`CIDR inválido: ${cidr}`);
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const net = ipInt & mask;
  return { net, mask };
}

function ipInCIDR(ip: string, cidr: string): boolean {
  const ipInt = ipToInt(ip);
  if (ipInt == null) return false;
  const { net, mask } = parseCIDR(cidr);
  return (ipInt & mask) === net;
}

// Blocos reservados (RFCs) – referência (não usados diretamente abaixo)
const RESERVED_BLOCKS: CidrBlock[] = [
  { cidr: "0.0.0.0/8", label: "Current network/unspecified" },
  { cidr: "0.0.0.0/32", label: "Unspecified address" },
  { cidr: "255.255.255.255/32", label: "Limited broadcast" },
  { cidr: "127.0.0.0/8", label: "Loopback" },
  { cidr: "169.254.0.0/16", label: "Link-local (APIPA)" },
  { cidr: "224.0.0.0/4", label: "Multicast" },
  { cidr: "240.0.0.0/4", label: "Reserved for future use" },
  { cidr: "100.64.0.0/10", label: "Carrier-grade NAT" },
  { cidr: "192.0.0.0/24", label: "IETF Protocol Assignments" },
  { cidr: "192.0.2.0/24", label: "TEST-NET-1 (doc)" },
  { cidr: "198.51.100.0/24", label: "TEST-NET-2 (doc)" },
  { cidr: "203.0.113.0/24", label: "TEST-NET-3 (doc)" },
  { cidr: "198.18.0.0/15", label: "Benchmarking" },
];

// Blocos privados (configuráveis)
const PRIVATE_BLOCKS: CidrBlock[] = [
  { cidr: "10.0.0.0/8", label: "Private 10/8" },
  { cidr: "172.16.0.0/12", label: "Private 172.16/12" },
  { cidr: "192.168.0.0/16", label: "Private 192.168/16" },
];

export type IPPolicy = {
  allowPrivate?: boolean; // default: true
  allowLoopback?: boolean; // default: false
  allowLinkLocal?: boolean; // default: false
  allowMulticast?: boolean; // default: false
  allowReserved?: boolean; // default: false
  allowCGNAT?: boolean; // default: false
};

/**
 * Validação "usável" de IPv4 com mensagens precisas.
 * Retorna { ok, reason, blockedBy } sem lançar erro.
 */
export function isValidIPv4Usable(
  ip: string,
  policy: IPPolicy = {}
): { ok: boolean; reason?: string; blockedBy?: string } {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return { ok: false, reason: "Formato IPv4 inválido (a.b.c.d)." };

  if (hasLeadingZeros(ip)) {
    return {
      ok: false,
      reason: "Octetos com zero à esquerda não são permitidos.",
    };
  }

  const octets = m.slice(1).map(Number);
  if (octets.some((o) => o < 0 || o > 255)) {
    return { ok: false, reason: "Octeto fora da faixa 0–255." };
  }

  const {
    allowPrivate = true,
    allowLoopback = false,
    allowLinkLocal = false,
    allowMulticast = false,
    allowReserved = false,
    allowCGNAT = false,
  } = policy;

  // sempre bloquear endereços individuais especiais
  if (ipInCIDR(ip, "0.0.0.0/32"))
    return { ok: false, reason: "Endereço 0.0.0.0 é reservado." };
  if (ipInCIDR(ip, "255.255.255.255/32")) {
    return { ok: false, reason: "Endereço 255.255.255.255 é broadcast." };
  }

  const blocksToCheck: CidrBlock[] = [];
  if (!allowReserved) blocksToCheck.push(...RESERVED_BLOCKS);
  if (!allowLoopback)
    blocksToCheck.push({ cidr: "127.0.0.0/8", label: "Loopback" });
  if (!allowLinkLocal)
    blocksToCheck.push({ cidr: "169.254.0.0/16", label: "Link-local (APIPA)" });
  if (!allowMulticast)
    blocksToCheck.push({ cidr: "224.0.0.0/4", label: "Multicast" });
  if (!allowCGNAT)
    blocksToCheck.push({ cidr: "100.64.0.0/10", label: "CGNAT" });
  if (!allowPrivate) blocksToCheck.push(...PRIVATE_BLOCKS);

  for (const b of blocksToCheck) {
    if (ipInCIDR(ip, b.cidr)) {
      return {
        ok: false,
        reason: "Endereço reservado para uso especial.",
        blockedBy: b.label,
      };
    }
  }

  return { ok: true };
}

// =======================
// Validação detalhada de máscara
// =======================
export function validateMask(maskStr: string): {
  ok: boolean;
  prefix?: number;
  reason?: string;
} {
  // formato
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(maskStr);
  if (!m)
    return { ok: false, reason: "Formato de máscara inválido (a.b.c.d)." };

  const octets = m.slice(1).map(Number);
  if (octets.some((o) => o < 0 || o > 255)) {
    return { ok: false, reason: "Octeto da máscara fora da faixa 0–255." };
  }

  const p = maskToPrefix(maskStr);
  if (p === null) {
    return {
      ok: false,
      reason: "Máscara não contígua (deve ser 1s seguidos de 0s).",
    };
  }

  return { ok: true, prefix: p };
}

// =======================
// Ponto de entrada para a UI
// =======================
/**
 * Valida IP e máscara com mensagens precisas, normaliza a rede
 * e retorna { base, prefix }. Lança Error com mensagem amigável.
 */
export function prepareBaseNetwork(
  ip: string,
  maskStr: string,
  policy: IPPolicy = {}
): { base: IPv4; prefix: number } {
  const v = isValidIPv4Usable(ip, policy);
  if (!v.ok) {
    const extra = v.blockedBy ? ` (${v.blockedBy})` : "";
    throw new Error(
      v.reason ? `${v.reason}${extra}` : "Endereço IPv4 inválido."
    );
  }

  const vm = validateMask(maskStr);
  if (!vm.ok || vm.prefix == null) {
    throw new Error(vm.reason ?? "Máscara de rede inválida.");
  }

  const base = normalizeNetwork(ip, vm.prefix);
  if (!base) throw new Error("Não foi possível normalizar a rede base.");

  return { base, prefix: vm.prefix };
}
