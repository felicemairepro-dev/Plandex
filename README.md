# Plandex

Application interne de gestion de planning pour les extras/indépendants. Accès privé : les comptes admin sont créés manuellement, les comptes extras s'auto-inscrivent via un code d'invitation à usage unique.

**Stack** : Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth + DB) · Resend · Vercel

## Configuration du projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings > API**, récupérez :
   - `Project URL`
   - `anon public` key
3. Copiez `.env.local.example` vers `.env.local` et renseignez ces valeurs :

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-public
   RESEND_API_KEY=votre-cle-resend
   ```

4. Exécutez les migrations SQL dans **SQL Editor** (dans l'ordre), en collant le contenu de chaque fichier puis en l'exécutant :
   - [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql) — table `profiles` (rôle `admin`/`extra`) et ses policies RLS.
   - [`supabase/migrations/0002_team_and_shifts.sql`](supabase/migrations/0002_team_and_shifts.sql) — ajoute `email`, `phone`, `actif` à `profiles`, et crée la table `shifts` (créneaux) : un `extra` ne voit que ses propres créneaux, un `admin` voit et gère tout.
   - [`supabase/migrations/0003_invite_codes.sql`](supabase/migrations/0003_invite_codes.sql) — table `invite_codes` et les fonctions qui gèrent leur génération/validation/consommation (voir plus bas).
   - [`supabase/migrations/0004_time_entries.sql`](supabase/migrations/0004_time_entries.sql) — table `time_entries` (badgage) et les fonctions `clock_in`/`clock_out` (voir "Badgage" plus bas).

5. Dans **Authentication > Email Templates**, vérifiez que le template "Reset Password" pointe bien vers `/auth/confirm` (comportement par défaut de Supabase, déjà géré par ce projet). Si la confirmation d'email est activée (**Authentication > Providers > Email > Confirm email**), le template "Confirm signup" doit pointer vers la même route.

6. Dans **Authentication > URL Configuration**, ajoutez votre URL de développement et de production (ex. `http://localhost:3000`, `https://votre-app.vercel.app`) aux **Redirect URLs**.

7. Créez un compte sur [resend.com](https://resend.com) pour l'envoi des emails de créneau (étape à faire vous-même — nécessite vos propres identifiants). Récupérez une clé API dans **API Keys** et mettez-la dans `RESEND_API_KEY`. Pour du test rapide, l'expéditeur par défaut `onboarding@resend.dev` fonctionne sans configuration ; pour de la production, vérifiez votre propre domaine dans Resend et définissez `RESEND_FROM_EMAIL` (ex. `Plandex <planning@votredomaine.com>`).

## Créer le premier compte admin

Il n'y a pas d'inscription publique pour les admins : le premier compte se crée manuellement.

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

## Inscription des extras (code d'invitation)

Depuis `/dashboard/team`, le bouton **Générer un code** crée un code du type `PLDX-4K9X` (table `invite_codes`) et l'affiche avec un bouton **Copier** — à transmettre à l'extra par SMS, oral, WhatsApp, etc.

L'extra se rend sur `/rejoindre`, saisit le code, puis renseigne prénom/nom/email/téléphone/mot de passe. Sécurité appliquée côté serveur :
- le code est vérifié puis **consommé atomiquement** (fonction `claim_invite_code`) au moment de la création du compte, pour empêcher toute réutilisation même en cas de double soumission ;
- le rôle `extra` est **toujours forcé** côté serveur, quel que soit le code utilisé — ce formulaire ne peut jamais créer de compte admin ;
- si la création du compte échoue après consommation du code, celui-ci est automatiquement relâché (`release_invite_code`).

Un admin peut ensuite modifier les informations d'un extra ou désactiver son compte depuis `/dashboard/team` (le champ `actif` passe à `false` — la personne ne peut alors plus se connecter, mais son historique de créneaux est conservé).

## Planning

`/dashboard/planning` (admin) affiche un vrai calendrier semaine (jours en colonnes, heures en axe, créneaux positionnés et colorés par statut — vert confirmé, orange proposé, gris annulé), avec navigation semaine précédente/suivante. Cliquer sur un créneau ouvre le formulaire de modification ; chaque créneau créé envoie un email à l'extra concerné (si `RESEND_API_KEY` est configuré) et apparaît immédiatement dans son tableau de bord (`/dashboard`), RLS oblige : un extra ne voit jamais que ses propres créneaux.

## Badgage (pointage des heures)

Sur `/dashboard` (vue extra), chaque créneau du jour même affiche de grands boutons **Pointer l'arrivée** / **Pointer le départ**. L'heure enregistrée est **toujours l'heure serveur** au moment du clic : les boutons appellent les fonctions Postgres `clock_in`/`clock_out` (SECURITY DEFINER), qui utilisent `now()` côté base de données — aucune heure envoyée par le client n'est jamais prise en compte, et `clock_in` refuse tout créneau dont la date n'est pas celle du jour.

Sur `/dashboard/hours` (admin), tableau de tous les pointages avec filtres période (semaine/mois) et extra, mise en évidence orange des retards de plus de 15 minutes, export CSV, et correction manuelle (bouton **Corriger** — la ligne est alors marquée « Corrigé » pour garder la traçabilité). Chaque fiche extra (`/dashboard/team`) a aussi un bouton **Historique des heures**.

## Développement local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) : page d'accueil publique avec les liens **Se connecter** / **Créer mon compte extra**.

## Structure du projet

```
src/
  app/
    page.tsx                   accueil publique (Se connecter / Créer mon compte)
    login/                     page de connexion (admin + extra)
    login/mot-de-passe-oublie/  demande de réinitialisation
    rejoindre/                 auto-inscription extra par code d'invitation
    update-password/           définition du nouveau mot de passe
    auth/confirm/               route d'échange du lien email Supabase
    dashboard/                  tableau de bord (protégé, différent admin/extra)
    dashboard/team/             gestion de l'équipe + codes d'invitation (admin)
    dashboard/planning/         calendrier des créneaux (admin)
    dashboard/hours/            tableau des pointages + export CSV (admin)
  components/
    ui/                        composants réutilisables (Button, Input, Select, Card, Badge, Logo, Modal)
    auth/                      formulaires d'authentification
    join/                      flux d'auto-inscription (code puis formulaire)
    dashboard/                 navigation du tableau de bord
    team/                      liste des extras + panneau de codes d'invitation
    planning/                  calendrier semaine admin + cartes de créneaux extra
    hours/                     pointage extra (ClockInOut) + tableau et correction admin
  lib/
    supabase/                  clients Supabase (browser, server, proxy, get-profile, require-admin)
    types.ts                   types partagés (Profile, Shift, InviteCode, TimeEntry, ...)
    email.ts                   envoi d'emails via Resend
    date-utils.ts               semaine/dates pour le calendrier et les périodes
    hours-utils.ts              formatage des heures/retards/durées
  proxy.ts                     protection des routes (ex-middleware, renommé en Next.js 16)
supabase/
  migrations/                  migrations SQL (profiles, shifts, invite_codes, time_entries + RLS)
```

## Identité visuelle

Palette « nature sobre » définie dans [`src/app/globals.css`](src/app/globals.css) via des variables CSS (`--accent` vert forêt, `--sand` beige naturel, fond blanc cassé, texte anthracite, statuts vert/orange/rouge discrets). Typographie : Manrope. Pour ajuster une teinte, modifier les variables dans `:root` — tous les composants (`Button`, `Badge`, `Card`, etc.) en héritent automatiquement.

## Déploiement sur Vercel

1. Importez le dépôt dans Vercel.
2. Renseignez les mêmes variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`) dans **Project Settings > Environment Variables**.
3. Ajoutez l'URL de production Vercel dans les **Redirect URLs** du projet Supabase (voir étape 6 ci-dessus).
