// Dumps the shared logo and glyph shapes as JSON for tools/brand/build.py, so the brand kit draws
// exactly what the game draws (no copies of the path data to drift).
import { COMPASS_GLYPH, DOCK_GLYPH, LANDMARK_GLYPHS, X_GLYPH } from '../../src/shared/glyphs.ts';
import { LOGO_BOX, LOGO_ISLAND, LOGO_PATH, LOGO_X } from '../../src/shared/logo.ts';

process.stdout.write(
  JSON.stringify({
    logo: { box: LOGO_BOX, island: LOGO_ISLAND, path: LOGO_PATH, x: LOGO_X },
    glyphs: { ...LANDMARK_GLYPHS, x: X_GLYPH, dock: DOCK_GLYPH, compass: COMPASS_GLYPH },
  })
);
