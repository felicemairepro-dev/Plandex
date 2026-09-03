import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/login/mot-de-passe-oublie",
  "/rejoindre",
  "/auth",
  "/apercu",
  // Les routes API gèrent elles-mêmes leur autorisation (ex: CRON_SECRET
  // pour /api/cron/*) — elles n'ont pas de session utilisateur à vérifier.
  "/api",
];

// Marketing/auth pages a logged-in user should be bounced away from.
const AUTH_ENTRY_PATHS = ["/", "/login", "/rejoindre"];

function matchesPath(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => matchesPath(pathname, path));
}

// Every request pays a round trip to Supabase for auth.getUser() below.
// A visitor with no Supabase session cookie at all can never resolve to a
// logged-in user, so skip the network call entirely in that (very common —
// first visit, marketing pages) case.
function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseAuthCookie(request)) {
    if (!isPublicPath(request.nextUrl.pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isPublicPath(request.nextUrl.pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("actif")
      .eq("id", user.id)
      .single<{ actif: boolean }>();

    if (profile && !profile.actif) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("erreur", "compte_desactive");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (
    user &&
    AUTH_ENTRY_PATHS.some((path) => matchesPath(request.nextUrl.pathname, path))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
