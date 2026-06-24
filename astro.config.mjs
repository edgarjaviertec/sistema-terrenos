import { defineConfig } from 'astro/config';

// Salida estática: Astro genera HTML en dist/, Netlify lo sirve.
// Las Netlify Functions (netlify/functions) quedan intactas.
export default defineConfig({
  output: 'static',
  build: {
    format: 'directory'
  }
});
