# Plandex

Application interne de gestion de planning pour les extras/indépendants. Accès strictement privé (pas de compte public, pas d'inscription libre).

**Stack** : Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth + DB) · Vercel

## Configuration du projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings > API**, récupérez :
   - `Project URL`
   - `anon public` key
3. Copiez `.env.local.example` vers `.env.local` et renseignez ces deux valeurs :

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-public
   ```

4. Exécutez la migration SQL pour créer la table `profiles` et les policies RLS : ouvrez **SQL Editor** dans le dashboard Supabase, collez le contenu de [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql), puis lancez-le.

   Cette migration crée :
   - un type `user_role` (`admin` | `extra`)
   - une table `profiles` (liée à `auth.users`, avec `full_name` et `role`)
   - les Row Level Security policies : un `extra` ne peut lire/modifier que son propre profil, un `admin` peut tout lire/modifier
   - un trigger qui crée automatiquement une ligne `profiles` à chaque nouvelle inscription (rôle `extra` par défaut)

5. Dans **Authentication > Email Templates**, vérifiez que le template "Reset Password" utilise bien un lien vers `/auth/confirm` (c'est le comportement par défaut de Supabase, compatible avec la route déjà en place dans le projet).

6. Dans **Authentication > URL Configuration**, ajoutez votre URL de développement et de production (ex. `http://localhost:3000`, `https://votre-app.vercel.app`) aux **Redirect URLs**.

## Créer le premier compte admin

Aucune inscription publique n'existe : les comptes sont créés manuellement (puis, plus tard, depuis une interface d'administration à construire).

1. Dans le dashboard Supabase, allez dans **Authentication > Users > Add user**.
2. Renseignez votre email et un mot de passe, cochez **Auto Confirm User**, puis créez l'utilisateur.
   → Le trigger crée automatiquement une ligne dans `profiles` avec le rôle `extra`.
3. Passez ce compte en admin. Dans **SQL Editor** :

   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Votre Nom'
   where id = (select id from auth.users where email = 'vous@exemple.com');
   ```

4. Connectez-vous sur `/login` avec cet email/mot de passe : le tableau de bord affichera **Espace Administrateur**.

## Développement local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) — vous serez redirigé vers `/login` si vous n'êtes pas connecté.

## Structure du projet

```
src/
  app/
    login/                    page de connexion
    login/mot-de-passe-oublie/  demande de réinitialisation
    update-password/          définition du nouveau mot de passe
    auth/confirm/              route d'échange du lien email Supabase
    dashboard/                 tableau de bord (protégé)
  components/
    ui/                       composants réutilisables (Button, Input, Card)
    auth/                     formulaires d'authentification
  lib/
    supabase/                 clients Supabase (browser, server, proxy)
    types.ts                  types partagés (Profile, UserRole)
  proxy.ts                    protection des routes (ex-middleware, renommé en Next.js 16)
supabase/
  migrations/                 migrations SQL (profiles + RLS)
```

## Déploiement sur Vercel

1. Importez le dépôt dans Vercel.
2. Renseignez les mêmes variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans **Project Settings > Environment Variables**.
3. Ajoutez l'URL de production Vercel dans les **Redirect URLs** du projet Supabase (voir étape 6 ci-dessus).
