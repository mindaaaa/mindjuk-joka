import { LoginForm } from '@/features/auth';

export function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold">JOKA</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            우리 아이의 앨범, 함께 채우기.
          </p>
        </header>
        <LoginForm />
      </section>
    </main>
  );
}
