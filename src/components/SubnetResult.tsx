import type { SubnetResult } from "../utils/ip";

function hostsRange(r: SubnetResult) {
  if (!r.firstHost || !r.lastHost) return "—";
  return `${r.firstHost} – ${r.lastHost}`;
}

export default function SubnetResultTable({ rows }: { rows: SubnetResult[] }) {
  if (!rows.length) return null;

  return (
    <div className='mt-8'>
      <div className='overflow-x-auto'>
        <table className='w-full border-collapse text-base text-center'>
          <thead>
            <tr className='text-[#1E1E1E]'>
              <th className='px-4 py-2 font-medium border-b border-gray-300'>
                Sub-rede
              </th>
              <th className='px-4 py-2 font-medium border-b border-gray-300'>
                Endereço da rede
              </th>
              <th className='px-4 py-2 font-medium border-b border-gray-300'>
                Máscara
              </th>
              <th className='px-4 py-2 font-medium border-b border-gray-300'>
                CIDR
              </th>
              <th className='px-4 py-2 font-medium border-b border-gray-300'>
                Hosts Válidos
              </th>
              <th className='px-4 py-2 font-medium border-b border-gray-300'>
                Endereço de Broadcast
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.index}
                className='text-[#1E1E1E] border-b border-gray-300 last:border-b-0'
              >
                <td className='px-4 py-3'>{r.index}</td>
                <td className='px-4 py-3'>{r.network}</td>
                <td className='px-4 py-3'>{r.mask}</td>
                <td className='px-4 py-3'>/{r.prefix}</td>
                <td className='px-4 py-3'>{hostsRange(r)}</td>
                <td className='px-4 py-3'>{r.broadcast ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
