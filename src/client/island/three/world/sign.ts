// The carved dock sign (ADV-6.3): the island's name, and the redditor who named it.
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

const board = (
  title: string,
  by: string | null,
  font: string
): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  if (g !== null) {
    g.fillStyle = '#9A6B3C';
    g.fillRect(0, 0, 512, 256);
    // Planks and grain.
    g.strokeStyle = 'rgba(58,36,18,0.45)';
    g.lineWidth = 4;
    for (const y of [85, 170]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(512, y);
      g.stroke();
    }
    g.fillStyle = '#F6E7C4';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 64;
    g.font = `900 ${size}px ${font}`;
    while (g.measureText(title).width > 460 && size > 28) {
      size -= 2;
      g.font = `900 ${size}px ${font}`;
    }
    g.fillText(title, 256, by === null ? 128 : 100);
    if (by !== null) {
      g.font = `700 34px ${font}`;
      g.fillText(by, 256, 190);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

export const createSign = (
  title: string,
  by: string | null,
  font: string
): Group => {
  const g = new Group();
  const wood = new MeshLambertMaterial({ color: 0x6a4a2c });
  for (const x of [-0.42, 0.42]) {
    const post = new Mesh(new CylinderGeometry(0.045, 0.055, 1.2, 6), wood);
    post.position.set(x, 0.6, 0);
    post.castShadow = true;
    g.add(post);
  }
  const back = new Mesh(new BoxGeometry(1.08, 0.56, 0.05), wood);
  back.position.set(0, 0.95, -0.03);
  back.castShadow = true;
  const face = new Mesh(
    new PlaneGeometry(1.02, 0.5),
    new MeshBasicMaterial({ map: board(title, by, font) })
  );
  face.position.set(0, 0.95, 0.001);
  g.add(back, face);
  return g;
};
