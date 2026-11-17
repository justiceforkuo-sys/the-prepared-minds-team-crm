// Les outils « partenaires » (scripts, entraînement par type, chasse) sont réservés à Justice pour le moment :
// ils ne sont pas encore proposés à l'équipe (validation d'OVB Willemot en attente sur les phrases de rémunération et de statut).
// Pour les ouvrir à toute l'équipe plus tard, il suffit de faire renvoyer true à cette fonction.
export function peutUtiliserPartenaires(personne: { slug: string | null }): boolean {
  return personne.slug === "justice";
}
