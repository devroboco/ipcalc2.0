// src/components/FormSection.tsx
import { useMemo, useState } from "react";
import InputField from "./InputField";
import SelectField, { type Option } from "./SelectField";
import FormActions from "./FormActions";
import SubnetResultTable from "./SubnetResult";
import {
  ipToInt,
  maskToPrefix,
  normalizeNetwork,
  subnetByCount,
  vlsmByHosts,
  type SubnetResult,
} from "../utils/ip";

const subnetOptions: Option[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

export default function FormSection() {
  // topo
  const [network, setNetwork] = useState("");
  const [mask, setMask] = useState("");
  const [subnetCount, setSubnetCount] = useState("1");

  // hosts (sub-redes)
  const [hosts1, setHosts1] = useState("");
  const [hosts2, setHosts2] = useState("0");
  const [hosts3, setHosts3] = useState("0");
  const [hosts4, setHosts4] = useState("0");

  const [rows, setRows] = useState<SubnetResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // CIDR acompanha máscara
  const cidr = useMemo(() => maskToPrefix(mask), [mask]);
  const cidrText = cidr == null ? "" : `/${cidr}`;

  // habilitação de sub-redes conforme select 1..4
  const n = Number(subnetCount) || 1;
  const h2Disabled = n < 2;
  const h3Disabled = n < 3;
  const h4Disabled = n < 4;

  // ao mudar quantidade, zera os inputs desabilitados
  function handleSubnetCountChange(val: string) {
    const clamped = ["1", "2", "3", "4"].includes(val) ? val : "1";
    setSubnetCount(clamped);
    const asN = Number(clamped);
    if (asN < 2) setHosts2("0");
    if (asN < 3) setHosts3("0");
    if (asN < 4) setHosts4("0");
  }

  function handleClear() {
    setNetwork("");
    setMask("");
    setSubnetCount("1");
    setHosts1("");
    setHosts2("0");
    setHosts3("0");
    setHosts4("0");
    setRows([]);
    setError(null);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setRows([]);

    // valida entradas
    const ipInt = ipToInt(network);
    if (ipInt == null)
      return setError("Endereço de rede inválido. Ex.: 192.168.0.0");
    if (cidr == null) return setError("Máscara de rede inválida.");

    // normaliza rede base
    const base = normalizeNetwork(network, cidr);
    if (!base) return setError("Não foi possível normalizar a rede base.");

    // coleta hosts habilitados
    const enabledHosts = [
      Number(hosts1) || 0,
      h2Disabled ? 0 : Number(hosts2) || 0,
      h3Disabled ? 0 : Number(hosts3) || 0,
      h4Disabled ? 0 : Number(hosts4) || 0,
    ];
    const anyHosts = enabledHosts.some((h) => h > 0);

    try {
      let result: SubnetResult[] = [];
      if (anyHosts) {
        // VLSM
        result = vlsmByHosts({
          network: base,
          prefix: cidr,
          hosts: enabledHosts,
        });
      } else {
        // Subnetting por quantidade (1..4)
        const count = Number(subnetCount) || 1;
        result = subnetByCount({ network: base, prefix: cidr, subnets: count });
      }
      setRows(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao calcular sub-redes.");
      }
    }
  }

  return (
    <section className='w-full max-w-5xl mx-auto mt-8 px-4'>
      <form
        onSubmit={handleSubmit}
        className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
      >
        {/* topo */}
        <InputField
          id='network'
          label='Endereço de rede'
          placeholder='Ex.: 192.168.0.0'
          value={network}
          onChange={setNetwork}
          className='lg:col-span-2'
        />

        <InputField
          id='mask'
          label='Máscara de rede'
          placeholder='Ex.: 255.255.255.0'
          value={mask}
          onChange={setMask}
          className='lg:col-span-2'
        />

        {/* CIDR espelhado da máscara (desabilitado) */}
        <InputField
          id='cidr'
          label='CIDR'
          placeholder='Ex.: /24'
          value={cidrText}
          onChange={() => {}}
          disabled={cidr == null}
        />

        <SelectField
          id='subnet-count'
          label='Número de sub-redes'
          value={subnetCount}
          onChange={handleSubnetCountChange}
          options={subnetOptions}
        />

        {/* título */}
        <div className='md:col-span-2 lg:col-span-4 text-center mt-2'>
          <h3 className='font-roboto font-semibold text-base text-[#1E1E1E]'>
            Quantidade de hosts
          </h3>
        </div>

        {/* sub-redes (menores, centralizadas) */}
        <div className='md:col-span-2 lg:col-span-4 w-full flex flex-col items-center'>
          <div className='mx-auto flex flex-wrap items-end justify-center gap-4 sm:gap-6'>
            <InputField
              id='hosts1'
              label='Sub-rede 1'
              type='number'
              placeholder='Ex.: 60'
              value={hosts1}
              onChange={setHosts1}
              className='w-full sm:w-36 md:w-40'
            />
            <InputField
              id='hosts2'
              label='Sub-rede 2'
              type='number'
              value={hosts2}
              onChange={setHosts2}
              disabled={h2Disabled}
              className='w-full sm:w-28 md:w-32'
            />
            <InputField
              id='hosts3'
              label='Sub-rede 3'
              type='number'
              value={hosts3}
              onChange={setHosts3}
              disabled={h3Disabled}
              className='w-full sm:w-28 md:w-32'
            />
            <InputField
              id='hosts4'
              label='Sub-rede 4'
              type='number'
              value={hosts4}
              onChange={setHosts4}
              disabled={h4Disabled}
              className='w-full sm:w-28 md:w-32'
            />
          </div>
        </div>

        {/* ações */}
        <FormActions onClear={handleClear} onSubmit={() => handleSubmit()} />

        {/* erro */}
        {error && (
          <div className='lg:col-span-4 text-center text-red-600 font-medium'>
            {error}
          </div>
        )}
      </form>

      {/* resultados */}
      <SubnetResultTable rows={rows} />
    </section>
  );
}
