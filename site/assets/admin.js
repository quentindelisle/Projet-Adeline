/* Espace gestion : édition des activités, des quiz, contrôle qualité et publication sur la Forge */
(() => {
  const { esc, slug, TYPES } = JAJJ;
  const ed = document.getElementById('ed');
  const dlg = document.getElementById('dlg'), dlgIn = document.getElementById('dlg-in');
  const ETAPES_CLES = ['decouvrir', 'regles', 'analyse', 'construction', 'certification', 'videos'];
  const CLE_REGLAGES = 'jajj-reglages-v1';

  let D = null, ORIG = '';            // données du site et version publiée (texte)
  const QZ = {}, QZ_ORIG = {};        // quiz chargés / version publiée (texte, null si nouveau)
  const SUPPR = new Set();            // quiz publiés à supprimer
  const IMG = {};                     // images téléversées en attente : chemin -> { b64, url }
  let vue = { type: 'general' };

  /* ---------- Outils ---------- */
  const sport = id => D.sports.find(s => s.id === id);
  const quizDuSport = id => Object.values(QZ).filter(q => q.sport === id);
  const quizModifies = () => Object.keys(QZ).filter(id => JSON.stringify(QZ[id]) !== QZ_ORIG[id]);
  const estModifie = () => JSON.stringify(D) !== ORIG || quizModifies().length > 0 || SUPPR.size > 0 || Object.keys(IMG).length > 0;
  /* Affichage d'une image dans l'espace gestion (y compris celles pas encore publiées) */
  const srcImg = chemin => (IMG[chemin] && IMG[chemin].url) || chemin;
  const today = () => new Date().toISOString().slice(0, 10);
  function telecharger(nom, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function lireReglages() {
    let r = {};
    try { r = JSON.parse(localStorage.getItem(CLE_REGLAGES) || '{}'); } catch (e) {}
    try { const s = sessionStorage.getItem('jajj-jeton'); if (s && !r.jeton) r.jeton = s; } catch (e) {}
    const seg = location.pathname.split('/').filter(Boolean)[0];
    const segOk = seg && !seg.endsWith('.html');
    const gh = location.hostname.match(/^([^.]+)\.github\.io$/);
    const fo = location.hostname.match(/^([^.]+)\.forge\.apps\.education\.fr$/);
    if (!r.plateforme) r.plateforme = gh ? 'github' : 'forge';
    if (!r.forge) r.forge = 'https://forge.apps.education.fr';
    if (!r.branche) r.branche = 'main';
    if (!r.projet) {
      if (gh) r.projet = gh[1] + '/' + (segOk ? seg : gh[1] + '.github.io');
      else if (fo && segOk) r.projet = fo[1] + '/' + seg;
    }
    return r;
  }
  function ecrireReglages(r, memoriserJeton) {
    const copie = { ...r };
    try {
      if (!memoriserJeton) { sessionStorage.setItem('jajj-jeton', r.jeton || ''); delete copie.jeton; }
      localStorage.setItem(CLE_REGLAGES, JSON.stringify(copie));
    } catch (e) {}
  }

  /* ---------- Brouillon automatique ---------- */
  let minuterie = null;
  function modifie() {
    majEtat();
    clearTimeout(minuterie);
    minuterie = setTimeout(sauverBrouillon, 400);
  }
  function sauverBrouillon() {
    const quiz = {}; quizModifies().forEach(id => { quiz[id] = QZ[id]; });
    try {
      if (estModifie()) localStorage.setItem(JAJJ.CLE_BROUILLON, JSON.stringify({ ts: Date.now(), data: D, quiz, suppr: [...SUPPR], img: IMG }));
      else localStorage.removeItem(JAJJ.CLE_BROUILLON);
    } catch (e) { console.warn('Brouillon non enregistré', e); }
  }
  function majEtat() {
    const e = document.getElementById('etat');
    const m = estModifie();
    e.className = 'etat' + (m ? ' modif' : '');
    e.textContent = m ? 'Modifications non publiées (brouillon enregistré sur cet ordinateur)' : 'À jour';
    renderCote();
  }

  /* ---------- Chargement ---------- */
  async function charger() {
    D = await JAJJ.lireJson('data/data.json'); ORIG = JSON.stringify(D);
    const ids = new Set();
    D.sports.forEach(s => ETAPES_CLES.forEach(k => (s[k] || []).forEach(it => { if (it.type === 'quiz' && it.quiz) ids.add(it.quiz); })));
    await Promise.all([...ids].map(async id => {
      try { const q = await JAJJ.lireJson('data/quiz/' + id + '.json'); QZ[id] = q; QZ_ORIG[id] = JSON.stringify(q); }
      catch (e) { console.warn('Quiz manquant', id); }
    }));
    const b = JAJJ.lireBrouillon();
    if (b && b.data) {
      const date = new Date(b.ts).toLocaleString('fr-FR');
      ouvrirDlg(`<h2>Reprendre le brouillon ?</h2><p>Des modifications non publiées du <b>${esc(date)}</b> sont enregistrées sur cet ordinateur.</p>
        <div class="pied-dlg"><button class="btn" data-x="ignorer">Les abandonner</button><button class="btn prim" data-x="reprendre">Reprendre le brouillon</button></div>`, x => {
        if (x === 'reprendre') {
          D = b.data; Object.entries(b.quiz || {}).forEach(([id, q]) => { QZ[id] = q; if (!(id in QZ_ORIG)) QZ_ORIG[id] = null; });
          (b.suppr || []).forEach(id => { SUPPR.add(id); delete QZ[id]; });
          Object.assign(IMG, b.img || {});
        } else { try { localStorage.removeItem(JAJJ.CLE_BROUILLON); } catch (e) {} }
        afficher(); majEtat();
      });
    }
    afficher(); majEtat();
  }

  /* ---------- Barre latérale ---------- */
  function renderCote() {
    const anomalies = controler();
    const parSport = {}; anomalies.filter(a => a.niv === 'err').forEach(a => { if (a.sport) parSport[a.sport] = (parSport[a.sport] || 0) + 1; });
    const tri = [...D.sports].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    document.getElementById('liste-sports').innerHTML = tri.map(s => `<li><button class="a-lien${vue.type !== 'general' && vue.type !== 'qualite' && (vue.id === s.id || (vue.type === 'quiz' && QZ[vue.id]?.sport === s.id)) ? ' actif' : ''}" data-sport="${esc(s.id)}">
      <span class="pt${s.actif === false ? ' off' : ''}"></span>${esc(s.nom)}${parSport[s.id] ? `<span class="nb" title="Erreurs à corriger">${parSport[s.id]}</span>` : ''}</button></li>`).join('');
    document.querySelector('[data-vue=general]').classList.toggle('actif', vue.type === 'general');
  }
  document.querySelector('.a-cote').addEventListener('click', e => {
    const b = e.target.closest('[data-sport]'); if (b) return aller({ type: 'sport', id: b.dataset.sport });
    if (e.target.closest('[data-vue=general]')) aller({ type: 'general' });
  });
  function aller(v) {
    vue = v; afficher(); ed.focus({ preventScroll: true });
    if (matchMedia('(max-width:900px)').matches) ed.scrollIntoView(); else window.scrollTo(0, 0);
  }
  function afficher() {
    if (vue.type === 'sport' && sport(vue.id)) renderSport(sport(vue.id));
    else if (vue.type === 'quiz' && QZ[vue.id]) renderQuiz(QZ[vue.id]);
    else if (vue.type === 'qualite') renderQualite();
    else if (vue.type === 'affiches') renderAffiches();
    else { vue = { type: 'general' }; renderGeneral(); }
    renderCote();
  }

  /* ---------- Téléversement d'images (icônes, illustrations) ---------- */
  /* L'image est réduite dans le navigateur, convertie en WebP, puis publiée avec les autres modifications. */
  function choisirImage(taille, nomBase) {
    return new Promise(ok => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return ok(null);
        try {
          const url = URL.createObjectURL(f);
          const img = await new Promise((r, k) => { const i = new Image(); i.onload = () => r(i); i.onerror = k; i.src = url; });
          const ech = Math.min(1, taille / Math.max(img.naturalWidth || taille, img.naturalHeight || taille));
          const c = document.createElement('canvas');
          c.width = Math.round((img.naturalWidth || taille) * ech); c.height = Math.round((img.naturalHeight || taille) * ech);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          let donnees = c.toDataURL('image/webp', 0.86);
          let ext = 'webp';
          if (!donnees.startsWith('data:image/webp')) { donnees = c.toDataURL('image/png'); ext = 'png'; }
          const chemin = `assets/televerse/${slug(nomBase || f.name.replace(/\.\w+$/, '')) || 'image'}-${Date.now().toString(36)}.${ext}`;
          IMG[chemin] = { b64: donnees.split(',')[1], url: donnees };
          if (IMG[chemin].b64.length > 1.4e6) { delete IMG[chemin]; alert('Image trop lourde même après réduction.'); return ok(null); }
          ok(chemin);
        } catch (e) { alert('Image illisible : ' + e.message); ok(null); }
      };
      inp.click();
    });
  }
  /* retire les images en attente qui ne sont plus utilisées */
  function nettoyerImages() {
    const txt = JSON.stringify(D);
    Object.keys(IMG).forEach(k => { if (!txt.includes(k)) delete IMG[k]; });
  }

  /* ---------- Notes du SR (post-it, une par page) ---------- */
  function champNote(cle, libelle, aide) {
    const v = (D.notes || {})[cle] || '';
    return `<div class="champ note-sr"><label>🗒 ${esc(libelle)}</label><textarea data-note="${esc(cle)}" rows="3" placeholder="${esc(aide || 'Laisse vide pour afficher la note par défaut.')}">${esc(v)}</textarea></div>`;
  }
  function brancherNotes() {
    ed.querySelectorAll('[data-note]').forEach(t => t.addEventListener('input', () => {
      D.notes = D.notes || {};
      if (t.value.trim()) D.notes[t.dataset.note] = t.value; else delete D.notes[t.dataset.note];
      modifie();
    }));
  }

  /* ---------- Réglages généraux ---------- */
  function renderGeneral() {
    ed.innerHTML = `<h1>Réglages généraux</h1>
      <p class="a-aide">Ces textes apparaissent en haut de chaque page et sur l'accueil du site.</p>
      <div class="bloc">
        <div class="champ"><label for="g-titre">Titre du site</label><input id="g-titre" data-g="titre" value="${esc(D.titre)}"></div>
        <div class="ligne">
          <div class="champ"><label for="g-st">Sous-titre</label><input id="g-st" data-g="sousTitre" value="${esc(D.sousTitre || '')}"></div>
          <div class="champ"><label for="g-ct">Contact (affiché en pied de page)</label><input id="g-ct" data-g="contact" value="${esc(D.contact || '')}" placeholder="ex. : nom ou adresse académique"></div>
        </div>
      </div>
      <div class="bloc"><h2>Note du SR (post-it à droite du bandeau)</h2>
        <p class="a-aide" style="margin:0 0 8px">Une note peut être écrite pour chaque page : accueil, page d'une activité, page d'une étape, quiz. Une page sans note affiche la note par défaut ; si les deux sont vides, le post-it n'apparaît pas. Astuce : **texte** s'affiche en gras, les liens https://… sont cliquables.</p>
        ${champNote('defaut', 'Note par défaut (toutes les pages sans note)', 'Ex. : Nouveau ! Les vidéos de futsal sont en ligne.')}
        ${champNote('accueil', "Note de la page d'accueil")}
      </div>
      <div class="bloc"><h2>Les étapes du parcours</h2>
        ${D.etapes.map((e, i) => `<div class="ligne"><div class="champ" style="flex:.8"><label>Étape ${e.num} — titre</label><input data-etape="${i}" data-c="titre" value="${esc(e.titre)}"></div>
          <div class="champ"><label>Description</label><input data-etape="${i}" data-c="desc" value="${esc(e.desc || '')}"></div>
          <div class="champ" style="flex:.8"><label>Illustration</label><div style="display:flex;gap:8px;align-items:center">${e.image ? `<img src="${esc(srcImg(e.image))}" alt="" style="width:46px;height:46px;object-fit:cover;border-radius:8px">` : ''}
            <select data-etape-img="${i}">${JAJJ.IMAGES_ETAPES.map(f => `<option value="assets/etapes/${esc(f)}"${'assets/etapes/' + f === e.image ? ' selected' : ''}>${esc(f.replace(/\.\w+$/, ''))}</option>`).join('')}${e.image && !e.image.startsWith('assets/etapes/') ? `<option value="${esc(e.image)}" selected>Image déposée</option>` : ''}</select>
            <button class="btn petit" data-etape-up="${i}" title="Déposer une image depuis l'ordinateur" style="flex:none">Déposer…</button></div></div></div>`).join('')}
      </div>
      <div class="bloc"><h2>Certification blanche (remplace les sessions Wayground)</h2>
        <p class="a-aide" style="margin:0 0 8px">À l'étape 5 de chaque activité, un examen d'entraînement est créé automatiquement : les questions sont tirées au hasard dans les quiz Valable / Faute de l'activité, avec un chronomètre et la correction à la fin. Les élèves qui réussissent peuvent imprimer une attestation d'entraînement.</p>
        <div class="ligne">
          <div class="champ" style="flex:.7"><label for="c-actif">Examen blanc</label><select id="c-actif" data-cert="actif"><option value="1"${D.certification?.actif !== false ? ' selected' : ''}>Activé</option><option value="0"${D.certification?.actif === false ? ' selected' : ''}>Désactivé</option></select></div>
          <div class="champ" style="flex:.5"><label for="c-q">Nombre de questions</label><input id="c-q" type="number" min="5" max="100" data-cert="questions" value="${esc(D.certification?.questions ?? 30)}"></div>
          <div class="champ" style="flex:.5"><label for="c-m">Durée (minutes)</label><input id="c-m" type="number" min="1" max="120" data-cert="minutes" value="${esc(D.certification?.minutes ?? 20)}"></div>
          <div class="champ" style="flex:.5"><label for="c-s">Seuil de réussite (%)</label><input id="c-s" type="number" min="10" max="100" data-cert="seuil" value="${esc(D.certification?.seuil ?? 80)}"></div>
          <div class="champ"><label for="c-w">Anciennes sessions Wayground</label><select id="c-w" data-cert="garderWayground"><option value="0"${!D.certification?.garderWayground ? ' selected' : ''}>Masquées aux élèves</option><option value="1"${D.certification?.garderWayground ? ' selected' : ''}>Affichées sous l'examen blanc</option></select></div>
        </div>
      </div>
      <div class="bloc"><h2>Mentions légales, crédits et licence</h2>
        <p class="a-aide" style="margin:0 0 8px">Affichés sur la page « Mentions légales et crédits » (lien en bas des pages). La rubrique « Données personnelles » est rédigée automatiquement.</p>
        ${[['editeur', 'Éditeur du site'], ['auteurs', 'Conception des contenus (autrice / auteurs)'], ['realisation', 'Réalisation du site'], ['hebergement', 'Hébergement'], ['licence', 'Licence (texte complet)'], ['licenceCourte', 'Licence (texte court, en bas des pages)'], ['accessibilite', 'Accessibilité'], ['illustrations', 'Crédits des icônes et illustrations']]
          .map(([k, l]) => `<div class="champ"><label for="m-${k}">${esc(l)}</label>${k === 'licenceCourte' ? `<input id="m-${k}" data-ment="${k}" value="${esc(D.mentions?.[k] || '')}">` : `<textarea id="m-${k}" data-ment="${k}" rows="2">${esc(D.mentions?.[k] || '')}</textarea>`}</div>`).join('')}
      </div>
      <div class="bloc"><h2>Statistiques de visite (facultatif)</h2>
        <p class="a-aide" style="margin:0 0 8px">Mesure d'audience anonyme <b>sans cookie</b> avec Matomo, compatible RGPD sans bandeau de consentement. Il faut disposer d'une instance Matomo (à demander à la DRANE ou au service numérique académique) et y déclarer le site. Laisse vide pour ne rien mesurer.</p>
        <div class="ligne"><div class="champ"><label for="st-url">Adresse de Matomo</label><input id="st-url" type="url" data-stat="url" value="${esc(D.stats?.url || '')}" placeholder="ex. : https://matomo.exemple.fr/"></div>
        <div class="champ" style="flex:.4"><label for="st-id">Numéro du site</label><input id="st-id" data-stat="site" value="${esc(D.stats?.site || '')}" placeholder="ex. : 12"></div></div>
      </div>
      <div class="note">Astuce : le bouton <b>Aperçu</b> montre le site avec tes modifications avant de les publier. Le bouton <b>Contrôle qualité</b> liste les liens cassés, en double ou incomplets.</div>`;
    ed.querySelectorAll('[data-g]').forEach(i => i.addEventListener('input', () => { D[i.dataset.g] = i.value; modifie(); }));
    brancherNotes();
    ed.querySelectorAll('[data-etape]').forEach(i => i.addEventListener('input', () => { D.etapes[+i.dataset.etape][i.dataset.c] = i.value; modifie(); }));
    ed.querySelectorAll('[data-etape-img]').forEach(i => i.addEventListener('change', () => { D.etapes[+i.dataset.etapeImg].image = i.value; nettoyerImages(); modifie(); renderGeneral(); }));
    ed.querySelectorAll('[data-etape-up]').forEach(b => b.addEventListener('click', async () => {
      const e = D.etapes[+b.dataset.etapeUp];
      const ch = await choisirImage(900, 'etape-' + e.num); if (!ch) return;
      e.image = ch; nettoyerImages(); modifie(); renderGeneral();
    }));
    ed.querySelectorAll('[data-cert]').forEach(i => i.addEventListener('input', () => {
      const c = D.certification = D.certification || {};
      const k = i.dataset.cert;
      c[k] = (k === 'actif') ? i.value === '1' : k === 'garderWayground' ? i.value === '1' : Math.max(1, parseInt(i.value, 10) || 0);
      modifie();
    }));
    ed.querySelectorAll('[data-ment]').forEach(i => i.addEventListener('input', () => { (D.mentions = D.mentions || {})[i.dataset.ment] = i.value; modifie(); }));
    ed.querySelectorAll('[data-stat]').forEach(i => i.addEventListener('input', () => { (D.stats = D.stats || {})[i.dataset.stat] = i.value.trim(); modifie(); }));
  }

  /* ---------- Édition d'une activité ---------- */
  function avertissementsItem(it) {
    const m = [];
    if (it.alerte) m.push(['ko', it.alerte]);
    if (it.type === 'quiz' && !QZ[it.quiz]) m.push(['ko', 'Quiz introuvable : choisis-en un ou crée-le.']);
    if (it.type !== 'quiz' && !it.url) m.push(['ko', 'Lien manquant.']);
    if (['doc', 'slides', 'sheet'].includes(it.type) && it.url && !/\/d\/e\/|\/pub/.test(it.url)) m.push(['av', 'Ce document Google ne semble pas « publié sur le web » : il ne s\'affichera pas pour les élèves. Dans Google : Fichier › Partager › Publier sur le web, puis colle le lien obtenu.']);
    if (it.type === 'wayground' && /join\?gc=/.test(it.url || '')) m.push(['av', 'Code de session Wayground : il cessera de fonctionner quand la session sera terminée. Elle est désormais masquée aux élèves : la certification blanche du site la remplace (réglage dans « Réglages généraux »).']);
    if (it.type === 'sharepoint' || /sharepoint\.com\/.*personal/.test(it.url || '')) m.push(['av', 'Lien vers un espace OneDrive personnel : il demandera sans doute une connexion aux élèves.']);
    if (/sans titre|^Ressource \d+$|^Session Wayground \d+$/i.test(it.titre || '')) m.push(['av', 'Titre peu parlant : renomme-le pour les élèves.']);
    return m;
  }
  function renderSport(s) {
    ed.innerHTML = `<p class="fil"><button class="a-lien" style="display:inline;padding:0;width:auto" data-retour>Accueil gestion</button> › ${esc(s.nom)}</p>
      <h1>${esc(s.nom)}</h1>
      <p class="a-aide">Adresse publique : <a href="index.html#/s/${esc(s.id)}" target="_blank" rel="noopener">#/s/${esc(s.id)}</a></p>
      <div class="bloc"><div class="ligne">
        <div class="champ"><label for="s-nom">Nom de l'activité</label><input id="s-nom" value="${esc(s.nom)}"></div>
        <div class="champ" style="flex:.6"><label for="s-actif">Visibilité</label>
          <select id="s-actif"><option value="1"${s.actif !== false ? ' selected' : ''}>Publiée (cliquable)</option><option value="0"${s.actif === false ? ' selected' : ''}>« Bientôt disponible »</option></select></div>
        <div style="flex:0 0 auto"><button class="btn dang" id="s-suppr">Supprimer l'activité</button></div>
      </div>
      <div class="champ"><label for="s-icone">Icône de la tuile</label>
        <div style="display:flex;gap:10px;align-items:center">${s.icone ? `<img src="${esc(srcImg(JAJJ.cheminIcone(s.icone)))}" alt="" style="width:46px;height:46px;object-fit:contain">` : ''}
        <select id="s-icone"><option value="">— initiales —</option>${s.icone && s.icone.includes('/') ? `<option value="${esc(s.icone)}" selected>Image déposée</option>` : ''}${JAJJ.ICONES.map(n => `<option value="${esc(n)}"${n === s.icone ? ' selected' : ''}>${esc(n.replace(/^CA\d-/, '').replace(/-/g, ' '))} (${esc(n.slice(0, 3))})</option>`).join('')}</select>
        <button class="btn petit" id="s-icone-up" style="flex:none" title="Image carrée conseillée, fond transparent (PNG)">Déposer une icône…</button></div></div>
      </div>
      <div class="bloc">${champNote('s/' + s.id, "Note du SR — page de l'activité " + s.nom)}</div>
      ${D.etapes.map(e => blocEtapeEd(s, e)).join('')}`;
    brancherNotes();
    ed.querySelector('[data-retour]').onclick = () => aller({ type: 'general' });
    ed.querySelector('#s-nom').addEventListener('input', e => { s.nom = e.target.value; modifie(); });
    ed.querySelector('#s-nom').addEventListener('change', () => renderCote());
    ed.querySelector('#s-actif').addEventListener('change', e => { s.actif = e.target.value === '1'; modifie(); });
    ed.querySelector('#s-icone').addEventListener('change', e => { s.icone = e.target.value; nettoyerImages(); modifie(); renderSport(s); });
    ed.querySelector('#s-icone-up').addEventListener('click', async () => {
      const ch = await choisirImage(512, 'icone-' + s.id); if (!ch) return;
      s.icone = ch; nettoyerImages(); modifie(); renderSport(s);
    });
    ed.querySelector('#s-suppr').onclick = () => {
      ouvrirDlg(`<h2>Supprimer « ${esc(s.nom)} » ?</h2><p>L'activité et ses liens seront retirés du site à la prochaine publication. Ses quiz seront aussi supprimés (${quizDuSport(s.id).length}).</p>
        <div class="pied-dlg"><button class="btn" data-x="non">Annuler</button><button class="btn prim" data-x="oui" style="background:var(--rouge);border-color:var(--rouge)">Supprimer</button></div>`, x => {
        if (x !== 'oui') return;
        quizDuSport(s.id).forEach(q => supprimerQuiz(q.id));
        D.sports = D.sports.filter(x => x !== s); modifie(); aller({ type: 'general' });
      });
    };
    ed.querySelectorAll('.rang').forEach(r => brancherRang(s, r));
    ed.querySelectorAll('[data-ajout]').forEach(b => b.addEventListener('click', () => {
      const [cle, type] = b.dataset.ajout.split(':');
      if (type === 'quiz') {
        const q = nouveauQuiz(s);
        s[cle].push({ titre: q.titre, type: 'quiz', quiz: q.id });
        modifie(); aller({ type: 'quiz', id: q.id }); return;
      }
      s[cle].push({ titre: '', type: type === 'video' ? 'video' : 'lien', url: '' }); modifie(); renderSport(s);
      const rs = ed.querySelectorAll(`[data-cle=${cle}]`); rs[rs.length - 1]?.querySelector('[data-f=url]')?.focus();
    }));
  }
  function blocEtapeEd(s, e) {
    const items = s[e.cle] || (s[e.cle] = []);
    return `<section class="bloc" id="ed-${e.cle}"><h2><span class="pastille e${e.num}">${e.num}</span>${esc(e.titre)}</h2>
      ${items.length ? items.map((it, i) => rangHtml(s, e.cle, it, i)).join('') : '<p class="vide-ed">Aucun contenu pour l\'instant : l\'étape affichera « Contenu en préparation ».</p>'}
      <details class="note-etape"${(D.notes || {})['s/' + s.id + '/' + e.cle] ? ' open' : ''}><summary>🗒 Note du SR pour la page « ${esc(e.titre)} »</summary>${champNote('s/' + s.id + '/' + e.cle, 'Note de cette page')}</details>
      <div class="ligne" style="flex-wrap:wrap;gap:6px"><button class="btn petit" data-ajout="${e.cle}:lien" style="flex:0 0 auto">+ Ajouter un lien ou un document</button>
      <button class="btn petit" data-ajout="${e.cle}:video" style="flex:0 0 auto">+ Ajouter une vidéo</button>
      <button class="btn petit" data-ajout="${e.cle}:quiz" style="flex:0 0 auto">+ Créer un quiz Valable / Faute</button></div></section>`;
  }
  function rangHtml(s, cle, it, i) {
    const opts = Object.entries(TYPES).map(([k, t]) => `<option value="${k}"${it.type === k ? ' selected' : ''}>${esc(t.nom)}</option>`).join('');
    const qz = quizDuSport(s.id);
    const cible = it.type === 'quiz'
      ? `<div style="display:flex;gap:4px"><select data-f="quiz" aria-label="Quiz"><option value="">— choisir —</option>${qz.map(q => `<option value="${esc(q.id)}"${q.id === it.quiz ? ' selected' : ''}>${esc(q.titre)} (${JAJJ.nbQuestions(q)} q.)</option>`).join('')}</select>
         <button class="btn petit" data-editer-quiz ${it.quiz ? '' : 'disabled'}>Éditer</button></div>`
      : `<input data-f="url" type="url" value="${esc(it.url || '')}" placeholder="${it.type === 'video' ? 'Lien de la vidéo (YouTube, Vimeo, Tubes apps.education, Drive…)' : 'Colle ici le lien (Google, Wayground, vidéo…)'}" aria-label="Lien">`;
    const msgs = avertissementsItem(it).map(([c, t]) => `<div class="msg ${c}">⚠ ${esc(t)}</div>`).join('');
    return `<div class="rang" data-cle="${cle}" data-i="${i}">
      <select data-f="type" aria-label="Type">${opts}</select>
      <input data-f="titre" value="${esc(it.titre)}" placeholder="Titre affiché aux élèves" aria-label="Titre">
      ${cible}
      <input data-f="groupe" value="${esc(it.groupe || '')}" placeholder="Sous-groupe (facultatif)" aria-label="Sous-groupe">
      <div class="act"><button class="btn" data-m="-1" aria-label="Monter" title="Monter">↑</button><button class="btn" data-m="1" aria-label="Descendre" title="Descendre">↓</button>
      ${it.url ? `<a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener" title="Ouvrir le lien" aria-label="Ouvrir le lien">↗</a>` : ''}
      <button class="btn" data-del aria-label="Retirer" title="Retirer">✕</button></div>
      ${msgs ? `<div class="msg">${msgs}</div>` : ''}</div>`;
  }
  function brancherRang(s, r) {
    const cle = r.dataset.cle, i = +r.dataset.i, it = s[cle][i];
    r.querySelector('[data-f=titre]').addEventListener('input', e => { it.titre = e.target.value; modifie(); });
    r.querySelector('[data-f=groupe]').addEventListener('input', e => { if (e.target.value) it.groupe = e.target.value; else delete it.groupe; modifie(); });
    const u = r.querySelector('[data-f=url]');
    if (u) {
      u.addEventListener('input', () => { it.url = u.value.trim(); delete it.alerte; modifie(); });
      u.addEventListener('change', async () => {
        const t = JAJJ.typeDepuisUrl(it.url);
        if (it.type === 'lien' || !it.type || (it.type === 'video' && t !== 'lien')) it.type = t;
        if (!it.titre && it.type === 'video') it.titre = await titreVideo(it.url) || '';
        if (!it.titre) it.titre = TYPES[it.type].nom;
        modifie(); renderSport(s);
      });
    }
    r.querySelector('[data-f=type]').addEventListener('change', e => {
      it.type = e.target.value;
      if (it.type === 'quiz') { delete it.url; it.quiz = quizDuSport(s.id)[0]?.id || ''; } else { delete it.quiz; it.url = it.url || ''; }
      modifie(); renderSport(s);
    });
    const qs = r.querySelector('[data-f=quiz]');
    if (qs) qs.addEventListener('change', () => { it.quiz = qs.value; if (QZ[it.quiz] && !it.titre) it.titre = QZ[it.quiz].titre; modifie(); renderSport(s); });
    r.querySelector('[data-editer-quiz]')?.addEventListener('click', () => aller({ type: 'quiz', id: it.quiz }));
    r.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      const j = i + +b.dataset.m; if (j < 0 || j >= s[cle].length) return;
      [s[cle][i], s[cle][j]] = [s[cle][j], s[cle][i]]; modifie(); renderSport(s);
    }));
    r.querySelector('[data-del]').addEventListener('click', () => {
      s[cle].splice(i, 1);
      if (it.type === 'quiz' && it.quiz && !estReference(it.quiz)) {
        ouvrirDlg(`<h2>Supprimer aussi le quiz ?</h2><p>Le quiz « ${esc(QZ[it.quiz]?.titre || it.quiz)} » n'est plus utilisé nulle part.</p>
          <div class="pied-dlg"><button class="btn" data-x="garder">Le garder</button><button class="btn prim" data-x="suppr">Le supprimer</button></div>`, x => { if (x === 'suppr') supprimerQuiz(it.quiz); modifie(); renderSport(s); });
      }
      modifie(); renderSport(s);
    });
  }
  /* Titre automatique d'une vidéo YouTube / Vimeo / Dailymotion */
  async function titreVideo(url) {
    const services = [
      [/youtube\.com|youtu\.be/, 'https://www.youtube.com/oembed?format=json&url='],
      [/vimeo\.com/, 'https://vimeo.com/api/oembed.json?url='],
      [/dailymotion\.com|dai\.ly/, 'https://www.dailymotion.com/services/oembed?format=json&url='],
    ];
    const sv = services.find(([re]) => re.test(url || ''));
    if (!sv) return '';
    try { const r = await fetch(sv[1] + encodeURIComponent(url)); if (r.ok) return (await r.json()).title || ''; } catch (e) {}
    return '';
  }
  const estReference = id => D.sports.some(s => ETAPES_CLES.some(k => (s[k] || []).some(it => it.type === 'quiz' && it.quiz === id)));
  function supprimerQuiz(id) { if (QZ_ORIG[id]) SUPPR.add(id); delete QZ[id]; delete QZ_ORIG[id]; }
  function nouveauQuiz(s) {
    let n = 1; while (QZ[s.id + '-' + n] || SUPPR.has(s.id + '-' + n)) n++;
    const id = s.id + '-' + n;
    QZ[id] = { id, titre: 'Nouveau quiz', sousTitre: 'Quiz ' + s.nom, entete: '', sport: s.id, themes: [{ nom: '', questions: [{ q: '', r: 'valable', e: '' }] }] };
    QZ_ORIG[id] = null;
    return QZ[id];
  }
  document.getElementById('b-ajout-sport').addEventListener('click', () => {
    ouvrirDlg(`<h2>Nouvelle activité</h2><div class="champ"><label for="n-nom">Nom</label><input id="n-nom" placeholder="ex. : Judo"></div>
      <div class="pied-dlg"><button class="btn" data-x="non">Annuler</button><button class="btn prim" data-x="oui">Créer</button></div>`, x => {
      const nom = document.getElementById('n-nom').value.trim();
      if (x !== 'oui' || !nom) return;
      let id = slug(nom), k = 2; while (sport(id)) id = slug(nom) + '-' + k++;
      D.sports.push({ id, nom, actif: false, decouvrir: [], regles: [], analyse: [], construction: [], certification: [], videos: [] });
      modifie(); aller({ type: 'sport', id });
    }, () => document.getElementById('n-nom').focus());
  });

  /* ---------- Édition d'un quiz ---------- */
  function renderQuiz(q) {
    const s = sport(q.sport);
    let n = 0;
    ed.innerHTML = `<p class="fil">${s ? `<button class="a-lien" style="display:inline;padding:0;width:auto" data-retour>${esc(s.nom)}</button> › ` : ''}Quiz</p>
      <h1>${esc(q.titre)}</h1>
      <p class="a-aide">${JAJJ.nbQuestions(q)} affirmations · identifiant <code>${esc(q.id)}</code> · <a href="index.html?apercu#/q/${esc(q.id)}" target="_blank" rel="noopener" data-essai>Essayer ce quiz (aperçu)</a></p>
      <div class="bloc">
        <div class="ligne"><div class="champ"><label>Titre</label><input data-q="titre" value="${esc(q.titre)}"></div>
        <div class="champ"><label>Sous-titre</label><input data-q="sousTitre" value="${esc(q.sousTitre || '')}"></div></div>
        <div class="champ"><label>Bandeau (petit texte au-dessus du titre)</label><input data-q="entete" value="${esc(q.entete || '')}" placeholder="ex. : QUIZ NIVEAU 1 · RÈGLEMENT HANDBALL UNSS"></div>
        <div class="ligne" style="gap:6px">
          <button class="btn petit" id="q-import" style="flex:0 0 auto">Coller depuis un tableur…</button>
          <button class="btn petit" id="q-csv" style="flex:0 0 auto">Exporter en tableur (.csv)</button>
          <button class="btn petit" id="q-theme" style="flex:0 0 auto">+ Ajouter un thème</button>
          <button class="btn petit dang" id="q-suppr" style="flex:0 0 auto">Supprimer le quiz</button>
        </div>
        ${champNote('q/' + q.id, 'Note du SR — page de ce quiz', "Laisse vide pour reprendre la note de l'étape ou la note par défaut.")}
      </div>
      ${q.themes.map((t, ti) => `<section class="bloc"><div class="ligne"><div class="champ"><label>Thème ${ti + 1} ${q.themes.length === 1 ? '(facultatif : laisse vide s\'il n\'y a qu\'une série)' : ''}</label><input data-t="${ti}" value="${esc(t.nom || '')}" placeholder="ex. : Courses — Juges des départs"></div>
        ${q.themes.length > 1 ? `<div style="flex:0 0 auto"><button class="btn petit dang" data-tsuppr="${ti}">Supprimer le thème</button></div>` : ''}</div>
        <div class="liste-q">${t.questions.map((x, qi) => `<div class="qrow" data-ti="${ti}" data-qi="${qi}"><span class="n">${++n}</span>
          <textarea data-f="q" placeholder="Affirmation à juger" aria-label="Affirmation ${n}">${esc(x.q)}</textarea>
          <select data-f="r" class="${x.r}" aria-label="Réponse ${n}"><option value="valable"${x.r === 'valable' ? ' selected' : ''}>Valable</option><option value="faute"${x.r === 'faute' ? ' selected' : ''}>Faute</option></select>
          <textarea data-f="e" placeholder="Explication affichée après la réponse" aria-label="Explication ${n}">${esc(x.e || '')}</textarea>
          <div class="act" style="display:flex;flex-direction:column;gap:4px"><button class="btn petit" data-m="-1" aria-label="Monter">↑</button><button class="btn petit" data-m="1" aria-label="Descendre">↓</button><button class="btn petit" data-del aria-label="Supprimer">✕</button></div></div>`).join('')}</div>
        <button class="btn petit" data-ajq="${ti}" style="margin-top:6px">+ Ajouter une affirmation</button></section>`).join('')}`;
    ed.querySelector('[data-retour]')?.addEventListener('click', () => aller({ type: 'sport', id: q.sport }));
    brancherNotes();
    ed.querySelector('[data-essai]').addEventListener('click', () => sauverBrouillon());
    ed.querySelectorAll('[data-q]').forEach(i => i.addEventListener('input', () => {
      const ancien = q[i.dataset.q];
      q[i.dataset.q] = i.value;
      if (i.dataset.q === 'titre') D.sports.forEach(s => ETAPES_CLES.forEach(k => (s[k] || []).forEach(it => { if (it.quiz === q.id && (!it.titre || it.titre === ancien)) it.titre = i.value; })));
      modifie();
    }));
    ed.querySelectorAll('[data-t]').forEach(i => i.addEventListener('input', () => { q.themes[+i.dataset.t].nom = i.value; modifie(); }));
    ed.querySelectorAll('[data-tsuppr]').forEach(b => b.addEventListener('click', () => { q.themes.splice(+b.dataset.tsuppr, 1); modifie(); renderQuiz(q); }));
    ed.querySelectorAll('.qrow').forEach(r => {
      const t = q.themes[+r.dataset.ti], qi = +r.dataset.qi, x = t.questions[qi];
      r.querySelectorAll('[data-f]').forEach(c => c.addEventListener('input', () => { x[c.dataset.f] = c.value; if (c.tagName === 'SELECT') c.className = c.value; modifie(); }));
      r.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { const j = qi + +b.dataset.m; if (j < 0 || j >= t.questions.length) return; [t.questions[qi], t.questions[j]] = [t.questions[j], t.questions[qi]]; modifie(); renderQuiz(q); }));
      r.querySelector('[data-del]').addEventListener('click', () => { t.questions.splice(qi, 1); modifie(); renderQuiz(q); });
    });
    ed.querySelectorAll('[data-ajq]').forEach(b => b.addEventListener('click', () => {
      const t = q.themes[+b.dataset.ajq]; t.questions.push({ q: '', r: 'valable', e: '' }); modifie(); renderQuiz(q);
      const rs = ed.querySelectorAll(`.qrow[data-ti="${b.dataset.ajq}"] textarea[data-f=q]`); rs[rs.length - 1]?.focus();
    }));
    ed.querySelector('#q-theme').onclick = () => { q.themes.push({ nom: 'Nouveau thème', questions: [{ q: '', r: 'valable', e: '' }] }); modifie(); renderQuiz(q); };
    ed.querySelector('#q-suppr').onclick = () => ouvrirDlg(`<h2>Supprimer ce quiz ?</h2><p>Il sera retiré de toutes les étapes qui l'utilisent.</p><div class="pied-dlg"><button class="btn" data-x="non">Annuler</button><button class="btn prim" data-x="oui" style="background:var(--rouge);border-color:var(--rouge)">Supprimer</button></div>`, x => {
      if (x !== 'oui') return;
      D.sports.forEach(s => ETAPES_CLES.forEach(k => { s[k] = (s[k] || []).filter(it => it.quiz !== q.id); }));
      supprimerQuiz(q.id); modifie(); aller({ type: 'sport', id: q.sport });
    });
    ed.querySelector('#q-csv').onclick = () => {
      const lignes = [['Thème', 'Affirmation', 'Réponse (Valable/Faute)', 'Explication']];
      q.themes.forEach(t => t.questions.forEach(x => lignes.push([t.nom || '', x.q, x.r === 'valable' ? 'Valable' : 'Faute', x.e || ''])));
      const csv = '﻿' + lignes.map(l => l.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      telecharger(q.id + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    };
    ed.querySelector('#q-import').onclick = () => importerQuiz(q);
  }
  function analyserCollage(txt) {
    const lignes = txt.replace(/\r/g, '').split('\n').filter(l => l.trim());
    const sep = lignes.some(l => l.includes('\t')) ? '\t' : ';';
    const res = [];
    for (const l of lignes) {
      const c = l.split(sep).map(x => x.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      let theme = '', q, r, e;
      const iR = c.findIndex(x => /^(valable|faute|v|f|vrai|faux|valide)$/i.test(x));
      if (iR < 0) continue;
      if (iR === 2) { theme = c[0]; q = c[1]; } else q = c[iR - 1] ?? c[0];
      r = /^(valable|v|vrai|valide)$/i.test(c[iR]) ? 'valable' : 'faute';
      e = c.slice(iR + 1).join(' ').trim();
      if (q) res.push({ theme, q, r, e });
    }
    return res;
  }
  function importerQuiz(q) {
    ouvrirDlg(`<h2>Coller des affirmations</h2>
      <p class="a-aide" style="margin:0 0 8px">Copie des lignes depuis un tableur (Excel, LibreOffice, Google Sheets) et colle-les ci-dessous. Colonnes attendues : <b>Affirmation</b> | <b>Valable/Faute</b> | <b>Explication</b> (une colonne <b>Thème</b> peut précéder).</p>
      <textarea id="imp" rows="10" placeholder="Le juge arbitre est le chef de la compétition.&#9;Valable&#9;Il a autorité sur tous les officiels."></textarea>
      <p id="imp-info" class="a-aide"></p>
      <div class="pied-dlg"><button class="btn" data-x="non">Annuler</button><button class="btn" data-x="ajouter">Ajouter à la fin</button><button class="btn prim" data-x="remplacer">Remplacer tout le quiz</button></div>`, x => {
      const lignes = analyserCollage(document.getElementById('imp').value);
      if (!lignes.length || x === 'non') return;
      const parTheme = new Map(); lignes.forEach(l => { if (!parTheme.has(l.theme)) parTheme.set(l.theme, []); parTheme.get(l.theme).push({ q: l.q, r: l.r, e: l.e }); });
      const nouveaux = [...parTheme].map(([nom, questions]) => ({ nom, questions }));
      if (x === 'remplacer') q.themes = nouveaux;
      else nouveaux.forEach(t => { const ex = q.themes.find(y => (y.nom || '') === t.nom); if (ex) ex.questions.push(...t.questions); else q.themes.push(t); });
      q.themes = q.themes.filter(t => t.questions.some(y => y.q));
      if (!q.themes.length) q.themes = [{ nom: '', questions: [] }];
      modifie(); renderQuiz(q);
    }, () => {
      const t = document.getElementById('imp');
      t.addEventListener('input', () => { const n = analyserCollage(t.value).length; document.getElementById('imp-info').textContent = n ? n + ' affirmation(s) reconnue(s).' : 'Aucune ligne reconnue (vérifie la colonne Valable/Faute).'; });
      t.focus();
    });
  }

  /* ---------- Contrôle qualité ---------- */
  function controler() {
    const out = [], parUrl = new Map(), parQuiz = new Map();
    for (const s of D.sports) {
      if (s.actif !== false) {
        const vides = D.etapes.filter(e => !e.optionnelle && !(s[e.cle] || []).length).map(e => e.num);
        if (vides.length) out.push({ niv: 'inf', sport: s.id, txt: `Étape(s) ${vides.join(', ')} vide(s) : « Contenu en préparation » sera affiché.` });
      }
      let sessions = 0;
      ETAPES_CLES.forEach(k => (s[k] || []).forEach((it, i) => {
        const ou = { sport: s.id, cle: k };
        if (it.type === 'wayground' && /join\?gc=/.test(it.url || '')) sessions++;
        avertissementsItem(it).filter(([, t]) => !t.startsWith('Code de session')).forEach(([c, t]) => out.push({ niv: c === 'ko' ? 'err' : 'att', ...ou, txt: `${it.titre || '(sans titre)'} — ${t}` }));
        if (it.url) { if (!parUrl.has(it.url)) parUrl.set(it.url, []); parUrl.get(it.url).push({ s, it, k }); }
        if (it.quiz) { if (!parQuiz.has(it.quiz)) parQuiz.set(it.quiz, []); parQuiz.get(it.quiz).push({ s, k }); }
      }));
      if (sessions) out.push({ niv: 'att', sport: s.id, txt: `${sessions} lien(s) vers des sessions Wayground (join?gc=…) : ces codes expirent à la fin de la session. Prévoir des liens permanents ou des quiz Valable/Faute.` });
    }
    for (const [u, l] of parUrl) {
      const sports = [...new Set(l.map(x => x.s.id))];
      if (sports.length > 1) out.push({ niv: 'err', sport: sports[0], txt: `Le même lien est utilisé par plusieurs activités (${sports.map(id => sport(id).nom).join(', ')}) : « ${l[0].it.titre} ». Vérifie qu'il ne s'agit pas d'un copier-coller oublié.` });
      else if (l.length > 1) out.push({ niv: 'att', sport: sports[0], txt: `« ${l[0].it.titre} » apparaît ${l.length} fois dans ${sport(sports[0]).nom}.` });
    }
    for (const q of Object.values(QZ)) {
      const n = JAJJ.nbQuestions(q);
      const ou = { sport: q.sport, quiz: q.id };
      if (!parQuiz.has(q.id)) out.push({ niv: 'inf', ...ou, txt: `Le quiz « ${q.titre} » n'est placé dans aucune étape.` });
      if (n < 5) out.push({ niv: 'att', ...ou, txt: `Le quiz « ${q.titre} » ne contient que ${n} affirmation(s).` });
      const vus = new Set(); let sansExp = 0, vides = 0;
      q.themes.forEach(t => t.questions.forEach(x => { if (!x.q.trim()) vides++; else if (vus.has(x.q.trim())) out.push({ niv: 'att', ...ou, txt: `Affirmation en double dans « ${q.titre} » : « ${x.q.slice(0, 80)} »` }); vus.add(x.q.trim()); if (!x.e) sansExp++; }));
      if (vides) out.push({ niv: 'err', ...ou, txt: `${vides} affirmation(s) vide(s) dans « ${q.titre} ».` });
      if (sansExp) out.push({ niv: 'inf', ...ou, txt: `${sansExp} affirmation(s) sans explication dans « ${q.titre} ».` });
    }
    const ordre = { err: 0, att: 1, inf: 2 };
    return out.sort((a, b) => ordre[a.niv] - ordre[b.niv]);
  }
  let resultatsLiens = null;
  function renderQualite() {
    const a = controler();
    const extra = resultatsLiens || [];
    const tout = [...extra, ...a];
    const c = n => tout.filter(x => x.niv === n).length;
    ed.innerHTML = `<h1>Contrôle qualité</h1>
      <p class="a-aide"><b>${c('err')}</b> erreur(s) · <b>${c('att')}</b> point(s) d'attention · <b>${c('inf')}</b> information(s)</p>
      <div class="ligne" style="margin-bottom:14px"><button class="btn" id="b-liens" style="flex:0 0 auto">Tester les liens Google publiés</button><span id="liens-info" class="a-aide" style="margin:0"></span></div>
      ${tout.map(x => `<div class="anomalie"><span class="niv ${x.niv}">${{ err: 'ERREUR', att: 'ATTENTION', inf: 'INFO' }[x.niv]}</span><div>${x.sport && sport(x.sport) ? `<b>${esc(sport(x.sport).nom)}</b> — ` : ''}${esc(x.txt)}
        ${x.quiz && QZ[x.quiz] ? ` <button class="lien" data-aller-quiz="${esc(x.quiz)}">Ouvrir le quiz</button>` : x.sport && sport(x.sport) ? ` <button class="lien" data-aller-sport="${esc(x.sport)}">Corriger</button>` : ''}</div></div>`).join('') || '<p>Rien à signaler 🎉</p>'}`;
    ed.querySelectorAll('[data-aller-sport]').forEach(b => b.onclick = () => aller({ type: 'sport', id: b.dataset.allerSport }));
    ed.querySelectorAll('[data-aller-quiz]').forEach(b => b.onclick = () => aller({ type: 'quiz', id: b.dataset.allerQuiz }));
    ed.querySelector('#b-liens').onclick = testerLiens;
  }
  async function testerLiens() {
    const info = document.getElementById('liens-info');
    const liste = [];
    D.sports.forEach(s => ETAPES_CLES.forEach(k => (s[k] || []).forEach(it => { if (/docs\.google\.com\/.*\/pub/.test(it.url || '')) liste.push({ s, it }); })));
    const res = []; let fait = 0;
    const file = liste.slice();
    async function travail() {
      while (file.length) {
        const { s, it } = file.shift();
        try { const r = await fetch(it.url, { method: 'GET' }); if (!r.ok) res.push({ niv: 'err', sport: s.id, txt: `« ${it.titre} » : le lien Google répond ${r.status} (document supprimé ou dépublié).` }); }
        catch (e) { /* réseau ou blocage du navigateur : on ne conclut pas */ }
        info.textContent = `Vérification… ${++fait}/${liste.length}`;
      }
    }
    await Promise.all(Array.from({ length: 6 }, travail));
    resultatsLiens = res;
    renderQualite();
    document.getElementById('liens-info').textContent = `${liste.length} liens Google testés : ${res.length} en erreur.`;
  }
  document.getElementById('b-qualite').addEventListener('click', () => aller({ type: 'qualite' }));

  /* ---------- Aperçu ---------- */
  document.getElementById('b-apercu').addEventListener('click', () => { sauverBrouillon(); window.open('index.html?apercu' + (vue.type === 'sport' ? '#/s/' + vue.id : vue.type === 'quiz' ? '#/q/' + vue.id : ''), '_blank'); });

  /* ---------- Fichiers à publier ---------- */
  function fichiersModifies() {
    const f = [];
    const data = JSON.stringify(D) !== ORIG;
    if (data || quizModifies().length || SUPPR.size) { D.maj = today(); f.push({ chemin: 'site/data/data.json', action: 'update', texte: JSON.stringify(D, null, 1) + '\n' }); }
    quizModifies().forEach(id => f.push({ chemin: `site/data/quiz/${id}.json`, action: QZ_ORIG[id] ? 'update' : 'create', texte: JSON.stringify(QZ[id], null, 1) + '\n' }));
    SUPPR.forEach(id => f.push({ chemin: `site/data/quiz/${id}.json`, action: 'delete' }));
    nettoyerImages();
    Object.entries(IMG).forEach(([chemin, im]) => f.push({ chemin: 'site/' + chemin, action: 'create', b64: im.b64 }));
    return f;
  }
  document.getElementById('b-export').addEventListener('click', () => {
    const tous = confirm('Télécharger TOUS les fichiers de données ?\n\nOK : tout (data.json + tous les quiz)\nAnnuler : seulement les fichiers modifiés');
    let f;
    if (tous) f = [{ chemin: 'site/data/data.json', texte: JSON.stringify(D, null, 1) + '\n' }, ...Object.values(QZ).map(q => ({ chemin: `site/data/quiz/${q.id}.json`, texte: JSON.stringify(q, null, 1) + '\n' }))];
    else f = fichiersModifies().filter(x => x.action !== 'delete');
    if (tous) Object.entries(IMG).forEach(([chemin, im]) => f.push({ chemin: 'site/' + chemin, b64: im.b64 }));
    if (!f.length) return alert('Aucune modification à télécharger.');
    const octets = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    telecharger('donnees-jajj-' + today() + '.zip', ZipMini.creer(f.map(x => ({ nom: x.chemin.replace(/^site\//, ''), texte: x.texte, octets: x.b64 ? octets(x.b64) : null }))));
  });
  document.getElementById('f-import').addEventListener('change', async e => {
    const fic = e.target.files[0]; if (!fic) return;
    try {
      const d = JSON.parse(await fic.text());
      if (!Array.isArray(d.sports) || !Array.isArray(d.etapes)) throw new Error('Ce fichier ne ressemble pas à un data.json du site.');
      D = d; modifie(); aller({ type: 'general' });
    } catch (err) { alert('Import impossible : ' + err.message); }
    e.target.value = '';
  });

  /* ---------- Plateformes de publication (Forge / GitHub) ---------- */
  const PLATEFORMES = {
    forge: {
      nom: 'la Forge',
      aideProjet: 'Projet (groupe/nom)', exemple: 'ex. : unss-nantes/jeunes-officiels', exJeton: 'glpat-…',
      aideJeton: 'Sur la Forge : avatar › <b>Préférences</b> › <b>Jetons d\'accès</b> › <b>Ajouter un jeton</b>. Coche uniquement la portée <code>api</code> et choisis une date d\'expiration (fin d\'année scolaire par exemple).',
      async tester(v) {
        const r = await fetch(`${v.forge}/api/v4/projects/${encodeURIComponent(v.projet)}`, { headers: { 'PRIVATE-TOKEN': v.jeton } });
        if (r.status === 401) throw new Error('jeton refusé (invalide ou expiré).');
        if (r.status === 404) throw new Error('projet introuvable, ou jeton sans accès à ce projet.');
        if (!r.ok) throw new Error('réponse ' + r.status);
        const j = await r.json();
        const niv = Math.max(j.permissions?.project_access?.access_level || 0, j.permissions?.group_access?.access_level || 0);
        return { nom: j.name_with_namespace, peutEcrire: niv >= 30, role: 'au moins « Développeur »' };
      },
      async historique(v) {
        const r = await fetch(`${v.forge}/api/v4/projects/${encodeURIComponent(v.projet)}/repository/commits?path=site/data/data.json&ref_name=${encodeURIComponent(v.branche)}&per_page=40`, { headers: { 'PRIVATE-TOKEN': v.jeton } });
        if (!r.ok) throw new Error('historique illisible (' + r.status + ')');
        return (await r.json()).map(c => ({ sha: c.id, message: c.title, auteur: c.author_name, date: c.created_at }));
      },
      async version(v, sha) {
        const r = await fetch(`${v.forge}/api/v4/projects/${encodeURIComponent(v.projet)}/repository/files/${encodeURIComponent('site/data/data.json')}/raw?ref=${sha}`, { headers: { 'PRIVATE-TOKEN': v.jeton } });
        if (!r.ok) throw new Error('version illisible (' + r.status + ')');
        return r.json();
      },
      async publier(v, fichiers, message) {
        const corps = { branch: v.branche, commit_message: message, actions: fichiers.map(x => x.action === 'delete' ? { action: 'delete', file_path: x.chemin }
          : x.b64 ? { action: 'create', file_path: x.chemin, content: x.b64, encoding: 'base64' }
          : { action: x.action, file_path: x.chemin, content: x.texte }) };
        const rep = await fetch(`${v.forge}/api/v4/projects/${encodeURIComponent(v.projet)}/repository/commits`, { method: 'POST', headers: { 'PRIVATE-TOKEN': v.jeton, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
        if (rep.ok) return;
        let m = ''; try { m = (await rep.json()).message; } catch (e) {}
        if (rep.status === 401) throw new Error('jeton refusé (invalide ou expiré). Ouvre ⚙ pour le remplacer.');
        if (rep.status === 403) throw new Error('ton rôle sur le projet ne permet pas de publier (il faut au moins « Développeur », ou la branche est protégée).');
        throw new Error(m || ('erreur ' + rep.status));
      },
    },
    github: {
      nom: 'GitHub',
      aideProjet: 'Dépôt (propriétaire/nom)', exemple: 'ex. : mon-compte/jeunes-officiels', exJeton: 'github_pat_…',
      aideJeton: 'Sur GitHub : avatar › <b>Settings</b> › <b>Developer settings</b> › <b>Personal access tokens</b> › <b>Fine-grained tokens</b> › <b>Generate new token</b>. Choisis « Only select repositories » (ce dépôt uniquement), puis dans <b>Repository permissions</b> mets <b>Contents</b> sur <b>Read and write</b>. Fixe une date d\'expiration.',
      entetes: v => ({ Authorization: 'Bearer ' + v.jeton, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }),
      async appel(v, chemin, options = {}) {
        const r = await fetch(`https://api.github.com/repos/${v.projet}${chemin}`, { ...options, headers: { ...this.entetes(v), ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
        if (r.ok) return r.json();
        let m = ''; try { m = (await r.json()).message; } catch (e) {}
        if (r.status === 401) throw new Error('jeton refusé (invalide ou expiré). Ouvre ⚙ pour le remplacer.');
        if (r.status === 404) throw new Error('dépôt ou branche introuvable, ou jeton sans accès à ce dépôt.');
        if (r.status === 403) throw new Error('le jeton n\'a pas le droit d\'écrire (permission « Contents : Read and write » nécessaire).');
        if (r.status === 409 || r.status === 422) throw new Error('la branche a changé ou est protégée (' + m + '). Réessaie dans un instant.');
        throw new Error(m || ('erreur ' + r.status));
      },
      async tester(v) {
        const j = await this.appel(v, '');
        return { nom: j.full_name, peutEcrire: !!(j.permissions && (j.permissions.push || j.permissions.admin)), role: 'le droit d\'écriture sur le dépôt' };
      },
      async historique(v) {
        const l = await this.appel(v, `/commits?path=site/data/data.json&sha=${encodeURIComponent(v.branche)}&per_page=40`);
        return l.map(c => ({ sha: c.sha, message: c.commit.message.split('\n')[0], auteur: c.commit.author.name, date: c.commit.author.date }));
      },
      async version(v, sha) {
        const r = await fetch(`https://api.github.com/repos/${v.projet}/contents/site/data/data.json?ref=${sha}`, { headers: { ...this.entetes(v), Accept: 'application/vnd.github.raw+json' } });
        if (!r.ok) throw new Error('version illisible (' + r.status + ')');
        return r.json();
      },
      async publier(v, fichiers, message) {
        const ref = await this.appel(v, `/git/ref/heads/${encodeURIComponent(v.branche)}`);
        const parent = ref.object.sha;
        const commitParent = await this.appel(v, `/git/commits/${parent}`);
        for (const x of fichiers) if (x.b64) x.sha = (await this.appel(v, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: x.b64, encoding: 'base64' }) })).sha;
        const arbre = await this.appel(v, '/git/trees', { method: 'POST', body: JSON.stringify({
          base_tree: commitParent.tree.sha,
          tree: fichiers.map(x => x.action === 'delete'
            ? { path: x.chemin, mode: '100644', type: 'blob', sha: null }
            : x.sha ? { path: x.chemin, mode: '100644', type: 'blob', sha: x.sha }
            : { path: x.chemin, mode: '100644', type: 'blob', content: x.texte }),
        }) });
        const commit = await this.appel(v, '/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: arbre.sha, parents: [parent] }) });
        await this.appel(v, `/git/refs/heads/${encodeURIComponent(v.branche)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
      },
    },
  };

  /* ---------- Réglages de publication ---------- */
  function dlgReglages(apres) {
    const r = lireReglages();
    const memo = (() => { try { return (localStorage.getItem(CLE_REGLAGES) || '').includes('jeton'); } catch (e) { return false; } })();
    ouvrirDlg(`<h2>Réglages de publication</h2>
      <p class="a-aide" style="margin:0 0 10px">La publication enregistre directement tes modifications dans le dépôt du site ; il se met à jour 1 à 2 minutes plus tard.</p>
      <div class="ligne"><div class="champ" style="flex:.6"><label for="r-plat">Hébergement</label>
        <select id="r-plat"><option value="forge"${r.plateforme === 'forge' ? ' selected' : ''}>La Forge (apps.education.fr)</option><option value="github"${r.plateforme === 'github' ? ' selected' : ''}>GitHub</option></select></div>
      <div class="champ" id="r-forge-c"><label for="r-forge">Adresse de la Forge</label><input id="r-forge" value="${esc(r.forge)}"></div></div>
      <div class="ligne"><div class="champ"><label for="r-projet" id="r-projet-l"></label><input id="r-projet" value="${esc(r.projet || '')}"></div>
      <div class="champ" style="flex:.4"><label for="r-br">Branche</label><input id="r-br" value="${esc(r.branche)}"></div></div>
      <div class="champ"><label for="r-jeton">Jeton d'accès personnel</label><input id="r-jeton" type="password" value="${esc(r.jeton || '')}" autocomplete="off"></div>
      <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="r-mem"${memo ? ' checked' : ''}> Mémoriser le jeton sur cet ordinateur (sinon il est oublié à la fermeture de l'onglet)</label>
      <div class="note" id="r-aide"></div>
      <p id="r-test" class="a-aide"></p>
      <div class="pied-dlg"><button class="btn" data-x="tester" data-garder>Tester la connexion</button><button class="btn" data-x="non">Fermer</button><button class="btn prim" data-x="ok">Enregistrer</button></div>`, async x => {
      if (x === 'ok') { ecrireReglages(valeurs(), document.getElementById('r-mem').checked); if (apres) apres(); }
    }, () => {
      const maj = () => {
        const p = PLATEFORMES[document.getElementById('r-plat').value];
        document.getElementById('r-forge-c').hidden = document.getElementById('r-plat').value !== 'forge';
        document.getElementById('r-projet-l').textContent = p.aideProjet;
        document.getElementById('r-projet').placeholder = p.exemple;
        document.getElementById('r-jeton').placeholder = p.exJeton;
        document.getElementById('r-aide').innerHTML = 'Pour créer un jeton : ' + p.aideJeton + ' Ne communique jamais ce jeton.';
      };
      document.getElementById('r-plat').addEventListener('change', maj); maj();
    }, async (x) => {
      if (x !== 'tester') return false;
      const p = document.getElementById('r-test'), v = valeurs();
      p.textContent = 'Test en cours…';
      try {
        const t = await PLATEFORMES[v.plateforme].tester(v);
        p.innerHTML = t.peutEcrire ? `✔ Connexion réussie à <b>${esc(t.nom)}</b>. Tu peux publier.` : `⚠ Connexion réussie à <b>${esc(t.nom)}</b>, mais il manque ${esc(t.role)} pour publier.`;
      } catch (e) { p.textContent = '✘ Échec : ' + e.message; }
      return true;
    });
    function valeurs() {
      return {
        plateforme: document.getElementById('r-plat').value,
        forge: document.getElementById('r-forge').value.trim().replace(/\/$/, ''),
        projet: document.getElementById('r-projet').value.trim().replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, '').replace(/^\/|\/$/g, ''),
        branche: document.getElementById('r-br').value.trim() || 'main',
        jeton: document.getElementById('r-jeton').value.trim(),
      };
    }
  }
  document.getElementById('b-reglages').addEventListener('click', () => dlgReglages());

  /* ---------- Publication ---------- */
  document.getElementById('b-publier').addEventListener('click', () => {
    const f = fichiersModifies();
    if (!f.length) return ouvrirDlg('<h2>Rien à publier</h2><p>Le site est déjà à jour.</p><div class="pied-dlg"><button class="btn prim" data-x="ok">OK</button></div>');
    const r = lireReglages();
    if (!r.projet || !r.jeton) return dlgReglages(() => document.getElementById('b-publier').click());
    const plat = PLATEFORMES[r.plateforme] || PLATEFORMES.forge;
    const err = controler().filter(x => x.niv === 'err').length;
    ouvrirDlg(`<h2>Publier les modifications</h2>
      <p>${f.length} fichier(s) seront enregistrés sur ${plat.nom} dans <b>${esc(r.projet)}</b> (branche ${esc(r.branche)}) :</p>
      <ul style="font-size:14px;max-height:180px;overflow:auto">${f.map(x => `<li>${{ update: 'Modifié', create: 'Nouveau', delete: 'Supprimé' }[x.action]} : ${esc(x.chemin.replace('site/data/', '').replace('site/assets/televerse/', 'image '))}</li>`).join('')}</ul>
      ${err ? `<div class="note">⚠ Le contrôle qualité signale ${err} erreur(s). Tu peux publier quand même et corriger plus tard.</div>` : ''}
      <div class="champ"><label for="p-msg">Message (pour l'historique)</label><input id="p-msg" value="Mise à jour du ${new Date().toLocaleDateString('fr-FR')}"></div>
      <p id="p-etat" class="a-aide"></p>
      <div class="pied-dlg"><button class="btn" data-x="non">Annuler</button><button class="btn prim" data-x="go" data-garder>Publier</button></div>`, null, null, async x => {
      if (x !== 'go') return false;
      const p = document.getElementById('p-etat');
      p.textContent = 'Publication en cours…';
      try {
        await plat.publier(r, f, document.getElementById('p-msg').value || 'Mise à jour');
        ORIG = JSON.stringify(D);
        quizModifies().forEach(id => { QZ_ORIG[id] = JSON.stringify(QZ[id]); });
        SUPPR.clear();
        Object.keys(IMG).forEach(k => delete IMG[k]);
        try { localStorage.removeItem(JAJJ.CLE_BROUILLON); } catch (e) {}
        majEtat();
        const lien = JAJJ.horsLigne ? '' : '<a class="btn" href="index.html" target="_blank" rel="noopener">Voir le site</a>';
        dlgIn.innerHTML = `<h2>✔ Publié</h2><p>Les modifications sont enregistrées sur ${plat.nom}. Le site en ligne sera à jour d'ici 1 à 2 minutes.</p><div class="pied-dlg">${lien}<button class="btn prim" data-x="ok">Fermer</button></div>`;
      } catch (e) { p.innerHTML = '<span class="msg ko">✘ Publication impossible : ' + esc(e.message) + '</span><br>En secours, utilise « Télécharger les fichiers (.zip) » puis dépose les fichiers dans le dépôt via l\'interface web.'; }
      return true;
    });
  });

  /* ---------- Historique des publications ---------- */
  document.getElementById('b-histo').addEventListener('click', async () => {
    const r = lireReglages();
    if (!r.projet || !r.jeton) return dlgReglages(() => document.getElementById('b-histo').click());
    const plat = PLATEFORMES[r.plateforme] || PLATEFORMES.forge;
    ouvrirDlg('<h2>Historique des publications</h2><p id="h-etat">Chargement…</p><div id="h-liste"></div><div class="pied-dlg"><button class="btn" data-x="non">Fermer</button></div>', null, async () => {
      try {
        const l = await plat.historique(r);
        document.getElementById('h-etat').innerHTML = 'Chaque ligne est une publication. « Restaurer » recharge cette version des contenus (activités, liens, notes, réglages) <b>dans le brouillon</b> : vérifie-la avec l\'Aperçu, puis clique sur Publier pour la remettre en ligne. Les quiz ne sont pas modifiés.';
        document.getElementById('h-liste').innerHTML = `<ul class="histo">${l.map((c, i) => `<li><div><b>${esc(c.message)}</b><small>${esc(new Date(c.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))} · ${esc(c.auteur)}${i === 0 ? ' · <em>version en ligne</em>' : ''}</small></div>${i ? `<button class="btn petit" data-restaurer="${esc(c.sha)}">Restaurer</button>` : ''}</li>`).join('')}</ul>`;
        document.querySelectorAll('[data-restaurer]').forEach(b => b.addEventListener('click', async () => {
          if (estModifie() && !confirm('Tes modifications non publiées seront remplacées par cette ancienne version. Continuer ?')) return;
          b.disabled = true; b.textContent = '…';
          try {
            const d = await plat.version(r, b.dataset.restaurer);
            if (!Array.isArray(d.sports)) throw new Error('fichier inattendu');
            D = d; nettoyerImages(); modifie(); dlg.close(); aller({ type: 'general' });
            alert('Version restaurée dans le brouillon. Vérifie avec « Aperçu », puis « Publier ».');
          } catch (e) { b.textContent = 'Échec'; alert('Restauration impossible : ' + e.message); }
        }));
      } catch (e) { document.getElementById('h-etat').textContent = '✘ ' + e.message; }
    });
  });

  /* ---------- Affiches avec QR code ---------- */
  const urlPublique = () => {
    const r = lireReglages();
    if (r.urlSite) return r.urlSite.replace(/\/?$/, '/');
    return location.href.replace(/[#?].*$/, '').replace(/admin\.html$/, '');
  };
  function qrSvg(texte, taille) {
    const q = qrcode(0, 'M'); q.addData(texte); q.make();
    const n = q.getModuleCount(), m = 4, t = n + 2 * m;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m},${r + m}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${taille}" height="${taille}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  const chargerImg = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  async function affichePng(s, base) {
    const W = 1240, H = 1754, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#16359f'; x.fillRect(0, 0, W, 26); x.fillStyle = '#d60a3d'; x.fillRect(0, H - 26, W, 26);
    const logo = await chargerImg('assets/logo-unss-nantes.png');
    if (logo) { const lw = 520, lh = lw * logo.height / logo.width; x.drawImage(logo, (W - lw) / 2, 70, lw, lh); }
    const ic = s.icone ? await chargerImg(srcImg(JAJJ.cheminIcone(s.icone))) : null;
    if (ic) x.drawImage(ic, (W - 260) / 2, 420, 260, 260);
    x.fillStyle = '#16359f'; x.textAlign = 'center';
    x.font = '900 92px Nunito, system-ui, sans-serif'; x.fillText(s.nom, W / 2, 790);
    x.font = '700 44px Nunito, system-ui, sans-serif'; x.fillStyle = '#333'; x.fillText('Deviens jeune officiel : scanne et entraîne-toi !', W / 2, 870);
    const qr = await chargerImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qrSvg(base + '#/s/' + s.id, 640)));
    if (qr) x.drawImage(qr, (W - 640) / 2, 930, 640, 640);
    x.font = '600 30px system-ui, sans-serif'; x.fillStyle = '#555'; x.fillText(base + '#/s/' + s.id, W / 2, 1640);
    return new Promise(ok => c.toBlob(ok, 'image/png'));
  }
  function renderAffiches() {
    const base = urlPublique();
    const actifs = [...D.sports].filter(s => s.actif !== false).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    ed.innerHTML = `<h1>Affiches QR code</h1>
      <p class="a-aide">Une affiche par activité, à imprimer et afficher au gymnase ou au CDI : les élèves scannent le QR code et arrivent directement sur la page de l'activité.</p>
      <div class="bloc"><div class="ligne">
        <div class="champ"><label for="qr-base">Adresse du site publié</label><input id="qr-base" type="url" value="${esc(base)}"></div>
        <div class="champ" style="flex:.6"><label for="qr-format">Format d'impression</label><select id="qr-format"><option value="1">1 affiche A4 par page</option><option value="4">4 par page (A6)</option><option value="12">12 par page (étiquettes)</option></select></div>
        <div style="flex:0 0 auto;display:flex;gap:6px"><button class="btn" id="qr-tout">Tout cocher</button><button class="btn prim" id="qr-imprimer">Imprimer la sélection</button></div>
      </div>
      <p class="a-aide" style="margin:6px 0 0">Vérifie l'adresse : elle doit être celle du site en ligne (par exemple https://unss.forge.apps.education.fr/ja/). Elle est mémorisée sur cet ordinateur.</p></div>
      <div class="qr-grille">${actifs.map(s => `<label class="qr-carte"><input type="checkbox" data-qr="${esc(s.id)}">
        ${s.icone ? `<img src="${esc(srcImg(JAJJ.cheminIcone(s.icone)))}" alt="">` : ''}<b>${esc(s.nom)}</b>
        <span class="qr-mini">${qrSvg(base + '#/s/' + s.id, 110)}</span>
        <button class="btn petit" type="button" data-png="${esc(s.id)}">Télécharger (PNG)</button></label>`).join('')}</div>`;
    const lireBase = () => { const v = ed.querySelector('#qr-base').value.trim(); return v.replace(/[#?].*$/, '').replace(/admin\.html$/, '').replace(/\/?$/, '/'); };
    ed.querySelector('#qr-base').addEventListener('change', () => { const r = lireReglages(); r.urlSite = lireBase(); ecrireReglages(r, (localStorage.getItem(CLE_REGLAGES) || '').includes('jeton')); renderAffiches(); });
    ed.querySelector('#qr-tout').onclick = () => { const cs = ed.querySelectorAll('[data-qr]'); const tous = [...cs].every(c => c.checked); cs.forEach(c => { c.checked = !tous; }); };
    ed.querySelectorAll('[data-png]').forEach(b => b.addEventListener('click', async e => {
      e.preventDefault(); const s = sport(b.dataset.png);
      telecharger('affiche-' + s.id + '.png', await affichePng(s, lireBase()));
    }));
    ed.querySelector('#qr-imprimer').onclick = () => {
      let ids = [...ed.querySelectorAll('[data-qr]:checked')].map(c => c.dataset.qr);
      if (!ids.length) return alert('Coche au moins une activité.');
      const fmt = ed.querySelector('#qr-format').value, b = lireBase();
      const racine = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
      const w = window.open('', '_blank');
      if (!w) return alert('Autorise les fenêtres surgissantes pour imprimer.');
      const taille = { 1: 420, 4: 200, 12: 110 }[fmt];
      w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Affiches QR</title><base href="${esc(racine)}">
        <link rel="stylesheet" href="assets/app.css"><style>
        @page{size:A4;margin:10mm} body{margin:0;background:#fff;font-family:Nunito,system-ui,sans-serif;color:#16359f}
        .f{display:grid;gap:6mm;grid-template-columns:repeat(${fmt === '1' ? 1 : fmt === '4' ? 2 : 3},1fr)}
        .a{border:${fmt === '1' ? 0 : '1px dashed #bbb'};text-align:center;padding:${fmt === '1' ? '10mm 0' : '4mm'};break-inside:avoid;${fmt === '1' ? 'height:270mm;break-after:page;display:flex;flex-direction:column;align-items:center;justify-content:space-between' : ''}}
        .a .lg{width:${fmt === '1' ? 70 : fmt === '4' ? 40 : 28}mm}.a .ic{width:${fmt === '1' ? 45 : fmt === '4' ? 20 : 12}mm;height:auto}
        .a h2{margin:2mm 0;font-size:${fmt === '1' ? 44 : fmt === '4' ? 20 : 13}pt;font-weight:900}
        .a p{margin:1mm 0;color:#333;font-size:${fmt === '1' ? 16 : 9}pt;font-weight:700}.a small{color:#555;font-size:${fmt === '1' ? 10 : 6.5}pt;word-break:break-all}
        .a svg{max-width:100%;height:auto}</style></head><body><div class="f">${ids.map(id => { const s = sport(id); return `<div class="a">
        <img class="lg" src="assets/logo-unss-nantes.png" alt="UNSS Académie de Nantes">
        ${s.icone ? `<img class="ic" src="${esc(srcImg(JAJJ.cheminIcone(s.icone)))}" alt="">` : ''}<h2>${esc(s.nom)}</h2>
        ${fmt !== '12' ? '<p>Deviens jeune officiel : scanne et entraîne-toi !</p>' : ''}
        ${qrSvg(b + '#/s/' + id, taille)}<small>${esc(b + '#/s/' + id)}</small></div>`; }).join('')}</div>
        <script>window.onload=()=>setTimeout(()=>print(),400)<\/script></body></html>`);
      w.document.close();
    };
  }
  document.getElementById('b-affiches').addEventListener('click', () => aller({ type: 'affiches' }));

  /* ---------- Boîte de dialogue ---------- */
  function ouvrirDlg(html, surChoix, auMontage, surAction) {
    dlgIn.innerHTML = html;
    dlg.showModal();
    if (auMontage) auMontage();
    dlgIn.onclick = async e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x;
      if (surAction && b.hasAttribute('data-garder')) { b.disabled = true; await surAction(x); b.disabled = false; return; }
      dlg.close();
      if (surChoix) await surChoix(x);
    };
  }

  window.addEventListener('beforeunload', e => { if (estModifie()) { sauverBrouillon(); } });
  JAJJ_ACCES.attendre().then(() => charger()).catch(e => { ed.innerHTML = `<h1>Erreur</h1><p>${esc(e.message)}</p>`; });
})();
