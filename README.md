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
   SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role
   RESEND_API_KEY=votre-cle-resend
   ```

   La `service_role` key se trouve dans **Project Settings > API** (section "Project API keys"). Elle ne doit **jamais** être exposée au navigateur — elle n'est utilisée que côté serveur pour inviter/gérer les comptes extras.

4. Exécutez les migrations SQL dans **SQL Editor** (dans l'ordre), en collant le contenu de chaque fichier puis en l'exécutant :
   - [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql)
   - [`supabase/migrations/0002_team_and_shifts.sql`](supabase/migrations/0002_team_and_shifts.sql)

   La première migration crée la table `profiles` (rôle `admin`/`extra`) et ses policies RLS. La seconde ajoute `email`, `phone`, `actif` à `profiles`, et crée la table `shifts` (créneaux de planning) avec ses policies : un `extra` ne voit que ses propres créneaux, un `admin` voit et gère tout.

5. Dans **Authentication > Email Templates**, vérifiez que le template "Reset Password" (et "Invite user", utilisé pour créer les comptes extras) pointe bien vers `/auth/confirm` (comportement par défaut de Supabase, déjà géré par ce projet).

6. Dans **Authentication > URL Configuration**, ajoutez votre URL de développement et de production (ex. `http://localhost:3000`, `https://votre-app.vercel.app`) aux **Redirect URLs**.

7. Créez un compte sur [resend.com](https://resend.com) pour l'envoi des emails de créneau (étape à faire vous-même — nécessite vos propres identifiants). Récupérez une clé API dans **API Keys** et mettez-la dans `RESEND_API_KEY`. Pour du test rapide, l'expéditeur par défaut `onboarding@resend.dev` fonctionne sans configuration ; pour de la production, vérifiez votre propre domaine dans Resend et définissez `RESEND_FROM_EMAIL` (ex. `Plandex <planning@votredomaine.com>`).

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

## Gestion de l'équipe

Depuis `/dashboard/team` (admin), le bouton **Ajouter un extra** envoie une invitation Supabase à l'adresse email saisie : la personne reçoit un lien pour définir son propre mot de passe (redirige vers `/update-password`), et sa ligne `profiles` est créée automatiquement avec le rôle `extra`. Un admin peut ensuite modifier ses informations ou désactiver son compte (le champ `actif` passe à `false` — la personne ne peut alors plus se connecter, mais son historique de créneaux est conservé).

## Planning

Depuis `/dashboard/planning` (admin), chaque créneau créé envoie un email à l'extra concerné (si `RESEND_API_KEY` est configuré) et apparaît immédiatement dans son tableau de bord (`/dashboard`), RLS oblige : un extra ne voit jamais que ses propres créneaux.

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
    dashboard/                 tableau de bord (protégé, différent admin/extra)
    dashboard/team/            gestion de l'équipe (admin)
    dashboard/planning/        gestion des créneaux (admin)
  components/
    ui/                       composants réutilisables (Button, Input, Select, Card, Badge)
    auth/                     formulaires d'authentification
    dashboard/                navigation du tableau de bord
    team/                     liste et formulaires de gestion des extras
    planning/                 vue planning admin + cartes de créneaux extra
  lib/
    supabase/                 clients Supabase (browser, server, proxy, admin, get-profile)
    types.ts                  types partagés (Profile, Shift, ...)
    email.ts                  envoi d'emails via Resend
  proxy.ts                    protection des routes (ex-middleware, renommé en Next.js 16)
supabase/
  migrations/                 migrations SQL (profiles + RLS, shifts + RLS)
```

## Déploiement sur Vercel

1. Importez le dépôt dans Vercel.
2. Renseignez les mêmes variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) dans **Project Settings > Environment Variables**.
3. Ajoutez l'URL de production Vercel dans les **Redirect URLs** du projet Supabase (voir étape 6 ci-dessus).
