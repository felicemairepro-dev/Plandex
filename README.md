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
   - [`supabase/migrations/0005_taux_horaire.sql`](supabase/migrations/0005_taux_horaire.sql) — ajoute `taux_horaire` à `profiles`, modifiable uniquement par un admin (trigger dédié).
   - [`supabase/migrations/0006_swaps_and_notifications.sql`](supabase/migrations/0006_swaps_and_notifications.sql) — ajoute `remplacement_demande` à `shifts`, la fonction `request_shift_replacement`, et la table `notifications` (voir "Échanges de créneaux" plus bas).

5. Dans **Authentication > Email Templates**, vérifiez que le template "Reset Password" pointe bien vers `/auth/confirm` (comportement par défaut de Supabase, déjà géré par ce projet). Si la confirmation d'email est activée (**Authentication > Providers > Email > Confirm email**), le template "Confirm signup" doit pointer vers la même route.

6. Dans **Authentication > URL Configuration**, ajoutez votre URL de développement et de production (ex. `http://localhost:3000`, `https://votre-app.vercel.app`) aux **Redirect URLs**.

7. Créez un compte sur [resend.com](https://resend.com) pour l'envoi des emails de créneau (étape à faire vous-même — nécessite vos propres identifiants). Récupérez une clé API dans **API Keys** et mettez-la dans `RESEND_API_KEY`. Pour du test rapide, l'expéditeur par défaut `onboarding@resend.dev` fonctionne sans configuration ; pour de la production, vérifiez votre propre domaine dans Resend et définissez `RESEND_FROM_EMAIL` (ex. `Plandex <planning@votredomaine.com>`).

8. Pour les rappels automatiques (voir "Rappels de créneau" plus bas), ajoutez aussi :
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API — ne jamais exposer au navigateur, utilisé uniquement par la tâche planifiée).
   - `CRON_SECRET` (une chaîne aléatoire au choix).

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

Sur `/dashboard/hours` (admin), tableau de tous les pointages avec filtres période (semaine/mois) et extra, mise en évidence orange des retards de plus de 15 minutes, export CSV (avec taux horaire et montant estimé), et correction manuelle (bouton **Corriger** — la ligne est alors marquée « Corrigé » pour garder la traçabilité). Un récapitulatif synthétique par extra (heures totales, créneaux effectués, montant estimé) apparaît en haut de page pour la période sélectionnée.

## Récapitulatif mensuel & facturation indicative

Chaque extra a un **taux horaire** optionnel (`profiles.taux_horaire`, en €), modifiable uniquement par un admin depuis `/dashboard/team` — il ne sert qu'à estimer un montant, aucun paiement n'est déclenché. Depuis la fiche d'un extra, le bouton **Générer le récapitulatif du mois** ouvre le détail des créneaux du mois (heures prévues/réelles, durée, total, montant estimé) avec un bouton **Télécharger en PDF** (ouvre la boîte d'impression du navigateur sur une mise en page épurée — "Enregistrer en PDF"). Ce document sert de base pour que l'extra établisse sa propre facture, ce n'est pas une facture officielle Plandex. Chaque extra retrouve le même récapitulatif, pour lui-même uniquement, dans l'onglet **Mes heures** de son tableau de bord.

## Tableau de bord extra

`/dashboard` (vue extra) est organisé en 3 onglets : **Planning** (créneaux à venir/passés, pointage sur les créneaux du jour), **Calendrier** (même calendrier semaine que la vue admin, mais en lecture seule et filtré à ses propres créneaux — un extra ne voit jamais le planning d'un autre), **Mes heures** (récapitulatif mensuel personnel).

## Rappels de créneau (tâche planifiée)

Un rappel automatique est envoyé la veille de chaque créneau **confirmé** du lendemain, via [`vercel.json`](vercel.json) (Vercel Cron) qui appelle `GET /api/cron/reminders` tous les jours à `0 17 * * *` (17h00 **UTC**, soit ~18h à Paris — ajustez l'heure dans `vercel.json` selon votre fuseau et l'heure d'été/hiver ; Vercel Cron ne gère pas nativement les fuseaux locaux). La route est protégée par `CRON_SECRET` (Vercel l'envoie automatiquement en `Authorization: Bearer` quand la variable est définie sur le projet) et utilise la `service_role` key pour lire tous les créneaux, en dehors de toute session utilisateur.

En local ou hors Vercel, vous pouvez déclencher ce rappel manuellement :

```bash
curl -H "Authorization: Bearer VOTRE_CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Échanges de créneaux & notifications

Depuis un créneau **confirmé à venir** sur son tableau de bord, un extra peut cliquer sur **Demander un remplacement** : le créneau affiche alors un badge orange « Remplacement demandé » (visible admin et extra), et tous les admins reçoivent une notification interne (et peuvent être notifiés par email — voir ci-dessous) — **aucune validation automatique** entre extras, l'admin garde la main. Pour résoudre la demande, l'admin modifie simplement le créneau depuis `/dashboard/planning` (réassignation à un autre extra ou non) : la sauvegarde du formulaire efface automatiquement le badge et notifie l'extra à l'origine de la demande que sa demande a été traitée.

La cloche de notifications dans le header (table `notifications`, RLS : chacun ne voit que les siennes) liste ces évènements — nouveau créneau assigné, remplacement demandé (admin), remplacement traité (extra) — avec un compteur nouveaux non lus ; cliquer une notification la marque comme lue.

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
    api/cron/reminders/         route appelée par Vercel Cron (rappels de créneau)
    dashboard/                  tableau de bord (protégé, différent admin/extra)
    dashboard/team/             gestion de l'équipe + codes d'invitation (admin)
    dashboard/planning/         calendrier des créneaux (admin)
    dashboard/hours/            tableau des pointages + export CSV (admin)
  components/
    ui/                        composants réutilisables (Button, Input, Select, Card, Badge, Logo, Modal)
    auth/                      formulaires d'authentification
    join/                      flux d'auto-inscription (code puis formulaire)
    dashboard/                 navigation, cloche de notifications, onglets du tableau de bord extra
    team/                      liste des extras + panneau de codes d'invitation
    planning/                  calendrier semaine (admin, éditable ; extra, lecture seule), demande de remplacement
    hours/                     pointage extra (ClockInOut), tableau/correction admin, récapitulatifs (RecapView/RecapModal)
  lib/
    supabase/                  clients Supabase (browser, server, proxy, admin, get-profile, require-admin)
    types.ts                   types partagés (Profile, Shift, InviteCode, TimeEntry, Notification, ...)
    email.ts                   envoi d'emails via Resend (assignation + rappel)
    date-utils.ts               semaine/mois/dates pour le calendrier et les périodes
    hours-utils.ts              formatage des heures/retards/durées
    monthly-recap.ts            agrégation heures/montant par extra et par période
  proxy.ts                     protection des routes (ex-middleware, renommé en Next.js 16)
supabase/
  migrations/                  migrations SQL (profiles, shifts, invite_codes, time_entries, taux_horaire, notifications + RLS)
vercel.json                    planification du rappel quotidien (Vercel Cron)
```

## Identité visuelle

Palette « nature sobre » définie dans [`src/app/globals.css`](src/app/globals.css) via des variables CSS (`--accent` vert forêt, `--sand` beige naturel, fond blanc cassé, texte anthracite, statuts vert/orange/rouge discrets). Typographie : Manrope. Pour ajuster une teinte, modifier les variables dans `:root` — tous les composants (`Button`, `Badge`, `Card`, etc.) en héritent automatiquement.

## Déploiement sur Vercel

1. Importez le dépôt dans Vercel.
2. Renseignez les mêmes variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) dans **Project Settings > Environment Variables**.
3. Ajoutez l'URL de production Vercel dans les **Redirect URLs** du projet Supabase (voir étape 6 ci-dessus).
4. Le cron défini dans `vercel.json` s'active automatiquement au déploiement (vérifiable dans l'onglet **Cron Jobs** du projet Vercel).
