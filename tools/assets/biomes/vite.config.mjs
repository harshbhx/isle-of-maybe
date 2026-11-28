// Builds the standalone biome page used for the biome shots (tools/assets/biomes.py).
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export default { root: here, build: { outDir: '/tmp/iom-biomes', emptyOutDir: true }, logLevel: 'error' };
