import "server-only";

const UNDEFINED_COLUMN = "42703";

/**
 * Exécute une requête time_entries avec repli automatique si les colonnes
 * de paiement (migration 0012 : paye, paye_le, paye_par) ne sont pas
 * encore appliquées côté base.
 *
 * Sans ce repli, sélectionner une colonne qui n'existe pas encore fait
 * échouer TOUTE la requête — ce qui, avant ce correctif, faisait
 * disparaître de l'écran des pointages pourtant bien enregistrés (lignes
 * réelles en base) simplement parce que le code référençait une colonne
 * que la migration n'avait pas encore créée.
 *
 * `run` doit exécuter la requête pour le `select` donné et retourner le
 * résultat Supabase brut (`{ data, error }`).
 */
export async function withPaymentColumnFallback<T extends object>(
  baseSelect: string,
  run: (
    select: string
  ) => PromiseLike<{ data: T[] | null; error: { code?: string; message?: string } | null }>
): Promise<{ data: T[]; error: { code?: string; message?: string } | null }> {
  const primary = await run(`${baseSelect}, paye, paye_le, paye_par`);

  if (primary.error?.code === UNDEFINED_COLUMN) {
    console.error(
      "time_entries: colonnes de paiement absentes (migration 0012 non appliquée), repli sans ces colonnes.",
      primary.error
    );
    const fallback = await run(baseSelect);
    const data = (fallback.data ?? []).map((entry) => ({
      ...entry,
      paye: false,
      paye_le: null,
      paye_par: null,
    })) as T[];
    return { data, error: fallback.error };
  }

  if (primary.error) {
    console.error("time_entries query failed:", primary.error);
  }

  return { data: primary.data ?? [], error: primary.error };
}
