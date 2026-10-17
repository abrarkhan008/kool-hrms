import { useStore } from "../lib/store.jsx";

const Box = ({ src }) =>
  src ? (
    <img
      src={src}
      alt=""
      className="h-16 w-auto max-w-[30%] object-contain sm:h-24"
    />
  ) : (
    <div className="w-[30%]" />
  );

export default function BrandBar() {
  const { company } = useStore().state.settings;
  return (
    <div className="card flex items-center justify-between gap-3 p-3 sm:p-4">
      <Box src={company.logoLeft} />
      <div className="min-w-0 flex-1 text-center">
        <div className="text-lg font-bold text-brand sm:text-2xl">
          {company.name}
        </div>
        <div className="text-xs text-slate-500">{company.tagline}</div>
        <div className="text-[11px] text-slate-400">{company.address}</div>
      </div>
      <Box src={company.logoRight} />
    </div>
  );
}
