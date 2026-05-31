import { setManifest } from '@angular-architects/module-federation';

fetch('assets/module-federation.manifest.json')
  .then((res) => res.json())
  .then((manifest) => setManifest(manifest))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));