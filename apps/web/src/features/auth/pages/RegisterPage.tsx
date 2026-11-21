import { PagePlaceholder } from '@/app/layout/PagePlaceholder';
import { ButtonLink } from '@/components/ui/Button';

export function RegisterPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-sheet sm:my-12 sm:min-h-0 sm:rounded-card sm:border sm:border-hairline">
      <PagePlaceholder
        heading="Sign-up is on its way"
        title="Create your account"
        description="Pick a username and start following people."
      >
        <ButtonLink to="/login">I already have an account</ButtonLink>
      </PagePlaceholder>
    </main>
  );
}
