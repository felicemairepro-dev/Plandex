export type UserRole = "admin" | "extra";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  actif: boolean;
  taux_horaire: number | null;
}

export type ShiftStatus = "propose" | "confirme" | "annule";

export interface Shift {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  poste: string;
  extra_id: string;
  statut: ShiftStatus;
  cree_par: string;
  cree_le: string;
}

export interface ShiftWithExtra extends Shift {
  extra: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export interface InviteCode {
  id: string;
  code: string;
  utilise: boolean;
  cree_par: string;
  cree_le: string;
  expire_le: string | null;
}

export interface TimeEntry {
  id: string;
  shift_id: string;
  extra_id: string;
  heure_arrivee: string | null;
  heure_depart: string | null;
  corrige_par_admin: boolean;
  cree_le: string;
}

export interface TimeEntryWithShift extends TimeEntry {
  shift: Pick<
    Shift,
    "date" | "heure_debut" | "heure_fin" | "poste" | "lieu"
  > | null;
  extra: Pick<Profile, "id" | "full_name"> | null;
}

export interface Payment {
  id: string;
  extra_id: string;
  mois: string;
  montant: number;
  paye_le: string;
  paye_par: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  lu: boolean;
  cree_le: string;
}
