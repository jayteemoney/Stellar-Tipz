import React from 'react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

const Table: React.FC<TableProps> = ({ columns, data, onRowClick }) => (
  <div className="overflow-x-auto w-full border-2 border-black">
    <table className="w-full border-collapse min-w-max">
      <thead>
        <tr className="bg-black text-white">
          {columns.map((col) => (
            <th
              key={col.key}
              className={`px-4 py-3 font-black uppercase tracking-wide text-sm border-r-2 border-white last:border-r-0 ${alignClass[col.align ?? 'left']}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={i}
            onClick={() => onRowClick?.(row)}
            className={[
              i % 2 === 0 ? 'bg-white' : 'bg-gray-50',
              'border-t-2 border-black transition-transform duration-150',
              onRowClick ? 'cursor-pointer hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : '',
            ].join(' ')}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-4 py-3 text-sm border-r-2 border-black last:border-r-0 ${alignClass[col.align ?? 'left']}`}
              >
                {String(row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Table;
