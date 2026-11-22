import { Search } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import { Field, FieldInput, FieldLabel } from '@/components/ui/Field';

/** How long typing must pause before the results follow it. */
const SEARCH_DEBOUNCE_MS = 300;

function searchPath(text: string): string {
  const query = text.trim();
  return query ? `/search?${new URLSearchParams({ q: query }).toString()}` : '/search';
}

/**
 * People search. The address (`/search?q=…`) is the single source of truth: typing updates it
 * once the typist pauses, Enter updates it at once, and every copy of the form follows it, so
 * back and forward restore both the field and the results.
 */
export function SearchForm() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const query = searchParams.get('q') ?? '';
  const onSearchPage = pathname === '/search';

  const [text, setText] = useState(query);
  // The address changed from elsewhere (another copy of the form, history): show it here too.
  const [shownQuery, setShownQuery] = useState(query);
  if (query !== shownQuery) {
    setShownQuery(query);
    setText(query);
  }

  useEffect(() => {
    if (text.trim() === query.trim()) return;
    // Elsewhere, an emptied field is no search at all; on the search page it clears the results.
    if (!onSearchPage && !text.trim()) return;
    const timer = setTimeout(() => {
      // Each keystroke replaces the entry, so back leaves the search instead of replaying it.
      void navigate(searchPath(text), { replace: onSearchPage });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, query, onSearchPage, navigate]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate(searchPath(text), { replace: onSearchPage });
  }

  return (
    <form role="search" aria-label="Search people" onSubmit={submit}>
      <Field>
        <FieldLabel>Search people</FieldLabel>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.75}
          />
          <FieldInput
            type="search"
            name="q"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            placeholder="Name or @username"
            autoComplete="off"
            enterKeyHint="search"
            className="pl-10"
          />
        </div>
      </Field>
    </form>
  );
}
