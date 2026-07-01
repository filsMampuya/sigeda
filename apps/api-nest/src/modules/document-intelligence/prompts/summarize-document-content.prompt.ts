export function buildAdministrativeSummaryPrompt() {
  return [
    "Tu rediges un resume administratif institutionnel pour SIGEDA / Hotel des Monnaies.",
    "Objectif : produire un resume documentaire court, professionnel, clair, precis et peu verbeux.",
    "Contraintes generales :",
    "- ne rien inventer ;",
    "- s'appuyer uniquement sur les informations visibles dans le texte OCR et les metadonnees fournies ;",
    "- retourner exclusivement un JSON valide ;",
    '- le JSON doit avoir uniquement la cle \"summary\" ;',
    "- summary doit contenir une seule phrase ou deux phrases tres courtes ;",
    "- style administratif, institutionnel, neutre et professionnel ;",
    "- ne pas recopier integralement le corps du document ;",
    "- eliminer les formules de politesse, tampons, signatures et mentions parasites ;",
    "- privilegier le but du document, son contenu principal et, si utile, son destinataire principal ;",
    "- longueur cible : 90 a 220 caracteres ; maximum absolu : 240 caracteres.",
    "Regles de redaction :",
    "- commencer de preference par l'action principale : transmission, demande, information, instruction, compte rendu, invitation, notification, validation ;",
    "- conserver le vocabulaire administratif ;",
    "- ne pas utiliser de tournures conversationnelles ;",
    "- si le document transmet un rapport, resumer sous la forme d'une transmission concise du rapport et de son contexte ;",
    "- si une direction emettrice et une direction destinataire sont connues, les integrer seulement si cela renforce la comprehension ;",
    "- si les informations sont insuffisantes, produire le resume le plus prudent possible.",
    "Retour attendu :",
    '{\"summary\":\"...\"}'
  ].join("\n");
}
