/* Site public : accueil, parcours par activité, quiz Valable / Faute */
(() => {
  const { esc, initiales, TYPES, urlIntegree, urlOnglet } = JAJJ;
  const app = document.getElementById('app');
  let DATA = null;
  const COUL = ['', 'e1', 'e2', 'e3', 'e4', 'e5'];


  const SVG_MAISON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>';
  const SVG_RETOUR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  let profondeur = 0;
  function construireEntete() {
    document.getElementById('entete').innerHTML = `
      <div class="entete-in">
        <div class="banniere">
          <img src="assets/bandeau.webp" srcset="assets/bandeau-1024.webp 1024w, assets/bandeau.webp 2048w" sizes="(max-width: 900px) 100vw, 75vw" alt="Jeunes juges et jeunes arbitres UNSS — Académie de Nantes" fetchpriority="high">
          <nav class="ban-nav" aria-label="Navigation">
            <button type="button" class="nb-retour" id="nav-retour" aria-label="Revenir à la page précédente" title="Revenir en arrière">${SVG_RETOUR}</button>
            <a class="nb-home" href="#/" aria-label="Accueil" title="Accueil">${SVG_MAISON}<span>Accueil</span></a>
            <a class="nb-gestion" href="admin.html">Gestion</a>
          </nav>
        </div>
        <aside class="postit" id="postit" hidden aria-label="Note du SR"><b class="postit-titre">Note du SR</b><div class="postit-txt" id="postit-txt"></div></aside>
      </div>`;
    document.getElementById('nav-retour').addEventListener('click', () => {
      if (profondeur > 1) { history.back(); return; }
      const h = location.hash.replace(/^#\/?/, '').split('/');
      if (h[0] === 'q' && DATA) {
        const s = DATA.sports.find(x => [...DATA.etapes].some(e => (x[e.cle] || []).some(it => it.quiz === h[1])));
        const e = s && DATA.etapes.find(e => (s[e.cle] || []).some(it => it.quiz === h[1]));
        location.hash = s ? `#/s/${s.id}${e ? '/' + e.cle : ''}` : '#/';
      } else if (h[0] === 's' && h[2]) location.hash = '#/s/' + h[1];
      else location.hash = '#/';
    });
  }
  function texteNote(t) {
    return esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }
  function majNote(cle) {
    const notes = DATA.notes || {};
    const t = (notes[cle] || '').trim() || (notes.defaut || '').trim();
    const p = document.getElementById('postit');
    p.hidden = !t;
    document.getElementById('entete').classList.toggle('avec-note', !!t);
    if (t) document.getElementById('postit-txt').innerHTML = texteNote(t);
  }

  const icone = s => JAJJ.cheminIcone(s.icone);
  const { Progres } = JAJJ;
  const refItem = (cle, it) => cle + ':' + (it.url || it.titre);
  /* Contenu d'une étape, avec la « certification blanche » ajoutée automatiquement à l'étape 5 */
  const quizDuSport = s => [...new Set(DATA.etapes.flatMap(e => (s[e.cle] || []).filter(it => it.type === 'quiz' && it.quiz).map(it => it.quiz)))];
  function itemsDe(s, cle) {
    const items = s[cle] || [];
    const c = DATA.certification || {};
    if (cle === 'certification' && c.actif !== false && quizDuSport(s).length)
      /* les sessions Wayground expirent : elles sont remplacées par l'examen interne (sauf si on choisit de les garder) */
      return [{ type: 'certif', titre: 'Certification blanche', virtuel: true }, ...(c.garderWayground ? items : items.filter(it => it.type !== 'wayground'))];
    return items;
  }
  const imgIcone = (s, cls = '') => s.icone ? `<img class="${cls}" src="${icone(s)}" alt="" loading="lazy">` : `<span class="ini ${cls}" aria-hidden="true">${esc(initiales(s.nom))}</span>`;

  /* ---------- Accueil ---------- */
  function accueil() {
    document.title = DATA.titre;
    document.body.classList.add('accueil');
    majNote('accueil');
    const tri = [...DATA.sports].sort((a, b) => (a.actif === false) - (b.actif === false) || a.nom.localeCompare(b.nom, 'fr'));
    app.innerHTML = `
      <div class="hero-ligne">
        <h1>${esc(DATA.titre)}</h1>
        <label class="sr" for="cherche">Rechercher une activité</label>
        <input id="cherche" class="recherche" type="search" placeholder="Rechercher une activité…" autocomplete="off">
      </div>
      <div class="grille tuiles" id="grille">
        ${tri.map(s => tuile(s)).join('')}
      </div>`;
    const champ = document.getElementById('cherche');
    champ.addEventListener('input', () => {
      const v = JAJJ.slug(champ.value);
      document.querySelectorAll('#grille .tuile').forEach(c => { c.hidden = v && !c.dataset.cle.includes(v); });
    });
  }
  function tuile(s) {
    const actif = s.actif !== false;
    const pct = actif ? Progres.avancement(s, DATA.etapes) : 0;
    const inner = `${imgIcone(s)}<b>${esc(s.nom)}</b>${actif ? '' : '<span class="bientot">Bientôt</span>'}${pct ? `<span class="avance" title="Ta progression : ${pct} %" aria-label="Ta progression : ${pct} %"><i style="width:${pct}%"></i></span>` : ''}`;
    return actif
      ? `<a class="tuile" href="#/s/${esc(s.id)}" data-cle="${esc(JAJJ.slug(s.nom))}">${inner}</a>`
      : `<div class="tuile inactif" data-cle="${esc(JAJJ.slug(s.nom))}" aria-disabled="true" title="Bientôt disponible">${inner}</div>`;
  }

  /* ---------- Page d'une activité : mise en page d'origine (5 images) ---------- */
  function pageSport(id) {
    const s = DATA.sports.find(x => x.id === id);
    if (!s) return introuvable();
    document.title = s.nom + ' — ' + DATA.titre;
    const E = DATA.etapes;
    const img = e => {
      const items = itemsDe(s, e.cle);
      const n = items.length;
      const vus = items.filter(it => it.type === 'quiz' ? Progres.meilleur(it.quiz) : it.type === 'certif' ? Progres.meilleureCertif(s.id) : Progres.estVu(s.id, refItem(e.cle, it))).length;
      const label = n ? (e.cle === 'videos' ? (n === 1 ? '1 vidéo' : n + ' vidéos') : n === 1 ? '1 ressource' : n + ' ressources') : 'Bientôt';
      const direct = n === 1 && items[0].type !== 'quiz' && urlIntegree(items[0]);
      const href = !n ? '' : direct ? '' : `href="#/s/${esc(s.id)}/${e.cle}"`;
      const tag = n && !direct ? 'a' : 'button';
      return `<${tag} class="etape-img n${e.num}${n ? '' : ' vide'}" ${href} ${direct ? `data-direct="${e.cle}"` : ''} ${!n ? 'aria-disabled="true" disabled style="border:0;padding:0;cursor:default"' : tag === 'button' ? 'style="border:0;padding:0;cursor:pointer"' : ''} aria-label="Étape ${e.num} : ${esc(e.titre)} (${label})">
        <img src="${esc((!n && e.imageVide) || e.image || '')}" alt="Étape ${e.num} — ${esc(e.titre)}"${!n && e.imageVide ? ' style="filter:none;opacity:1"' : ''}>${!n && e.imageVide ? '' : `<span class="nb">${label}</span>`}${n && vus === n ? '<span class="coche" title="Étape terminée">✓</span>' : n && vus ? `<span class="coche partiel" title="${vus} sur ${n} déjà vus">${vus}/${n}</span>` : ''}</${tag}>`;
    };
    const visibles = E.filter(e => !e.optionnelle || itemsDe(s, e.cle).length);
    const six = visibles.length > 5;
    const titre = `<div class="titre-hub"><img class="logo-hub" src="assets/logo-unss-nantes.png" alt="UNSS Académie de Nantes"><div class="nom-sport">${s.icone ? `<img src="${icone(s)}" alt="">` : ''}<h1>${esc(s.nom)}</h1></div></div>`;
    majNote('s/' + s.id);
    reserver(quizDuSport(s).map(q => 'data/quiz/' + encodeURIComponent(q) + '.json'));
    app.innerHTML = `
      <p class="fil"><a href="#/">Activités</a> › ${esc(s.nom)}</p>
      <div class="cadre-sport"><div class="hub ${six ? 'hub-6' : 'hub-5'}">
        ${six
          ? visibles.slice(0, 4).map(img).join('') + titre + visibles.slice(4).map(img).join('')
          : visibles.map(img).join('') + titre}
      </div></div>`;
    app.querySelectorAll('[data-direct]').forEach(b => b.addEventListener('click', () => { const it = s[b.dataset.direct][0]; Progres.vu(s.id, refItem(b.dataset.direct, it)); ouvrir(it); }));
  }

  /* ---------- Page d'une étape ---------- */
  function pageEtape(id, cle) {
    const s = DATA.sports.find(x => x.id === id);
    const e = DATA.etapes.find(x => x.cle === cle);
    if (!s || !e) return introuvable();
    document.title = e.titre + ' — ' + s.nom;
    majNote('s/' + s.id + '/' + cle);
    const items = itemsDe(s, cle);
    let html = '', groupe = null;
    items.forEach((it, i) => {
      if ((it.groupe || null) !== groupe) { groupe = it.groupe || null; if (groupe) html += `<li class="groupe-titre">${esc(groupe)}</li>`; }
      html += `<li>${bouton(it, cle, i, s)}</li>`;
    });
    const autres = DATA.etapes.filter(x => x.cle !== cle && itemsDe(s, x.cle).length);
    app.innerHTML = `
      <p class="fil"><a href="#/">Activités</a> › <a href="#/s/${esc(s.id)}">${esc(s.nom)}</a> › ${esc(e.titre)}</p>
      <div class="tete-etape" style="--c:var(--e${e.num})">
        ${e.image ? `<img class="ill" src="${esc(e.image)}" alt="">` : ''}
        <div style="flex:1"><h1>${esc(e.titre)}</h1><p>${esc(s.nom)}${e.desc ? ' — ' + esc(e.desc) : ''}</p></div>
        ${s.icone ? `<img class="icone-sport" src="${icone(s)}" alt="">` : ''}
      </div>
      <section class="etape" style="--c:var(--e${e.num})">
        ${items.length ? `<ul class="items" style="padding-top:14px">${html}</ul>` : '<p class="vide" style="padding-top:16px">Contenu en préparation.</p>'}
      </section>
      <nav class="nav-etapes" aria-label="Autres étapes">
        ${autres.map(x => `<a class="btn-etape e${x.num}" href="#/s/${esc(s.id)}/${x.cle}">${x.image ? `<img src="${esc(x.image)}" alt="">` : ''}<span><small>${x.optionnelle ? 'Vidéos' : 'Étape ' + x.num}</small>${esc(x.titre)}</span></a>`).join('')}
      </nav>
      <a class="btn-retour" href="#/s/${esc(s.id)}"><span class="fleche" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></span>Retour au parcours ${esc(s.nom)}</a>`;
    app.querySelectorAll('[data-ref]').forEach(b => b.addEventListener('click', () => { Progres.vu(s.id, b.dataset.ref); b.classList.add('fait'); }));
    app.querySelectorAll('[data-ouvrir]').forEach(b => b.addEventListener('click', () => {
      const [k, i] = b.dataset.ouvrir.split(':');
      ouvrir(itemsDe(s, k)[+i]);
    }));
  }
  const SVG = {
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 12h6M10 15.5h6M10 19h4"/>',
    slides: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10 8.5l4 1.8-4 1.8z"/>',
    sheet: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 10h16M4 15h16M10 4v16"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16.5 9"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9v6l5-3z" fill="currentColor"/>',
    wayground: '<path d="M7 8h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L14 13h-4l-1.6 1.8A3 3 0 0 1 3 13v-1a4 4 0 0 1 4-4z"/><path d="M7.5 10.5v3M6 12h3M15.5 11.5h.01M17.5 13h.01"/>',
    sharepoint: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    lien: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  const icoSvg = type => `<span class="ico ${esc(type)}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[type] || SVG.lien}</svg></span>`;
  function bouton(it, cle, i, s) {
    const t = TYPES[it.type] || { nom: 'Examen blanc' };
    if (it.type === 'certif') {
      const c = DATA.certification || {}, m = Progres.meilleureCertif(s.id);
      return `<a class="item certif${m && m.reussi ? ' fait' : ''}" href="#/c/${esc(s.id)}"><span class="ico certif" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M9 14.5L7.5 22 12 19.5 16.5 22 15 14.5"/><path d="M9.5 9l1.7 1.7L14.7 7.3"/></svg></span><span class="t">Certification blanche<small>${c.questions || 30} questions · ${c.minutes || 20} min · réussite à ${c.seuil || 80} %</small></span>${m ? `<span class="score-item">${m.pct} %</span>` : ''}</a>`;
    }
    const ico = icoSvg(it.type);
    const ref = refItem(cle, it);
    if (it.type === 'quiz') {
      const m = Progres.meilleur(it.quiz);
      return `<a class="item${m ? ' fait' : ''}" href="#/q/${esc(it.quiz)}">${ico}<span class="t">${esc(it.titre)}</span><span class="sr">(${esc(t.nom)})</span>${m ? `<span class="score-item" title="Ton meilleur score">${m.ok}/${m.total}</span>` : ''}</a>`;
    }
    const fait = Progres.estVu(s.id, ref) ? ' fait' : '';
    const txt = `<span class="t">${esc(it.titre)}</span><span class="sr">(${esc(t.nom)})</span>`;
    if (urlIntegree(it)) return `<button class="item${fait}" data-ouvrir="${cle}:${i}" data-ref="${esc(ref)}">${ico}${txt}<span class="vu" aria-hidden="true">✓</span></button>`;
    return `<a class="item${fait}" href="${esc(urlOnglet(it))}" target="_blank" rel="noopener" data-ref="${esc(ref)}">${ico}${txt}<span class="vu" aria-hidden="true">✓</span><span class="ext" aria-hidden="true">↗</span><span class="sr">(nouvel onglet)</span></a>`;
  }

  /* ---------- Visionneuse ---------- */
  const dlg = document.getElementById('vision');
  const cadre = document.getElementById('vision-cadre');
  function ouvrir(it) {
    document.getElementById('vision-titre').textContent = it.titre;
    document.getElementById('vision-ext').href = urlOnglet(it);
    cadre.src = urlIntegree(it);
    cadre.title = it.titre;
    dlg.showModal();
  }
  document.getElementById('vision-fermer').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { cadre.src = 'about:blank'; });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  /* ---------- Quiz ---------- */
  async function pageQuiz(id) {
    app.innerHTML = '<p>Chargement du quiz…</p>';
    let q;
    try { q = await JAJJ.chargerQuiz(id); } catch (e) { return introuvable(); }
    const s = DATA.sports.find(x => x.id === q.sport);
    const et = s && DATA.etapes.find(e => (s[e.cle] || []).some(it => it.quiz === q.id));
    const lienEtape = s && et ? `#/s/${s.id}/${et.cle}` : s ? `#/s/${s.id}` : '#/';
    document.title = q.titre + ' — Quiz';
    majNote((DATA.notes || {})['q/' + q.id] ? 'q/' + q.id : s && et ? 's/' + s.id + '/' + et.cle : 'q/' + q.id);
    const etat = { melange: false, extrait: 0 };

    function construire() {
      let themes = q.themes.map(t => ({ nom: t.nom, questions: t.questions.slice() }));
      if (etat.melange || etat.extrait) {
        let toutes = themes.flatMap(t => t.questions);
        for (let i = toutes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [toutes[i], toutes[j]] = [toutes[j], toutes[i]]; }
        if (etat.extrait) toutes = toutes.slice(0, etat.extrait);
        themes = [{ nom: '', questions: toutes }];
      }
      const total = themes.reduce((a, t) => a + t.questions.length, 0);
      let n = 0;
      app.innerHTML = `
        <p class="fil"><a href="#/">Activités</a> › ${s ? `<a href="#/s/${esc(s.id)}">${esc(s.nom)}</a> › ` : ''}${et ? `<a href="${esc(lienEtape)}">${esc(et.titre)}</a> › ` : ''}Quiz</p>
        <div class="quiz-tete">
          ${q.entete ? `<div class="sur">${esc(q.entete)}</div>` : ''}
          <h1>${esc(q.titre)}</h1>
          <p>${esc(q.sousTitre || '')}${q.sousTitre ? ' · ' : ''}${total} situations à juger : <b>Valable</b> ou <b>Faute</b> ?</p>
          <div class="options-quiz">
            <button class="btn petit" data-opt="ordre">Ordre d'origine</button>
            <button class="btn petit" data-opt="melange">Mélanger</button>
            <button class="btn petit" data-opt="10">10 questions au hasard</button>
            <button class="btn petit" data-opt="20">20 questions au hasard</button>
          </div>
        </div>
        <div class="score" role="status" aria-live="polite">
          <span>Répondu : <b id="sc-rep">0</b>/<b>${total}</b></span>
          <div class="barre" aria-hidden="true"><i id="sc-barre"></i></div>
          <span>Bonnes réponses : <b id="sc-ok">0</b></span>
        </div>
        <div id="questions">
          ${themes.map(t => `${t.nom ? `<h2 class="theme-titre">${esc(t.nom)}</h2>` : ''}${t.questions.map(x => carteQ(x, ++n)).join('')}`).join('')}
        </div>
        <div id="bilan"></div>`;
      let rep = 0, ok = 0;
      app.querySelectorAll('.q').forEach(c => {
        c.querySelectorAll('.choix button').forEach(b => b.addEventListener('click', () => {
          const bonne = c.dataset.r, choisi = b.dataset.r, juste = bonne === choisi;
          c.querySelectorAll('.choix button').forEach(x => { x.disabled = true; });
          b.classList.add('pris');
          c.classList.add(juste ? 'juste' : 'faux');
          const e = c.dataset.e;
          c.insertAdjacentHTML('beforeend', `<div class="retour"><b>${juste ? '✔ Bonne réponse' : '✘ Réponse incorrecte'} — c'est « ${bonne === 'valable' ? 'Valable' : 'Faute'} ».</b>${esc(e)}</div>`);
          rep++; if (juste) ok++;
          document.getElementById('sc-rep').textContent = rep;
          document.getElementById('sc-ok').textContent = ok;
          document.getElementById('sc-barre').style.width = (rep / total * 100) + '%';
          if (rep === total) bilan(ok, total);
        }));
      });
      app.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => {
        const o = b.dataset.opt;
        etat.melange = o === 'melange'; etat.extrait = /^\d+$/.test(o) ? +o : 0;
        construire(); window.scrollTo({ top: 0, behavior: 'smooth' });
      }));
    }
    function carteQ(x, n) {
      return `<article class="q" data-r="${esc(x.r)}" data-e="${esc(x.e || '')}">
        <span class="num">${String(n).padStart(2, '0')}</span>
        <p>${esc(x.q)}</p>
        <div class="choix"><button data-r="valable">Valable</button><button data-r="faute">Faute</button></div>
      </article>`;
    }
    function bilan(ok, total) {
      const pct = Math.round(ok / total * 100);
      Progres.scoreQuiz(q.id, ok, total);
      const msg = pct >= 90 ? 'Excellent ! Tu maîtrises le règlement.' : pct >= 70 ? 'Très bien ! Encore quelques détails à revoir.' : pct >= 50 ? 'Pas mal : relis les fiches pour progresser.' : 'Reprends les fiches de l\'étape 2 avant de recommencer.';
      document.getElementById('bilan').innerHTML = `<div class="bilan"><div class="gros">${ok}/${total}</div><p>${pct} % de bonnes réponses — ${msg}</p>
        <div class="options-quiz" style="justify-content:center"><button class="btn prim" id="refaire">Recommencer</button><a class="btn" href="${esc(lienEtape)}">Retour aux quiz</a></div></div>`;
      document.getElementById('refaire').addEventListener('click', () => { construire(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      document.getElementById('bilan').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    construire();
  }

  /* ---------- Certification blanche (examen d'entraînement) ---------- */
  async function pageCertif(id) {
    const s = DATA.sports.find(x => x.id === id);
    if (!s) return introuvable();
    const c = Object.assign({ questions: 30, minutes: 20, seuil: 80 }, DATA.certification || {});
    majNote('s/' + s.id + '/certification');
    document.title = 'Certification blanche — ' + s.nom;
    app.innerHTML = '<p>Préparation de l\'examen…</p>';
    const quiz = (await Promise.all(quizDuSport(s).map(q => JAJJ.chargerQuiz(q).catch(() => null)))).filter(Boolean);
    let pool = quiz.flatMap(q => q.themes.flatMap(t => t.questions.filter(x => x.q && x.q.trim()).map(x => ({ ...x, src: q.titre }))));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const qs = pool.slice(0, Math.min(c.questions, pool.length));
    if (!qs.length) return introuvable();
    let fin = Date.now() + c.minutes * 60000, minuteur = null, termine = false;
    const fil = `<p class="fil"><a href="#/">Activités</a> › <a href="#/s/${esc(s.id)}">${esc(s.nom)}</a> › <a href="#/s/${esc(s.id)}/certification">Certification</a> › Certification blanche</p>`;
    app.innerHTML = `${fil}
      <div class="quiz-tete examen">
        <div class="sur">Certification blanche · ${esc(s.nom)}</div>
        <h1>Examen d'entraînement</h1>
        <p>${qs.length} situations tirées au hasard dans les quiz de l'activité. Réponds à tout, puis clique sur « Terminer » : la correction s'affiche à la fin. Réussite à partir de <b>${c.seuil} %</b>.</p>
      </div>
      <div class="score examen-barre" role="status">
        <span>⏱ <b id="chrono">${String(c.minutes).padStart(2, '0')}:00</b></span>
        <div class="barre" aria-hidden="true"><i id="ex-barre"></i></div>
        <span>Répondu : <b id="ex-rep">0</b>/${qs.length}</span>
        <button class="btn prim petit" id="ex-fin">Terminer</button>
      </div>
      <form id="examen">${qs.map((x, i) => `<fieldset class="q" data-i="${i}"><legend class="num">${String(i + 1).padStart(2, '0')}</legend><p>${esc(x.q)}</p>
        <div class="choix choix-radio"><label><input type="radio" name="q${i}" value="valable"><span>Valable</span></label><label><input type="radio" name="q${i}" value="faute"><span>Faute</span></label></div></fieldset>`).join('')}</form>
      <div id="bilan"></div>`;
    const form = document.getElementById('examen');
    form.addEventListener('change', () => {
      const n = qs.filter((x, i) => form['q' + i].value).length;
      document.getElementById('ex-rep').textContent = n;
      document.getElementById('ex-barre').style.width = (n / qs.length * 100) + '%';
    });
    const tic = () => {
      if (!document.getElementById('chrono')) return clearInterval(minuteur);
      const r = Math.max(0, fin - Date.now()), m = Math.floor(r / 60000), sec = Math.floor(r / 1000) % 60;
      document.getElementById('chrono').textContent = String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
      if (r < 60000) document.querySelector('.examen-barre').classList.add('urgent');
      if (!r) terminer(true);
    };
    minuteur = setInterval(tic, 1000);
    document.getElementById('ex-fin').addEventListener('click', () => {
      const manque = qs.filter((x, i) => !form['q' + i].value).length;
      if (manque && !confirm(manque + ' question(s) sans réponse. Terminer quand même ?')) return;
      terminer(false);
    });
    function terminer(tempsEcoule) {
      if (termine) return; termine = true; clearInterval(minuteur);
      let ok = 0;
      qs.forEach((x, i) => {
        const v = form['q' + i].value, juste = v === x.r, fs = form.querySelector(`[data-i="${i}"]`);
        if (juste) ok++;
        fs.classList.add(juste ? 'juste' : 'faux'); fs.disabled = true;
        fs.insertAdjacentHTML('beforeend', `<div class="retour"><b>${juste ? '✔ Bonne réponse' : v ? '✘ Réponse incorrecte' : '— Sans réponse'} — c'est « ${x.r === 'valable' ? 'Valable' : 'Faute'} ».</b>${esc(x.e || '')}</div>`);
      });
      const pct = Math.round(ok / qs.length * 100), reussi = pct >= c.seuil;
      const duree = Math.round((c.minutes * 60000 - Math.max(0, fin - Date.now())) / 60000);
      Progres.certif(s.id, { pct, ok, total: qs.length, reussi, date: Date.now() });
      document.getElementById('ex-fin').remove();
      document.getElementById('bilan').innerHTML = `<div class="bilan ${reussi ? 'ok' : 'ko'}">
        <div class="gros">${ok}/${qs.length} · ${pct} %</div>
        <p>${tempsEcoule ? 'Temps écoulé. ' : ''}${reussi ? '🎉 Bravo, tu as atteint le niveau attendu pour la certification !' : `Il faut ${c.seuil} % pour réussir : revois les quiz de l'étape 3 et retente ta chance.`}</p>
        ${reussi ? `<div class="attest-form"><label>Ton nom et prénom <input id="at-nom" autocomplete="name"></label><label>Ton établissement <input id="at-etab"></label><button class="btn prim" id="at-btn">Imprimer mon attestation</button></div>` : ''}
        <div class="options-quiz" style="justify-content:center"><a class="btn" href="#/c/${esc(s.id)}" id="ex-refaire">Nouvel examen</a><a class="btn" href="#/s/${esc(s.id)}/analyse">Revoir les quiz</a></div></div>
        <div id="attestation" class="attestation" hidden></div>`;
      document.getElementById('ex-refaire').addEventListener('click', e => { e.preventDefault(); pageCertif(id); window.scrollTo(0, 0); });
      document.getElementById('at-btn')?.addEventListener('click', () => {
        const nom = document.getElementById('at-nom').value.trim();
        if (!nom) return document.getElementById('at-nom').focus();
        const at = document.getElementById('attestation');
        at.innerHTML = `<img src="assets/logo-unss-nantes.png" alt="UNSS Académie de Nantes">
          <h2>Attestation d'entraînement</h2>
          <p class="at-sport">${s.icone ? `<img src="${icone(s)}" alt="">` : ''}${esc(s.nom)}</p>
          <p><b>${esc(nom)}</b>${document.getElementById('at-etab').value.trim() ? ' — ' + esc(document.getElementById('at-etab').value.trim()) : ''}</p>
          <p>a réussi la certification blanche Jeune Officiel avec <b>${ok}/${qs.length} (${pct} %)</b> en ${duree} min,<br>le ${new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.</p>
          <p class="at-note">Document d'entraînement, généré par l'élève : il ne remplace pas la certification officielle UNSS.</p>`;
        at.hidden = false;
        document.body.classList.add('impression');
        window.addEventListener('afterprint', () => document.body.classList.remove('impression'), { once: true });
        window.print();
      });
      document.getElementById('bilan').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ---------- Mentions légales et crédits ---------- */
  function pageMentions() {
    majNote('mentions');
    document.title = 'Mentions légales — ' + DATA.titre;
    const m = DATA.mentions || {};
    const bloc = (t, v) => v ? `<h2>${esc(t)}</h2><p>${texteNote(v)}</p>` : '';
    app.innerHTML = `<p class="fil"><a href="#/">Activités</a> › Mentions légales et crédits</p>
      <article class="page-texte">
        <h1>Mentions légales et crédits</h1>
        ${bloc('Éditeur', m.editeur)}${bloc('Conception des contenus', m.auteurs)}${bloc('Réalisation du site', m.realisation)}
        ${bloc('Hébergement', m.hebergement)}${bloc('Licence', m.licence)}${bloc('Contact', m.contact || DATA.contact)}
        <h2>Données personnelles</h2>
        <p>Ce site ne demande aucun compte et ne collecte aucune donnée personnelle. Ta progression (étapes vues, scores aux quiz, certification blanche) est enregistrée uniquement dans ton navigateur, sur ton appareil : personne d'autre n'y a accès.${DATA.stats && DATA.stats.url ? ' Une mesure d\'audience anonyme, sans cookie, permet de savoir quelles pages sont consultées.' : ' Aucun cookie n\'est déposé.'}</p>
        <p><button class="btn" id="raz">Effacer ma progression sur cet appareil</button></p>
        ${bloc('Accessibilité', m.accessibilite)}
        <h2>Les icônes et illustrations</h2><p>${texteNote(m.illustrations || 'Illustrations et icônes réalisées pour ce site.')}</p>
      </article>`;
    document.getElementById('raz').addEventListener('click', () => { if (confirm('Effacer toute ta progression sur cet appareil ?')) { Progres.effacer(); alert('Progression effacée.'); } });
  }

  function introuvable() {
    majNote('');
    app.innerHTML = `<p class="fil"><a href="#/">Activités</a></p><h1>Page introuvable</h1><p>Ce contenu n'existe pas ou a été déplacé.</p><p><a class="btn prim" href="#/">Revenir aux activités</a></p>`;
  }

  /* ---------- Routeur ---------- */
  function route() {
    profondeur++;
    if (dlg.open) dlg.close();
    const h = location.hash.replace(/^#\/?/, '').split('/');
    document.body.classList.remove('accueil');
    if (h[0] === 's' && h[1] && h[2]) pageEtape(decodeURIComponent(h[1]), h[2]);
    else if (h[0] === 's' && h[1]) pageSport(decodeURIComponent(h[1]));
    else if (h[0] === 'q' && h[1]) pageQuiz(decodeURIComponent(h[1]));
    else if (h[0] === 'c' && h[1]) pageCertif(decodeURIComponent(h[1]));
    else if (h[0] === 'mentions') pageMentions();
    else accueil();
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* Mesure d'audience Matomo, sans cookie (seulement si elle est configurée dans l'espace gestion) */
  function statistiques(st) {
    if (!st || !st.url || !st.site || JAJJ.horsLigne || JAJJ.enApercu()) return;
    const u = st.url.replace(/\/?$/, '/');
    const _paq = window._paq = window._paq || [];
    _paq.push(['disableCookies'], ['setTrackerUrl', u + 'matomo.php'], ['setSiteId', String(st.site)], ['enableLinkTracking']);
    const suivre = () => _paq.push(['setCustomUrl', location.href], ['setDocumentTitle', document.title], ['trackPageView']);
    window.addEventListener('hashchange', () => setTimeout(suivre, 300));
    setTimeout(suivre, 300);
    const sc = document.createElement('script'); sc.async = true; sc.src = u + 'matomo.js'; document.head.appendChild(sc);
  }

  /* Application installable et consultable hors connexion */
  const avecSW = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !JAJJ.enApercu();
  if (avecSW) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  /* met en réserve des fichiers pour la consultation sans connexion */
  function reserver(urls) {
    if (!avecSW || !urls.length) return;
    navigator.serviceWorker.ready.then(r => r.active && r.active.postMessage({ type: 'reserve', urls })).catch(() => {});
  }

  document.querySelector('.evitement')?.addEventListener('click', e => { e.preventDefault(); app.focus(); });

  JAJJ.chargerDonnees().then(d => {
    DATA = d;
    construireEntete();
    const lic = (d.mentions || {}).licenceCourte;
    document.getElementById('pied').innerHTML = `<a href="#/mentions">Mentions légales et crédits</a>${lic ? ' · ' + esc(lic) : ''}${d.maj ? ' · Mise à jour : ' + esc(new Date(d.maj).toLocaleDateString('fr-FR')) : ''}`;
    statistiques(d.stats);
    reserver([...new Set([...d.etapes.map(e => e.image).filter(Boolean), ...d.sports.filter(s => s.actif !== false && s.icone).map(s => JAJJ.cheminIcone(s.icone))])]);
    if (JAJJ.enApercu()) document.getElementById('bandeau').innerHTML = '<div class="apercu">Aperçu des modifications non publiées — <a href="index.html">voir le site publié</a></div>';
    window.addEventListener('hashchange', route);
    route();
  }).catch(e => { app.innerHTML = `<h1>Erreur de chargement</h1><p>${esc(e.message)}</p>`; });
})();
