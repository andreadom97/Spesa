import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Chi non ha sessione viene reindirizzato a /entra; /entra stessa resta accessibile. */
export async function middleware(request: NextRequest) {
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
  if (!user && !paginaEntra) {
    const url = request.nextUrl.clone();
    url.pathname = '/entra';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Esclude gli asset statici e le route interne di Next: la sessione non
  // ha senso per un file .png quanto per una pagina.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
