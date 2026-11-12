# Formations Jeune Juge / Jeune Arbitre UNSS

Site de formation des jeunes officiels UNSS : 28 activités, chacune avec un parcours en 5 étapes.

1. Je découvre
2. Je connais les règles essentielles
3. J'analyse et je valide la situation (quiz « Valable ou Faute ? »)
4. Je décide
5. Je m'entraîne à la certification

Version **GitHub** (une version pour La Forge des communs numériques éducatifs existe aussi : le code est identique, et l'espace gestion sait publier vers l'une ou l'autre).

Ce projet remplace le Genially « Le Jeune Arbitre / Jeune Juge à l'UNSS ». Les **92 quiz** qui étaient hébergés sur une centaine de sites Netlify séparés sont maintenant **intégrés au site**, soit 4 600 affirmations, et sont modifiables depuis l'espace gestion.

- Site public : `https://<compte>.github.io/<depot>/`
- Espace gestion : `https://<compte>.github.io/<depot>/admin.html`

---

## Qui gère quoi ?

- **La responsable du contenu** est propriétaire du dépôt GitHub (ou de l'organisation qui l'héberge). Elle décide de qui peut publier.
- **Les collègues qui contribuent** sont invités comme *Collaborators* (rôle *Write*) : ils peuvent publier depuis l'espace gestion.
- **Tout le monde peut consulter le site.** L'espace gestion s'affiche aussi pour tout le monde, mais **sans jeton d'accès personnel, impossible de publier quoi que ce soit**.

---

## Mise en place (une seule fois, environ 10 minutes)

1. Sur https://github.com : **New repository**. Par exemple, nom : `jeunes-officiels-unss`, visibilité : *Public*. Ne rien cocher d'autre.
2. Sur la page du dépôt vide : **uploading an existing file**, puis glisser-déposer **tout le contenu** du dossier décompressé, y compris le dossier caché `.github`, puis **Commit changes**.
   - Si le dossier `.github` n'est pas pris en compte par le glisser-déposer (cas fréquent sous Windows et macOS), créer le fichier à la main : **Add file › Create new file**, nommé `.github/workflows/pages.yml`, et y coller le contenu du fichier fourni.
   - En ligne de commande :
     ```
     git init && git add . && git commit -m "Premier dépôt"
     git branch -M main
     git remote add origin https://github.com/<compte>/<depot>.git
     git push -u origin main
     ```
3. **Settings › Pages** : dans *Build and deployment › Source*, choisir **GitHub Actions**.
4. Onglet **Actions** : le workflow « Publier le site » doit passer au vert. Le relancer si besoin avec *Run workflow*.
5. L'adresse du site s'affiche dans **Settings › Pages** : `https://<compte>.github.io/<depot>/`.
6. **Settings › Collaborators** : inviter les collègues contributeurs.

## Publier une modification depuis l'espace gestion

1. Ouvrir `…/admin.html`.
2. Modifier une activité, un lien ou un quiz. Les modifications sont enregistrées automatiquement en brouillon sur l'ordinateur.
3. **Aperçu** : voir le site avec les modifications, avant de publier.
4. **Contrôle qualité** : liste les liens cassés, les liens en double, les étapes vides, les quiz incomplets, etc.
5. **Publier**. La première fois, choisir l'hébergement **GitHub**, puis indiquer :
   - le dépôt, par exemple `mon-compte/jeunes-officiels-unss` (pré-rempli si l'adresse est en `github.io`) ;
   - un **jeton d'accès personnel à portée fine (fine-grained token)**. Pour le créer : avatar › *Settings* › *Developer settings* › *Personal access tokens* › *Fine-grained tokens* › *Generate new token*. Choisir *Only select repositories* (ce dépôt uniquement), puis dans *Repository permissions*, mettre *Contents* sur *Read and write*. Fixer une date d'expiration.
6. Le site public se met à jour 1 à 2 minutes après la publication (onglet *Actions*).

**Solution de secours sans jeton :** utiliser le bouton « Télécharger les fichiers (.zip) », puis déposer les fichiers dans `site/data/` avec **Add file › Upload files** sur GitHub.

## Ajouter ou modifier un quiz

- Dans une activité, à l'étape 3 (ou 5) : **+ Créer un quiz Valable / Faute**.
- Les affirmations peuvent être saisies une par une, ou **collées depuis un tableur**. Colonnes attendues : `Affirmation | Valable/Faute | Explication`. Une colonne `Thème` peut être placée en premier.
- **Exporter en tableur (.csv)** permet de retravailler un quiz existant dans Excel ou LibreOffice, puis de le recoller.

## Ajouter un document Google

Dans Google Docs, Slides ou Sheets : **Fichier › Partager › Publier sur le web**, puis copier le lien obtenu dans l'espace gestion. Le type de document est reconnu automatiquement. Un document qui n'est pas publié sur le web ne s'affichera pas pour les élèves, et l'espace gestion le signale.

---

## Icônes et images

- `site/assets/icones/` contient les icônes des tuiles d'activités. On choisit l'icône d'une activité dans l'espace gestion. Pour ajouter une nouvelle icône : déposer le fichier .png dans ce dossier, puis ajouter son nom dans la liste `ICONES` de `site/assets/commun.js`.
- `site/assets/etapes/` contient les 5 illustrations du parcours (Je découvre… Je m'entraîne à la certification). Pour en remplacer une, déposer un fichier du même nom.
- `site/assets/logo-unss-nantes.png` est le logo utilisé dans le bandeau, en fond de la page d'accueil et au centre de chaque page d'activité.

---

## Consulter le site sur son ordinateur (sans Internet pour le site lui-même)

Double-cliquer sur `site/index.html`. Les données sont alors lues depuis `site/data/hors-ligne.js`.

- Ce fichier est régénéré automatiquement à chaque mise en ligne.
- Pour le mettre à jour à la main après une modification locale : `node scripts/hors-ligne.js`.
- Les fiches Google et Wayground nécessitent toujours une connexion Internet.
- L'espace gestion (`site/admin.html`) fonctionne aussi en local : il peut publier directement, ou exporter un .zip.

---

## Organisation des fichiers

```
site/
  index.html            site public
  admin.html            espace gestion
  assets/               styles et scripts (aucune dépendance externe)
  data/data.json        activités, étapes et liens
  data/quiz/*.json      un fichier par quiz
  data/hors-ligne.js    copie de toutes les données pour l'ouverture en double-clic (générée)
scripts/verifier.js     vérifie les données avant chaque mise en ligne
scripts/hors-ligne.js   régénère data/hors-ligne.js
.github/workflows/pages.yml  publication automatique sur GitHub Pages
```

Si un fichier de données est mal formé, la publication s'arrête (onglet *Actions* en rouge) et l'ancienne version du site reste en ligne : une erreur de saisie ne peut pas casser le site.

---

## Corrections apportées par rapport au Genially

**Navigation corrigée.** Chaque activité a sa propre page : il n'y a plus de flèches « retour » pointant vers la mauvaise activité. Dans le Genially :

- Natation, Laser Run et Voile renvoyaient au mauvais menu ;
- les sous-pages du Surf renvoyaient vers Boxe assaut ;
- la vignette « certification » du Raid multisports ouvrait les quiz du Golf, et sa page de certification était inaccessible ;
- la page « Je décide » de l'Escalade renvoyait vers la Gymnastique ;
- la certification du Basket renvoyait vers le Circuit training ;
- Ultimate et Football avaient un deuxième bouton retour vers le Golf.

**Quiz rapatriés.** 92 quiz sur 94 sont intégrés et modifiables, avec leurs explications. Il n'y a plus de dépendance à Netlify.

**À traiter par la responsable du contenu** (le contrôle qualité les signale aussi) :

- **Gymnastique, série Excellence** : 2 quiz Netlify sont protégés par mot de passe (erreur 401), donc inaccessibles aux élèves. Il s'agit probablement des quiz 1/7 et 5/7. Il faut les ressaisir dans l'espace gestion.
- **Escalade** : le quiz n°3 (Vitesse) manquait. Le Genially affichait deux fois le quiz « Difficulté ».
- **Football** : une présentation Google renvoie une erreur 410 (document supprimé ou dépublié).
- **Liens identiques dans deux activités** (copier-coller probables) :
  - Wayground : Athlétisme = Escalade, Badminton = Handball, Football = Ultimate ;
  - Google Docs : une fiche est partagée entre Aviron et Football, une autre entre Badminton et Basket ;
  - Google Sheets : un tableau est partagé entre Raid et Surf.
- **Sessions Wayground** (`join?gc=…`) : ces codes expirent à la fin de chaque session. Il vaut mieux les remplacer par des liens permanents, ou par des quiz Valable/Faute.
- **Liens SharePoint personnels** : ils demandent une connexion UNSS. Il vaut mieux les publier en Google Sheets, ou les déposer dans le projet.
- **Activités sans contenu** (Gym acro, Danse hip-hop, Danse chorégraphiée, Judo, Tir à l'arc) : elles s'affichent « Bientôt disponible ».
