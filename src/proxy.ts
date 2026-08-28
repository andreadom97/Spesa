import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Chi non ha sessione viene reindirizzato a /entra; /entra stessa resta
 * accessibile. Convenzione Next.js 16: `middleware.ts` è deprecato in favore
 * di `proxy.ts` (file e nome della funzione esportata, non solo la posizione).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const paginaEntra = request.nextUrl.pathname.startsWith('/entra');
  // /auth/callback scambia il code del magic link per una sessione: deve
  // poter girare senza sessione già presente, altrimenti il proxy la
  // rimanderebbe a /entra prima ancora che la sessione venga scritta. Solo
  // questo prefisso, non l'intero resto: il matcher qui sotto continua a
  // proteggere tutte le altre rotte.
  const paginaAuth = request.nextUrl.pathname.startsWith('/auth');
  if (!user && !paginaEntra && !paginaAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/entra';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Esclude gli asset statici e le route interne di Next: la sessione non
  // ha senso per un file .png quanto per una pagina. manifest.json e sw.js
  // sono pubblici per natura — non contengono dati dell'utente — e devono
  // restare raggiungibili senza sessione: il browser li scarica per
  // decidere se l'app è installabile e per registrare il service worker,
  // anche prima che ci sia un login.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
