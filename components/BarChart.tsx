export default function BarChart({ data, title }: { data: { label: string; value: number; color?: string }[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 300 / Math.max(1, data.length);
  return (
    <figure className="rounded-xl border bg-white p-4">
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <svg viewBox="0 0 300 130" className="w-full" role="img" aria-label={title}>
        {data.map((d, i) => {
          const h = (d.value / max) * 90;
          return (<g key={d.label + i}>
            <rect x={i * w + 3} y={100 - h} width={Math.max(2, w - 6)} height={h} rx="2" fill={d.color || "#0f172a"} />
            <text x={i * w + w / 2} y={96 - h} fontSize="8" textAnchor="middle" fill="#475569">{d.value}</text>
            <text x={i * w + w / 2} y={115} fontSize="8" textAnchor="middle" fill="#64748b">{d.label}</text>
          </g>);
        })}
      </svg>
    </figure>
  );
}
