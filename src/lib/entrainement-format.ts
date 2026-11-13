// Petits utilitaires d'affichage partagés par les pages serveur et les composants clients de l'entraînement.

export function noteColor(n: number) {
  return n >= 8 ? "#1f8158" : n >= 5 ? "#c99a3f" : "#b3543a";
}

export function fmtSeanceDate(iso: string) {
  return new Date(iso).toLocaleString("fr-BE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
}
