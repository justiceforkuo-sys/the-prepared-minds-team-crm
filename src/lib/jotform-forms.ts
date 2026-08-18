// Un formulaire Jotform de pré-qualification par collaborateur (campagne
// d'affiches "Directeur d'agence"). Le webhook (src/app/api/webhooks/jotform)
// utilise cette table pour savoir à quel `people.name` rattacher chaque
// candidature reçue, selon l'ID du formulaire soumis.
export const JOTFORM_RECRUITER_BY_FORM_ID: Record<string, string> = {
  "262296099383066": "Justice Forkuo",
  "262296048516058": "Samuel Ettitchi",
  "262296813495064": "Agyekum, Michele",
  "262295899428073": "Nana Baafour Awuah",
  "262295965353064": "Tacale, Ana-Georgiana",
};
