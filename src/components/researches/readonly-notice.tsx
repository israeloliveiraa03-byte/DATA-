import Link from "next/link";

interface Props {
  researchId: string;
  title: string;
}

export function ResearchReadOnlyNotice({ researchId, title }: Props) {
  return (
    <div className="min-h-full flex items-center justify-center bg-ink-950 px-4">
      <div className="max-w-md text-center">
        <i className="ti ti-eye text-3xl text-brand-400 mb-3" aria-hidden="true" />
        <h1 className="text-lg font-bold text-ink-100 mb-2">Somente leitura</h1>
        <p className="text-sm text-ink-300 mb-4">
          Você tem acesso de visualizador a &ldquo;{title}&rdquo; — peça a um editor ou ao dono da pesquisa pra mexer aqui.
        </p>
        <Link href={`/researches/${researchId}`} className="text-sm font-semibold text-brand-400 hover:underline">
          Voltar pra pesquisa
        </Link>
      </div>
    </div>
  );
}
