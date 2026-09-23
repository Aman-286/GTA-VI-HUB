import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
// Source originals are downloaded unchanged from Rockstar's official media gallery.
const source = process.argv[2];
if (!source)
  throw Error(
    "Pass the directory containing the three official JPG originals.",
  );
await mkdir("public/media", { recursive: true });
for (const name of ["vice-city-01", "jason-lucia-01", "leonida-keys-01"]) {
  for (const width of [960, 1600])
    await sharp(join(source, `${name}.jpg`))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(`public/media/${name}-${width}.webp`);
}
