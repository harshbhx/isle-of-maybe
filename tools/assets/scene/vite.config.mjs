// Builds the standalone scene page used for key art and the find GIF (tools/assets/scene.py).
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export default { root: here, build: { outDir: '/tmp/iom-scene', emptyOutDir: true }, logLevel: 'error' };
