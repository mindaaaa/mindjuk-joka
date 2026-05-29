// 가입/로그인 화면 — 실제 구현은 후속 PR에서 진행
export function AuthPage() {
  return (
    <section className="mx-auto max-w-md p-6">
      <h2 className="text-2xl font-semibold">로그인</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        카카오 계정으로 로그인하세요.
      </p>
    </section>
  );
}
