/* Écran de connexion de l'espace gestion.
   Attention : le site est statique, ce contrôle évite les modifications accidentelles
   mais ne protège pas réellement les données. La vraie protection reste le jeton
   d'accès (GitHub / Forge) demandé au moment de publier.
   Pour ajouter un compte : calculer sha256("jajj|" + identifiant en minuscules + "|" + mot de passe)
   et ajouter l'empreinte dans la liste COMPTES. */
const JAJJ_ACCES = (() => {
  const COMPTES = {
    '856d4a2e70d89a6531d87d1d63bf011b4e7e9aefc0c6ba4ea358b9c920d78171': 'SRUNSS',
    '2c71bd2a9609b58965ee0c1c198ac5034bd3c7558d0d704cd73c63da8326d248': 'Admin',
  };
  const CLE = 'jajj-session';

  /* SHA-256 (fonctionne aussi quand la page est ouverte en double-clic) */
  function sha256(texte) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const oct = new TextEncoder().encode(texte);
    const l = oct.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(oct); m[l] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64), r = (x, y) => (x >>> y) | (x << (32 - y));
    for (let i = 0; i < n; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) { const s0 = r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10); w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0; }
      let [a, b, c, d, e, f, g, k] = h;
      for (let t = 0; t < 64; t++) {
        const t1 = (k + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = h.map((v, j) => (v + [a, b, c, d, e, f, g, k][j]) | 0);
    }
    return h.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  function connecte() { try { return sessionStorage.getItem(CLE); } catch (e) { return null; } }

  function attendre() {
    return new Promise(ok => {
      if (connecte()) { majBadge(); return ok(connecte()); }
      document.body.classList.add('verrouille');
      const fond = document.createElement('div');
      fond.className = 'acces';
      fond.innerHTML = `<form class="acces-boite" autocomplete="off">
        <img src="assets/logo-unss-nantes.png" alt="UNSS Académie de Nantes">
        <h1>Espace gestion</h1>
        <p>Formations Jeune Juge / Jeune Arbitre</p>
        <label for="acc-id">Identifiant</label><input id="acc-id" autocapitalize="off" spellcheck="false" required>
        <label for="acc-mdp">Mot de passe</label><input id="acc-mdp" type="password" required>
        <p class="acces-err" role="alert"></p>
        <button class="btn prim" type="submit">Se connecter</button>
        <a href="index.html">← Retour au site</a>
      </form>`;
      document.body.appendChild(fond);
      fond.querySelector('#acc-id').focus();
      fond.querySelector('form').addEventListener('submit', e => {
        e.preventDefault();
        const id = fond.querySelector('#acc-id').value.trim().toLowerCase();
        const mdp = fond.querySelector('#acc-mdp').value;
        const nom = COMPTES[sha256('jajj|' + id + '|' + mdp)];
        if (!nom) { fond.querySelector('.acces-err').textContent = 'Identifiant ou mot de passe incorrect.'; fond.querySelector('#acc-mdp').select(); return; }
        try { sessionStorage.setItem(CLE, nom); } catch (err) {}
        fond.remove(); document.body.classList.remove('verrouille'); majBadge(); ok(nom);
      });
    });
  }
  function majBadge() {
    const nav = document.querySelector('.a-actions'); if (!nav || nav.querySelector('.deco')) return;
    const b = document.createElement('button'); b.className = 'btn petit deco'; b.textContent = 'Déconnexion (' + connecte() + ')';
    b.onclick = () => { try { sessionStorage.removeItem(CLE); } catch (e) {} location.reload(); };
    nav.appendChild(b);
  }
  return { attendre, sha256 };
})();
