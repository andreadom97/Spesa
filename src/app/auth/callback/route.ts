import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Punto di atterraggio del magic link. `createBrowserClient` di @supabase/ssr
 * usa PKCE: il link arriva con `?code=...` e va scambiato per una sessione
 * scritta nei cookie *sul server*, altrimenti il browser non vede mai una
 * sessione e il proxy rimanda sempre a /entra — il ciclo chiuso di C1.
 *
 * Route handler, non componente: solo qui `exchangeCodeForSession` può
 * scrivere cookie httpOnly sulla risposta prima che la pagina successiva
 * venga servita.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    console.error('auth/callback: nessun "code" nella query string.', url.toString());
    return NextResponse.redirect(
      new URL('/entra?errore=link-non-valido', url.origin),
    );
  }

  const response = NextResponse.redirect(new URL('/lista', url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('auth/callback: exchangeCodeForSession fallita.', error);
    return NextResponse.redirect(
      new URL('/entra?errore=accesso-fallito', url.origin),
    );
  }

  return response;
}
