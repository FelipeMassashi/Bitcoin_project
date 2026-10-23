/** Mensagem para quando os preços públicos não carregaram. */
export function LoadError({ className = "" }: { className?: string }) {
  return (
    <p role="alert" className={`rounded-panel border border-line bg-surface px-6 py-10 text-center text-sm text-muted ${className}`}>
      Não foi possível carregar os preços da Binance. Verifique sua conexão e recarregue a página.
    </p>
  );
}
