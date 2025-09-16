// src/utils/ip.ts

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

// ---------- conversões ----------
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

// ---------- máscaras/prefixos ----------
export function prefixToMask(prefix: number): IPv4 {
  if (prefix < 0 || prefix > 32) throw new Error("Prefixo inválido");
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

/**
 * Converte máscara decimal em prefixo (/xx).
 * Aceita apenas máscaras de 1s contíguos à esquerda (ex.: 255.255.255.0).
 */
export function maskToPrefix(maskStr: string): number | null {
  const mask = ipToInt(maskStr);
  if (mask == null) return null;

  if (mask === 0) return 0; // /0

  let countOnes = 0;
  let seenZero = false;

  // percorre do bit 31 ao 0 (MSB -> LSB)
  for (let bit = 31; bit >= 0; bit--) {
    const isOne = ((mask >>> bit) & 1) === 1;
    if (isOne) {
      if (seenZero) return null; // encontrou 1 depois de já ter visto 0 -> não contígua
      countOnes++;
    } else {
      seenZero = true;
    }
  }
  // após contar 1s, o resto já foi checado como zeros
  return countOnes;
}

export function isValidMask(maskStr: string): boolean {
  return maskToPrefix(maskStr) !== null;
}

export function normalizeNetwork(ipStr: string, prefix: number): IPv4 | null {
  const ip = ipToInt(ipStr);
  if (ip == null) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ip & mask;
  return intToIp(network);
}

// ---------- helpers ----------
export function blockSize(prefix: number): number {
  return 2 ** (32 - prefix);
}

export function usableHosts(prefix: number): number {
  if (prefix >= 31) return 0;
  return blockSize(prefix) - 2;
}

export function requiredPrefixForHosts(hosts: number): number {
  const total = hosts + 2; // network+broadcast
  const pow = Math.ceil(Math.log2(Math.max(total, 1)));
  return Math.max(0, Math.min(32, 32 - pow));
}

// ---------- subnetting por quantidade ----------
export function subnetByCount(params: {
  network: IPv4;
  prefix: number;
  subnets: number;
}): SubnetResult[] {
  const { network, prefix, subnets } = params;
  if (subnets <= 0) return [];

  const netInt = ipToInt(network);
  if (netInt == null) throw new Error("Endereço de rede inválido");

  const extraBits = Math.ceil(Math.log2(subnets));
  const newPrefix = prefix + extraBits;
  if (newPrefix > 32)
    throw new Error("Quantidade de sub-redes excede o espaço disponível");

  const size = blockSize(newPrefix);
  const results: SubnetResult[] = [];
  for (let i = 0; i < subnets; i++) {
    const base = (netInt + i * size) >>> 0;
    results.push(makeSubnet(base, newPrefix, i + 1));
  }
  return results;
}

// ---------- VLSM ----------
export function vlsmByHosts(params: {
  network: IPv4;
  prefix: number;
  hosts: number[];
}): SubnetResult[] {
  const { network, prefix } = params;
  const reqs = [...params.hosts].filter((n) => n > 0).sort((a, b) => b - a);
  const netInt = ipToInt(network);
  if (netInt == null) throw new Error("Rede inválida");

  const totalSpace = blockSize(prefix);
  let cursor = netInt >>> 0;
  const results: SubnetResult[] = [];

  reqs.forEach((hosts, idx) => {
    let p = requiredPrefixForHosts(hosts);
    if (p < prefix) p = prefix; // não pode maior que a rede base

    const size = blockSize(p);
    const aligned = (cursor + size - 1) & ~(size - 1); // alinha ao boundary
    if (aligned - netInt + size > totalSpace) {
      throw new Error("As sub-redes solicitadas (VLSM) não cabem na rede base");
    }
    results.push(makeSubnet(aligned >>> 0, p, idx + 1));
    cursor = (aligned + size) >>> 0;
  });

  return results;
}

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
