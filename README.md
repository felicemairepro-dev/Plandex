# Plandex

Application interne de gestion de planning pour les extras/indépendants. Accès privé : les comptes admin sont créés manuellement, les comptes extras s'auto-inscrivent via un code d'invitation à usage unique.

**Stack** : Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth + DB) · Resend · Netlify

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
   - [`supabase/migrations/0007_security_hardening.sql`](supabase/migrations/0007_security_hardening.sql) — corrige une faille : sans ce trigger, un extra pouvait modifier son propre `role`/`actif` via un appel direct à l'API REST (voir "Sécurité" plus bas). **Important si vous avez déployé avant cette migration.**

5. Dans **Authentication > Email Templates**, vérifiez que le template "Reset Password" pointe bien vers `/auth/confirm` (comportement par défaut de Supabase, déjà géré par ce projet). Si la confirmation d'email est activée (**Authentication > Providers > Email > Confirm email**), le template "Confirm signup" doit pointer vers la même route.

6. Dans **Authentication > URL Configuration**, ajoutez votre URL de développement et de production (ex. `http://localhost:3000`, `https://votre-site.netlify.app`) aux **Redirect URLs**.

7. Créez un compte sur [resend.com](https://resend.com) pour l'envoi des emails de créneau (étape à faire vous-même — nécessite vos propres identifiants). Récupérez une clé API dans **API Keys** et mettez-la dans `RESEND_API_KEY`. Pour du test rapide, l'expéditeur par défaut `onboarding@resend.dev` fonctionne sans configuration ; pour de la production, vérifiez votre propre domaine dans Resend et définissez `RESEND_FROM_EMAIL` (ex. `Plandex <planning@votredomaine.com>`).

8. Pour les rappels automatiques (voir "Rappels de créneau" plus bas), ajoutez aussi :
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API — ne jamais exposer au navigateur, utilisé uniquement par la fonction planifiée).
   - `CRON_SECRET` (une chaîne aléatoire au choix).

   **Important (Netlify)** : les variables préfixées `NEXT_PUBLIC_` sont injectées dans le bundle **au moment du build**, pas au runtime. `.env.local` ne sert qu'en local — sur Netlify, ces variables doivent être ajoutées dans **Site configuration > Environment variables**, puis un nouveau déploiement doit être déclenché pour qu'elles soient prises en compte (modifier la variable seule, sans redéployer, ne suffit pas).

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

Un rappel automatique est envoyé la veille de chaque créneau **confirmé** du lendemain. La logique vit dans la route Next.js `GET /api/cron/reminders`, protégée par `CRON_SECRET` (`Authorization: Bearer ...`) et qui utilise la `service_role` key pour lire tous les créneaux, en dehors de toute session utilisateur.

Sur Netlify (pas de cron intégré à Next.js comme sur Vercel), le déclenchement quotidien passe par une **fonction planifiée** : [`netlify/functions/scheduled-reminders.mts`](netlify/functions/scheduled-reminders.mts), qui ne fait qu'appeler `/api/cron/reminders` avec le bon en-tête, tous les jours à `0 17 * * *` (17h00 **UTC**, soit ~18h à Paris — ajustez le cron dans ce fichier selon votre fuseau ; Netlify Scheduled Functions ne gèrent pas nativement les fuseaux locaux). Elle a besoin de `URL` (fournie automatiquement par Netlify) et de `CRON_SECRET` (à définir dans les variables d'environnement du site).

En local, vous pouvez déclencher ce rappel manuellement sans passer par la fonction planifiée :

```bash
curl -H "Authorization: Bearer VOTRE_CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Échanges de créneaux & notifications

Depuis un créneau **confirmé à venir** sur son tableau de bord, un extra peut cliquer sur **Demander un remplacement** : le créneau affiche alors un badge orange « Remplacement demandé » (visible admin et extra), et tous les admins reçoivent une notification interne (et peuvent être notifiés par email — voir ci-dessous) — **aucune validation automatique** entre extras, l'admin garde la main. Pour résoudre la demande, l'admin modifie simplement le créneau depuis `/dashboard/planning` (réassignation à un autre extra ou non) : la sauvegarde du formulaire efface automatiquement le badge et notifie l'extra à l'origine de la demande que sa demande a été traitée.

La cloche de notifications dans le header (table `notifications`, RLS : chacun ne voit que les siennes) liste ces évènements — nouveau créneau assigné, remplacement demandé (admin), remplacement traité (extra) — avec un compteur nouveaux non lus ; cliquer une notification la marque comme lue.

## Statistiques

`/dashboard/stats` (admin) affiche le nombre d'heures travaillées par mois sur les 6 derniers mois (graphique en barres, recharts), un classement des extras par heures effectuées sur une période sélectionnable (semaine/mois), et le taux de ponctualité global (part des pointages sans retard significatif, ≤ 15 min).

## Réglages

`/dashboard/settings` permet à n'importe quel utilisateur connecté (admin ou extra) de modifier son propre prénom/nom/téléphone et son mot de passe. L'email n'est pas modifiable depuis cette page.

## Sécurité

- **Row Level Security** sur toutes les tables : un `extra` ne peut lire/modifier que ses propres lignes (`profiles`, `shifts`, `time_entries`, `notifications`) ; toute action nécessitant un privilège admin est vérifiée côté serveur (`requireAdmin()`), jamais seulement cachée côté interface.
- Les opérations sensibles à l'horodatage (`clock_in`/`clock_out`) ou à usage unique (`claim_invite_code`) passent par des fonctions Postgres `SECURITY DEFINER` plutôt que par des policies RLS classiques, pour garantir qu'elles ne peuvent pas être contournées par un appel direct à l'API.
- La migration [`0007_security_hardening.sql`](supabase/migrations/0007_security_hardening.sql) corrige un point trouvé lors d'un audit : la policy `profiles_update_own` (migration 0001) autorisait déjà un utilisateur à modifier sa propre ligne `profiles`, mais sans empêcher un changement des colonnes `role`/`actif` — un extra aurait pu, via un appel direct à l'API REST Supabase (en dehors de l'application), s'auto-promouvoir admin ou se réactiver après désactivation. Un trigger bloque désormais ces deux colonnes pour tout utilisateur non-admin (le trigger équivalent pour `taux_horaire` existait déjà depuis la migration 0005). **Si vous avez déjà déployé ce projet avant cette migration, exécutez-la sans attendre.**
- `src/proxy.ts` protège toutes les routes par défaut (session requise) sauf celles listées explicitement dans `PUBLIC_PATHS` (`/lib/supabase/proxy.ts`), dont `/api` — les routes API gèrent leur propre autorisation (ex. `CRON_SECRET` pour `/api/cron/reminders`).

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
    api/cron/reminders/         route déclenchée par la fonction planifiée (rappels de créneau)
    dashboard/                  tableau de bord (protégé, différent admin/extra)
    dashboard/team/             gestion de l'équipe + codes d'invitation (admin)
    dashboard/planning/         calendrier des créneaux (admin)
    dashboard/hours/            tableau des pointages + export CSV (admin)
    dashboard/stats/            graphique et classement (admin)
    dashboard/settings/         profil et mot de passe (tous)
  components/
    ui/                        composants réutilisables (Button, Input, Select, Card, Badge, Logo, Modal, Skeleton, EmptyState)
    auth/                      formulaires d'authentification
    join/                      flux d'auto-inscription (code puis formulaire)
    dashboard/                 navigation, cloche de notifications, onglets du tableau de bord extra
    team/                      liste des extras + panneau de codes d'invitation
    planning/                  calendrier semaine (admin, éditable ; extra, lecture seule), demande de remplacement
    hours/                     pointage extra (ClockInOut), tableau/correction admin, récapitulatifs (RecapView/RecapModal)
    stats/                     graphique et classement (StatsView)
    settings/                  formulaires profil/mot de passe
  lib/
    supabase/                  clients Supabase (browser, server, proxy, admin, get-profile, require-admin)
    types.ts                   types partagés (Profile, Shift, InviteCode, TimeEntry, Notification, ...)
    email.ts                   envoi d'emails via Resend (assignation + rappel)
    date-utils.ts               semaine/mois/dates pour le calendrier et les périodes
    hours-utils.ts              formatage des heures/retards/durées
    monthly-recap.ts            agrégation heures/montant par extra et par période
  proxy.ts                     protection des routes (ex-middleware, renommé en Next.js 16)
supabase/
  migrations/                  migrations SQL (profiles, shifts, invite_codes, time_entries, taux_horaire, notifications, sécurité + RLS)
netlify/
  functions/                   fonction planifiée Netlify (déclenche le rappel quotidien)
netlify.toml                   configuration de build/plugin Netlify
```

## Identité visuelle

Palette « nature sobre » définie dans [`src/app/globals.css`](src/app/globals.css) via des variables CSS (`--accent` vert forêt, `--sand` beige naturel, fond blanc cassé, texte anthracite, statuts vert/orange/rouge discrets). Typographie : Manrope. Pour ajuster une teinte, modifier les variables dans `:root` — tous les composants (`Button`, `Badge`, `Card`, etc.) en héritent automatiquement.

## Déploiement sur Netlify

1. Importez le dépôt dans Netlify (New site from Git). Le plugin [`@netlify/plugin-nextjs`](netlify.toml) est déjà configuré et détecte automatiquement l'App Router.
2. Renseignez les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) dans **Site configuration > Environment variables**, puis lancez (ou relancez) un déploiement — voir l'avertissement sur les variables `NEXT_PUBLIC_` plus haut.
3. Ajoutez l'URL de production Netlify (ex. `https://votre-site.netlify.app`) dans les **Redirect URLs** du projet Supabase (voir étape 6 ci-dessus).
4. La fonction planifiée [`netlify/functions/scheduled-reminders.mts`](netlify/functions/scheduled-reminders.mts) est détectée et activée automatiquement au déploiement (vérifiable dans l'onglet **Functions** du site Netlify).
