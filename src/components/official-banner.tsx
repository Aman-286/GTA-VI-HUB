import Image from "next/image";
export function OfficialBanner({ kind }: { kind: string }) {
  const characters = ["characters", "missions"].includes(kind);
  const name = characters ? "jason-lucia-01" : "leonida-keys-01";
  return (
    <figure className="official-banner">
      <Image
        src={`/media/${name}-1600.webp`}
        width={1600}
        height={900}
        unoptimized
        /* Sits near the top of every listing it appears on and is reliably the
           largest paint there, so it is fetched with the document rather than
           lazily after layout. */
        priority
        alt={
          characters
            ? "Jason and Lucia by the waterfront in an official GTA VI screenshot"
            : "The turquoise waters and bridges of Leonida Keys in an official GTA VI screenshot"
        }
      />
      <figcaption>
        <span>{characters ? "JASON & LUCIA" : "LEONIDA KEYS"}</span>
        <a
          href="https://www.rockstargames.com/VI/media/screenshots"
          target="_blank"
          rel="noreferrer"
        >
          Official GTA VI imagery · © Rockstar Games
        </a>
      </figcaption>
    </figure>
  );
}
