# France Travail API — Procédure d'inscription

## 1. Créer un compte sur francetravail.io

1. Aller sur **https://francetravail.io**
2. Cliquer sur **"S'inscrire"** (en haut à droite)
3. Remplir le formulaire (email perso, pas besoin d'être une entreprise)
4. Confirmer l'email

---

## 2. Créer une application

1. Une fois connecté, aller dans **"Mes applications"** > **"Nouvelle application"**
2. Nom : `job-tracker` (ou ce que tu veux)
3. Description : `Suivi de candidatures personnel`

---

## 3. Souscrire à l'API "Offres d'emploi v2"

1. Dans ton application, cliquer sur **"Ajouter une API"**
2. Chercher **"Offres d'emploi v2"**
3. Sélectionner les scopes :
   - `api_offresdemploiv2`
   - `o2dsoffre`
4. Valider

---

## 4. Récupérer les clés

Dans ta page application :
- **Client ID** → `FRANCE_TRAVAIL_CLIENT_ID` dans ton `.env.local`
- **Client Secret** → `FRANCE_TRAVAIL_CLIENT_SECRET` dans ton `.env.local`

---

## 5. Scope à utiliser

Dans `src/lib/scrapers/france-travail.ts`, le scope est :

```
api_offresdemploiv2 o2dsoffre application_PAR_jobtracker
```

> ⚠️ Remplace `application_PAR_jobtracker` par `application_PAR_<NOM_DE_TON_APP>`
> tel qu'il apparaît dans le dashboard (ex: `application_PAR_monapp123`)

---

## 6. Tester

```bash
# Depuis la racine du projet
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://candidat.francetravail.fr/offres/recherche?motsCles=developpeur+react&lieux=44L"}'
```

---

## URLs supportées par le scraper

| Source | Exemple d'URL |
|--------|--------------|
| France Travail | `https://candidat.francetravail.fr/offres/recherche?motsCles=react&lieux=35L` |
| WTTJ | `https://www.welcometothejungle.com/fr/jobs?query=développeur&aroundQuery=Rennes` |
| LinkedIn | `https://www.linkedin.com/jobs/search/?keywords=react+developer&location=Rennes` |
| Indeed | `https://fr.indeed.com/jobs?q=développeur+react&l=Rennes` |

---

## Limitations connues

- **France Travail** : 150 offres max par appel (pagination à implémenter si besoin)
- **WTTJ** : Sélecteurs CSS peuvent changer si WTTJ redesigne son site
- **LinkedIn** : ~25 offres max sans compte, risque de block fréquent
- **Indeed** : Cloudflare peut bloquer, retry recommandé
