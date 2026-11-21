import { Search } from 'lucide-react';
import { Form, useSearchParams } from 'react-router';

import { Field, FieldInput, FieldLabel } from '@/components/ui/Field';

/**
 * A people search that navigates to `/search?q=…`; live results arrive in C36.
 * It shows the query in the address, so every copy on the page agrees with it.
 */
export function SearchForm() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  return (
    <Form method="get" action="/search" role="search" aria-label="Search people">
      <Field>
        <FieldLabel>Search people</FieldLabel>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.75}
          />
          <FieldInput
            key={query}
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name or @username"
            autoComplete="off"
            enterKeyHint="search"
            className="pl-10"
          />
        </div>
      </Field>
    </Form>
  );
}
