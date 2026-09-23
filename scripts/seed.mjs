import { writeFileSync, mkdirSync } from "node:fs";
const quote = (v) =>
  v === null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replaceAll("'", "''")}'`;
const lines = [
  "PRAGMA foreign_keys=ON;",
  "INSERT OR IGNORE INTO games VALUES('gta6','gta-6','Grand Theft Auto VI');",
  "INSERT OR IGNORE INTO regions VALUES('demo-coast','gta6','Demonstration coast',1);",
  "INSERT OR IGNORE INTO collectible_categories VALUES('demo-tokens','Sample tokens','gta6');",
  "INSERT OR IGNORE INTO maps VALUES('demo-map','Demonstration map','/demo-map.svg',1600,1000,1);",
];
const demoBody =
  "This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.\n\nUse the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.\n\nOur editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.";
const records = [
  [
    "missions",
    "coastal-delivery",
    "Coastal delivery",
    "Story mission",
    "A sample walkthrough showing objectives, map links and completion tracking.",
  ],
  [
    "missions",
    "after-hours",
    "After hours",
    "Story mission",
    "An example mission record for testing your completion checklist.",
  ],
  [
    "vehicles",
    "touring-coupe",
    "Touring coupe",
    "Sports",
    "A fictional two-door vehicle entry. Performance data is intentionally unavailable.",
  ],
  [
    "vehicles",
    "utility-truck",
    "Utility truck",
    "Utility",
    "A sample utility vehicle. No GTA VI availability or specifications are implied.",
  ],
  [
    "vehicles",
    "coastal-helicopter",
    "Coastal helicopter",
    "Aircraft",
    "A demonstration aircraft entry with a sample map location.",
  ],
  [
    "weapons",
    "service-pistol",
    "Service pistol",
    "Handguns",
    "A fictional weapon entry showing how source-backed specifications will appear.",
  ],
  [
    "weapons",
    "field-rifle",
    "Field rifle",
    "Rifles",
    "A sample rifle entry. No damage, unlock or purchase data is confirmed.",
  ],
  [
    "locations",
    "harbor-point",
    "Harbor point",
    "Waterfront",
    "An imaginary waterfront point on the demonstration map.",
  ],
  [
    "locations",
    "north-lookout",
    "North lookout",
    "Landmark",
    "A fictional viewpoint for exploring map filters and saved discoveries.",
  ],
  [
    "locations",
    "transit-yard",
    "Transit yard",
    "Industrial",
    "A sample industrial location on the fictional companion map.",
  ],
  [
    "characters",
    "sample-contact",
    "Sample contact",
    "Supporting",
    "A placeholder character to demonstrate relationships in the mission database.",
  ],
  [
    "properties",
    "sample-apartment",
    "Sample apartment",
    "Residential",
    "A demonstration property. Location and availability are fictional.",
  ],
  [
    "businesses",
    "sample-workshop",
    "Sample workshop",
    "Services",
    "A sample business entry for future sourced business information.",
  ],
  [
    "activities",
    "sample-time-trial",
    "Sample time trial",
    "Driving",
    "A fictional activity demonstrating discovery and completion tracking.",
  ],
  [
    "secrets",
    "sample-hidden-room",
    "Sample hidden room",
    "Discovery",
    "An imaginary discovery. This is not a claim about a GTA VI secret.",
  ],
  [
    "easter-eggs",
    "sample-reference",
    "Sample reference",
    "Discovery",
    "An editorial example for documenting evidence behind an Easter egg.",
  ],
  [
    "achievements",
    "sample-milestone",
    "Sample milestone",
    "Exploration",
    "A fictional milestone. This is not an official achievement or trophy.",
  ],
  ...Array.from({ length: 8 }, (_, i) => [
    "collectibles",
    `sample-token-${i + 1}`,
    `Sample token ${String(i + 1).padStart(2, "0")}`,
    "Sample tokens",
    "A fictional collectible for trying the map and missing-only checklist.",
  ]),
  [
    "guides",
    "using-the-map",
    "Make the map your own",
    "Getting started",
    "Find your way around filters, saved places and a checklist that stays with you.",
  ],
  [
    "guides",
    "tracking-your-progress",
    "A little progress, every session",
    "Companion essentials",
    "Keep track of discoveries, revisit favorites and pick up where you left off.",
  ],
  [
    "guides",
    "how-we-verify",
    "A source behind every claim",
    "Editorial standards",
    "Understand our verification labels and help build a more reliable companion.",
  ],
];
records.forEach(([kind, slug, title, category, description], index) => {
  const id = `demo-${slug}`;
  const guide = kind === "guides";
  const bodies = {
    "using-the-map":
      "Open the interactive map and choose a category in the filter panel. Markers use coordinates on the map image, so they do not request your real-world location.\n\nSelect a marker to see its description and verification status. The current map is a fictional demonstration, not GTA VI geography. Use the reset control to return to the full view.\n\nSave a marker as a favorite or mark it complete. Completed items stay in your checklist. Missing only hides items you have already found. Copy the address to share a selected marker and active category with another visitor.",
    "tracking-your-progress":
      "Mark any record complete to add it to your companion checklist. The companion tracks what you enter here; it does not connect to a console account or read your game save.\n\nGuest progress is stored on our server and identified by a cookie in your browser. Clearing cookies loses access to that guest checklist. Sign in with GitHub to attach your checklist to a free account and access it on another device.\n\nFavorites are separate from completion. Save a guide to read later without marking it finished. Visit My progress to review your completed items and saved records. Demonstration items are labeled and should not be treated as real game completion.",
    "how-we-verify":
      "Official means a claim has a linked primary source from the publisher or developer. Verified means an editor has reviewed supporting evidence. Community Verified means independent community evidence has been reviewed. Unverified and Rumor are not confirmations.\n\nEvery source link includes the fact it supports. Demo records are fictional examples and cannot receive a verified label. We do not infer missing statistics, codes or story details.\n\nTo help, submit a clear description and a public evidence link. A moderator reviews submissions before creating a draft. Approval does not automatically publish a page or make a claim verified. Editors check the evidence and record revisions before publication.",
  };
  const values = [
    id,
    "gta6",
    kind,
    slug,
    title,
    description,
    bodies[slug] ?? demoBody,
    category,
    "Unverified",
    guide ? 0 : 1,
    "published",
  ];
  lines.push(
    `INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES(${values.map(quote).join(",")});`,
  );
  const x = 300 + ((index * 137) % 1020),
    y = 190 + ((index * 113) % 610);
  if (kind === "locations")
    lines.push(
      `INSERT OR IGNORE INTO locations VALUES(${quote(id)},'demo-coast',${x},${y},'Demonstration only');`,
    );
  if (kind === "missions") {
    lines.push(
      `INSERT OR IGNORE INTO missions(entity_id,sequence,requirements,rewards,unlocks,tips,missables) VALUES(${quote(id)},${index + 1},'Not confirmed','Not confirmed','Not confirmed','Use this sample to test completion tracking.','Not confirmed');`,
    );
    [
      "Find the sample starting point",
      "Review the example objective",
      "Mark the demonstration complete",
    ].forEach((t, j) =>
      lines.push(
        `INSERT OR IGNORE INTO mission_objectives VALUES(${quote(id + "-" + j)},${quote(id)},${j + 1},${quote(t)},'DEMO: This step illustrates a walkthrough layout, not GTA VI gameplay.');`,
      ),
    );
  }
  if (kind === "vehicles")
    lines.push(
      `INSERT OR IGNORE INTO vehicles(entity_id,obtain,customization) VALUES(${quote(id)},'Not confirmed','Not confirmed');`,
    );
  if (kind === "weapons")
    lines.push(
      `INSERT OR IGNORE INTO weapons(entity_id,obtain,requirements,attachments) VALUES(${quote(id)},'Not confirmed','Not confirmed','Not confirmed');`,
    );
  if (kind === "characters")
    lines.push(
      `INSERT OR IGNORE INTO characters VALUES(${quote(id)},'Fictional example');`,
    );
  if (kind === "collectibles")
    lines.push(
      `INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES(${quote(id)},'demo-tokens',${index - 16});`,
    );
  if (["properties", "businesses", "activities", "achievements"].includes(kind))
    lines.push(
      `INSERT OR IGNORE INTO ${kind}(entity_id,requirements) VALUES(${quote(id)},'Not confirmed');`,
    );
  if (guide)
    lines.push(
      `INSERT OR IGNORE INTO guides(entity_id,reading_minutes) VALUES(${quote(id)},3);`,
    );
  if (!guide && kind !== "characters" && kind !== "achievements")
    lines.push(
      `INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES(${quote("marker-" + slug)},'demo-map',${quote(id)},${quote(kind)},${x},${y});`,
    );
});
lines.push(
  "INSERT OR IGNORE INTO mission_characters VALUES('demo-coastal-delivery','demo-sample-contact');",
  "INSERT OR IGNORE INTO vehicle_locations VALUES('demo-touring-coupe','demo-harbor-point');",
  "INSERT OR IGNORE INTO weapon_locations VALUES('demo-service-pistol','demo-transit-yard');",
);
mkdirSync("db", { recursive: true });
writeFileSync("db/seed.sql", lines.join("\n") + "\n");
