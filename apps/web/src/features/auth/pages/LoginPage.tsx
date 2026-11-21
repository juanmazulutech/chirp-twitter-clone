import { PagePlaceholder } from '@/app/layout/PagePlaceholder';
import { ButtonLink } from '@/components/ui/Button';

export function LoginPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-sheet sm:my-12 sm:min-h-0 sm:rounded-card sm:border sm:border-hairline">
      <PagePlaceholder
        heading="Signing in is on its way"
        title="Sign in"
        description="Sign in with your email and password."
      >
        <ButtonLink to="/register">Create an account</ButtonLink>
      </PagePlaceholder>
    </main>
  );
}
