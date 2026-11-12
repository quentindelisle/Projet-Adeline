/* Fonctions partagées entre le site et l'espace de gestion */
const JAJJ = (() => {
  const TYPES = {
    doc:        { nom: 'Fiche (Google Docs)',        ico: 'DOC', integrable: true },
    slides:     { nom: 'Diaporama (Google Slides)',  ico: 'DIA', integrable: true },
    sheet:      { nom: 'Tableau (Google Sheets)',    ico: 'TAB', integrable: true },
    quiz:       { nom: 'Quiz Valable / Faute',       ico: 'V/F', integrable: false },
    wayground:  { nom: 'Session Wayground',          ico: 'WG',  integrable: false },
    video:      { nom: 'Vidéo',                      ico: '▶',   integrable: true },
    sharepoint: { nom: 'Document SharePoint',        ico: 'SP',  integrable: false },
    lien:       { nom: 'Lien externe',               ico: '↗',   integrable: false },
  };
  const CLE_BROUILLON = 'jajj-brouillon-v1';
  /* Icônes disponibles dans assets/icones (ajouter le nom ici si on dépose une nouvelle icône) */
  /* Illustrations disponibles dans assets/etapes */
  const IMAGES_ETAPES = ["etape-1-decouvrir.webp", "etape-2-regles.webp", "etape-3-analyse.webp", "etape-4-choix-en-construction.webp", "etape-4-decide.webp", "etape-4-en-construction.webp", "etape-5-certification.webp"];
  const ICONES = ["CA1-biathlon", "CA1-biathlon-adapte", "CA1-boccia-adapte", "CA1-cens-adapte", "CA1-combine-athletique", "CA1-course-nature", "CA1-cross-training", "CA1-demi-fond", "CA1-demi-fond-adapte", "CA1-haies", "CA1-haies-adapte", "CA1-lancers", "CA1-laser-run", "CA1-marche-adapte", "CA1-natation-vitesse", "CA1-natation-vitesse-adapte", "CA1-relais", "CA1-relais-adapte", "CA1-run-bike", "CA1-sarbacane-adapte", "CA1-sauts", "CA1-sauts-adapte", "CA1-triathlon-athletique", "CA2-activites-nautiques", "CA2-biathlon-co-tir-arc", "CA2-cens-adapte", "CA2-course-orientation", "CA2-course-orientation-adapte", "CA2-escalade", "CA2-escalade-adapte", "CA2-golf", "CA2-sauvetage-aquatique", "CA2-sauvetage-aquatique-adapte", "CA2-vtt", "CA3-acrosport", "CA3-acrosport-adapte", "CA3-arts-du-cirque", "CA3-danse", "CA3-double-dutch", "CA3-gymnastique", "CA3-patinage", "CA3-step", "CA4-badminton", "CA4-badminton-adapte", "CA4-balle-roulee-adapte", "CA4-baseball-theque", "CA4-basket-ball", "CA4-basket-ball-adapte", "CA4-baskin-adapte", "CA4-boccia-adapte", "CA4-boxe-francaise", "CA4-football", "CA4-futsal", "CA4-handball", "CA4-judo", "CA4-lutte", "CA4-rugby", "CA4-tchoukball", "CA4-tennis-de-table", "CA4-ultimate", "CA4-ultimate-adapte", "CA4-volley-ball", "CA5-biathlon-longue-duree", "CA5-course-en-duree", "CA5-course-en-duree-adapte", "CA5-cross-training", "CA5-musculation", "CA5-musculation-adapte", "CA5-natation-en-duree", "CA5-ppg", "CA5-step", "CA5-step-adapte", "CA5-yoga"];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const initiales = nom => {
    const m = String(nom).replace(/[-']/g, ' ').split(/\s+/).filter(w => (w.length > 2 && !/^(and|des|les|une)$/i.test(w)) || /^[A-Z]{2,}$/.test(w));
    return (m.length > 1 ? m[0][0] + m[1][0] : String(nom).slice(0, 2)).toUpperCase();
  };

  /* Devine le type d'un lien collé */
  function typeDepuisUrl(u) {
    u = String(u || '');
    if (/wayground\.com|quizizz\.com/.test(u)) return 'wayground';
    if (/docs\.google\.com\/presentation/.test(u)) return 'slides';
    if (/docs\.google\.com\/spreadsheets/.test(u)) return 'sheet';
    if (/docs\.google\.com\/document/.test(u)) return 'doc';
    if (/sharepoint\.com|onedrive/.test(u)) return 'sharepoint';
    if (/youtube\.com|youtu\.be|vimeo\.com|peertube|tube\.|podeduc|\.mp4$/.test(u)) return 'video';
    return 'lien';
  }

  /* Adresse à mettre dans la visionneuse (null = ouvrir dans un onglet) */
  function urlIntegree(it) {
    const u = it.url || '';
    if (it.type === 'doc' && /\/pub(\?|$)/.test(u)) return u.includes('embedded=') ? u : u + (u.includes('?') ? '&' : '?') + 'embedded=true';
    if (it.type === 'slides' && /\/pub(embed)?(\?|$)/.test(u)) return u.replace('/pub?', '/pubembed?').replace(/\/pub$/, '/pubembed');
    if (it.type === 'sheet' && /\/pubhtml/.test(u)) return u + (u.includes('?') ? '&' : '?') + 'widget=true&headers=false';
    if (it.type === 'video') {
      let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
      if (m) return 'https://www.youtube-nocookie.com/embed/' + m[1];
      if (/peertube|tube\.|\/videos\/embed\//.test(u)) return u.replace('/w/', '/videos/embed/');
    }
    return null;
  }
  /* Adresse « normale » pour ouvrir le document dans un onglet */
  function urlOnglet(it) {
    const u = it.url || '';
    if (it.type === 'slides') return u.replace('/pubembed?', '/pub?');
    if (it.type === 'doc') return u.replace(/[?&]embedded=true/, '');
    return u;
  }

  function lireBrouillon() {
    try { return JSON.parse(localStorage.getItem(CLE_BROUILLON) || 'null'); } catch (e) { return null; }
  }
  const enApercu = () => new URLSearchParams(location.search).has('apercu');

  /* Ouverture du fichier en local (double-clic) : le navigateur interdit la lecture des .json,
     on charge alors data/hors-ligne.js qui contient toutes les données. */
  const horsLigne = location.protocol === 'file:';
  let paquet = null;
  function chargerPaquet() {
    if (window.JAJJ_HORS_LIGNE) return Promise.resolve(window.JAJJ_HORS_LIGNE);
    if (!paquet) paquet = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'data/hors-ligne.js';
      s.onload = () => window.JAJJ_HORS_LIGNE ? ok(window.JAJJ_HORS_LIGNE) : ko(new Error('Fichier data/hors-ligne.js vide.'));
      s.onerror = () => ko(new Error('Fichier data/hors-ligne.js introuvable : ouvre le site depuis son dossier complet.'));
      document.head.appendChild(s);
    });
    return paquet;
  }
  async function lireJson(chemin) {
    if (horsLigne) {
      const p = await chargerPaquet();
      if (chemin === 'data/data.json') return p.data;
      const id = chemin.replace(/^data\/quiz\/|\.json$/g, '');
      if (p.quiz[id]) return p.quiz[id];
      throw new Error('introuvable');
    }
    const r = await fetch(chemin, { cache: 'no-cache' });
    if (!r.ok) throw new Error('introuvable (' + r.status + ')');
    return r.json();
  }
  async function chargerDonnees() {
    if (enApercu()) { const b = lireBrouillon(); if (b && b.data) return b.data; }
    try { return await lireJson('data/data.json'); }
    catch (e) { throw new Error('Données du site illisibles : ' + e.message); }
  }
  async function chargerQuiz(id) {
    if (enApercu()) { const b = lireBrouillon(); if (b && b.quiz && b.quiz[id]) return b.quiz[id]; }
    try { return await lireJson('data/quiz/' + encodeURIComponent(id) + '.json'); }
    catch (e) { throw new Error('Quiz introuvable : ' + id); }
  }
  const nbQuestions = q => (q.themes || []).reduce((a, t) => a + (t.questions || []).length, 0);

  return { TYPES, ICONES, IMAGES_ETAPES, CLE_BROUILLON, esc, slug, initiales, typeDepuisUrl, urlIntegree, urlOnglet, lireBrouillon, enApercu, chargerDonnees, chargerQuiz, lireJson, horsLigne, nbQuestions };
})();
