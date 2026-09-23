# Official GTA VI media

Source: [Rockstar Games GTA VI screenshot gallery](https://www.rockstargames.com/VI/media/screenshots). Copyright Rockstar Games. These are official promotional screenshots, not fan art or invented game scenes. This companion remains unofficial. No open-source license is claimed for these images.

Downloaded and inspected September 8, 2026:

| Local asset stem | Official image | Direct source |
| --- | --- | --- |
| vice-city-01 | Vice City 01 | https://www.rockstargames.com/VI/_next/static/media/Vice_City_01.135x56yoeu.6t.jpg?akim=1&imdensity=1&imwidth=3840 |
| jason-lucia-01 | Jason and Lucia 01 | https://www.rockstargames.com/VI/_next/static/media/Jason_and_Lucia_01.0naeahss9-1x6.jpg?akim=1&imdensity=1&imwidth=3840 |
| leonida-keys-01 | Leonida Keys 01 | https://www.rockstargames.com/VI/_next/static/media/Leonida_Keys_01.0zgz7tveur6y8.jpg?akim=1&imdensity=1&imwidth=3840 |

`scripts/prepare-official-media.mjs <originals-directory>` resizes the original JPGs to 960 and 1600 pixels wide and encodes WebP quality 84. No subjects or scene content were changed. Assets live in `public/media`. The hero uses the 1600-wide Vice City image; cards use 960-wide images; banners use 1600-wide images. Each file is approximately 49–205 KB. Cards and banners are lazy loaded. CSS crops to the display aspect ratio. Attribution and an official gallery link appear on the homepage and each banner.

The fictional map schematic is separate from the official screenshots. Promotional imagery does not verify the app's DEMO missions, locations, vehicles, or other sample records.
