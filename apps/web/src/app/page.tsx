export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[--color-primary-light] px-6 text-center">
      <h1 className="text-3xl font-bold text-[--color-primary]">MissãoApp</h1>
      <p className="mt-3 max-w-md text-zinc-600">
        Painel administrativo em construção. O Módulo 1 (evangelização de campo) já está
        disponível no app mobile — os próximos módulos (funil, retiros, financeiro e dashboard)
        serão implementados aqui.
      </p>
    </div>
  );
}
