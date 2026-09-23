PRAGMA foreign_keys=ON;
INSERT OR IGNORE INTO games VALUES('gta6','gta-6','Grand Theft Auto VI');
INSERT OR IGNORE INTO regions VALUES('demo-coast','gta6','Demonstration coast',1);
INSERT OR IGNORE INTO collectible_categories VALUES('demo-tokens','Sample tokens','gta6');
INSERT OR IGNORE INTO maps VALUES('demo-map','Demonstration map','/demo-map.svg',1600,1000,1);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-coastal-delivery','gta6','missions','coastal-delivery','Coastal delivery','A sample walkthrough showing objectives, map links and completion tracking.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Story mission','Unverified',1,'published');
INSERT OR IGNORE INTO missions(entity_id,sequence,requirements,rewards,unlocks,tips,missables) VALUES('demo-coastal-delivery',1,'Not confirmed','Not confirmed','Not confirmed','Use this sample to test completion tracking.','Not confirmed');
INSERT OR IGNORE INTO mission_objectives VALUES('demo-coastal-delivery-0','demo-coastal-delivery',1,'Find the sample starting point','DEMO: This step illustrates a walkthrough layout, not GTA VI gameplay.');
INSERT OR IGNORE INTO mission_objectives VALUES('demo-coastal-delivery-1','demo-coastal-delivery',2,'Review the example objective','DEMO: This step illustrates a walkthrough layout, not GTA VI gameplay.');
INSERT OR IGNORE INTO mission_objectives VALUES('demo-coastal-delivery-2','demo-coastal-delivery',3,'Mark the demonstration complete','DEMO: This step illustrates a walkthrough layout, not GTA VI gameplay.');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-coastal-delivery','demo-map','demo-coastal-delivery','missions',300,190);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-after-hours','gta6','missions','after-hours','After hours','An example mission record for testing your completion checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Story mission','Unverified',1,'published');
INSERT OR IGNORE INTO missions(entity_id,sequence,requirements,rewards,unlocks,tips,missables) VALUES('demo-after-hours',2,'Not confirmed','Not confirmed','Not confirmed','Use this sample to test completion tracking.','Not confirmed');
INSERT OR IGNORE INTO mission_objectives VALUES('demo-after-hours-0','demo-after-hours',1,'Find the sample starting point','DEMO: This step illustrates a walkthrough layout, not GTA VI gameplay.');
INSERT OR IGNORE INTO mission_objectives VALUES('demo-after-hours-1','demo-after-hours',2,'Review the example objective','DEMO: This step illustrates a walkthrough layout, not GTA VI gameplay.');
INSERT OR IGNORE INTO mission_objectives VALUES('demo-after-hours-2','demo-after-hours',3,'Mark the demonstration complete','DEMO: This step illustrates a walkthrough layout, not GTA VI gameplay.');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-after-hours','demo-map','demo-after-hours','missions',437,303);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-touring-coupe','gta6','vehicles','touring-coupe','Touring coupe','A fictional two-door vehicle entry. Performance data is intentionally unavailable.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sports','Unverified',1,'published');
INSERT OR IGNORE INTO vehicles(entity_id,obtain,customization) VALUES('demo-touring-coupe','Not confirmed','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-touring-coupe','demo-map','demo-touring-coupe','vehicles',574,416);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-utility-truck','gta6','vehicles','utility-truck','Utility truck','A sample utility vehicle. No GTA VI availability or specifications are implied.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Utility','Unverified',1,'published');
INSERT OR IGNORE INTO vehicles(entity_id,obtain,customization) VALUES('demo-utility-truck','Not confirmed','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-utility-truck','demo-map','demo-utility-truck','vehicles',711,529);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-coastal-helicopter','gta6','vehicles','coastal-helicopter','Coastal helicopter','A demonstration aircraft entry with a sample map location.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Aircraft','Unverified',1,'published');
INSERT OR IGNORE INTO vehicles(entity_id,obtain,customization) VALUES('demo-coastal-helicopter','Not confirmed','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-coastal-helicopter','demo-map','demo-coastal-helicopter','vehicles',848,642);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-service-pistol','gta6','weapons','service-pistol','Service pistol','A fictional weapon entry showing how source-backed specifications will appear.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Handguns','Unverified',1,'published');
INSERT OR IGNORE INTO weapons(entity_id,obtain,requirements,attachments) VALUES('demo-service-pistol','Not confirmed','Not confirmed','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-service-pistol','demo-map','demo-service-pistol','weapons',985,755);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-field-rifle','gta6','weapons','field-rifle','Field rifle','A sample rifle entry. No damage, unlock or purchase data is confirmed.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Rifles','Unverified',1,'published');
INSERT OR IGNORE INTO weapons(entity_id,obtain,requirements,attachments) VALUES('demo-field-rifle','Not confirmed','Not confirmed','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-field-rifle','demo-map','demo-field-rifle','weapons',1122,258);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-harbor-point','gta6','locations','harbor-point','Harbor point','An imaginary waterfront point on the demonstration map.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Waterfront','Unverified',1,'published');
INSERT OR IGNORE INTO locations VALUES('demo-harbor-point','demo-coast',1259,371,'Demonstration only');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-harbor-point','demo-map','demo-harbor-point','locations',1259,371);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-north-lookout','gta6','locations','north-lookout','North lookout','A fictional viewpoint for exploring map filters and saved discoveries.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Landmark','Unverified',1,'published');
INSERT OR IGNORE INTO locations VALUES('demo-north-lookout','demo-coast',376,484,'Demonstration only');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-north-lookout','demo-map','demo-north-lookout','locations',376,484);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-transit-yard','gta6','locations','transit-yard','Transit yard','A sample industrial location on the fictional companion map.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Industrial','Unverified',1,'published');
INSERT OR IGNORE INTO locations VALUES('demo-transit-yard','demo-coast',513,597,'Demonstration only');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-transit-yard','demo-map','demo-transit-yard','locations',513,597);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-contact','gta6','characters','sample-contact','Sample contact','A placeholder character to demonstrate relationships in the mission database.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Supporting','Unverified',1,'published');
INSERT OR IGNORE INTO characters VALUES('demo-sample-contact','Fictional example');
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-apartment','gta6','properties','sample-apartment','Sample apartment','A demonstration property. Location and availability are fictional.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Residential','Unverified',1,'published');
INSERT OR IGNORE INTO properties(entity_id,requirements) VALUES('demo-sample-apartment','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-apartment','demo-map','demo-sample-apartment','properties',787,213);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-workshop','gta6','businesses','sample-workshop','Sample workshop','A sample business entry for future sourced business information.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Services','Unverified',1,'published');
INSERT OR IGNORE INTO businesses(entity_id,requirements) VALUES('demo-sample-workshop','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-workshop','demo-map','demo-sample-workshop','businesses',924,326);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-time-trial','gta6','activities','sample-time-trial','Sample time trial','A fictional activity demonstrating discovery and completion tracking.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Driving','Unverified',1,'published');
INSERT OR IGNORE INTO activities(entity_id,requirements) VALUES('demo-sample-time-trial','Not confirmed');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-time-trial','demo-map','demo-sample-time-trial','activities',1061,439);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-hidden-room','gta6','secrets','sample-hidden-room','Sample hidden room','An imaginary discovery. This is not a claim about a GTA VI secret.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Discovery','Unverified',1,'published');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-hidden-room','demo-map','demo-sample-hidden-room','secrets',1198,552);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-reference','gta6','easter-eggs','sample-reference','Sample reference','An editorial example for documenting evidence behind an Easter egg.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Discovery','Unverified',1,'published');
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-reference','demo-map','demo-sample-reference','easter-eggs',315,665);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-milestone','gta6','achievements','sample-milestone','Sample milestone','A fictional milestone. This is not an official achievement or trophy.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Exploration','Unverified',1,'published');
INSERT OR IGNORE INTO achievements(entity_id,requirements) VALUES('demo-sample-milestone','Not confirmed');
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-1','gta6','collectibles','sample-token-1','Sample token 01','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-1','demo-tokens',1);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-1','demo-map','demo-sample-token-1','collectibles',589,281);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-2','gta6','collectibles','sample-token-2','Sample token 02','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-2','demo-tokens',2);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-2','demo-map','demo-sample-token-2','collectibles',726,394);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-3','gta6','collectibles','sample-token-3','Sample token 03','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-3','demo-tokens',3);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-3','demo-map','demo-sample-token-3','collectibles',863,507);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-4','gta6','collectibles','sample-token-4','Sample token 04','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-4','demo-tokens',4);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-4','demo-map','demo-sample-token-4','collectibles',1000,620);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-5','gta6','collectibles','sample-token-5','Sample token 05','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-5','demo-tokens',5);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-5','demo-map','demo-sample-token-5','collectibles',1137,733);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-6','gta6','collectibles','sample-token-6','Sample token 06','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-6','demo-tokens',6);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-6','demo-map','demo-sample-token-6','collectibles',1274,236);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-7','gta6','collectibles','sample-token-7','Sample token 07','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-7','demo-tokens',7);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-7','demo-map','demo-sample-token-7','collectibles',391,349);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-sample-token-8','gta6','collectibles','sample-token-8','Sample token 08','A fictional collectible for trying the map and missing-only checklist.','This is a fictional demonstration record for exploring the companion. Its name, description, coordinates and relationships do not describe GTA VI.

Use the map to find this sample marker, save it to your collection, or mark it complete. Your progress is stored in this companion and has no connection to your game save.

Our editorial team will replace demonstration records with independently written information supported by traceable sources. No gameplay requirements, statistics or rewards are confirmed by this record.','Sample tokens','Unverified',1,'published');
INSERT OR IGNORE INTO collectibles(entity_id,category_id,sequence) VALUES('demo-sample-token-8','demo-tokens',8);
INSERT OR IGNORE INTO map_markers(id,map_id,entity_id,category,x,y) VALUES('marker-sample-token-8','demo-map','demo-sample-token-8','collectibles',528,462);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-using-the-map','gta6','guides','using-the-map','Make the map your own','Find your way around filters, saved places and a checklist that stays with you.','Open the interactive map and choose a category in the filter panel. Markers use coordinates on the map image, so they do not request your real-world location.

Select a marker to see its description and verification status. The current map is a fictional demonstration, not GTA VI geography. Use the reset control to return to the full view.

Save a marker as a favorite or mark it complete. Completed items stay in your checklist. Missing only hides items you have already found. Copy the address to share a selected marker and active category with another visitor.','Getting started','Unverified',0,'published');
INSERT OR IGNORE INTO guides(entity_id,reading_minutes) VALUES('demo-using-the-map',3);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-tracking-your-progress','gta6','guides','tracking-your-progress','A little progress, every session','Keep track of discoveries, revisit favorites and pick up where you left off.','Mark any record complete to add it to your companion checklist. The companion tracks what you enter here; it does not connect to a console account or read your game save.

Guest progress is stored on our server and identified by a cookie in your browser. Clearing cookies loses access to that guest checklist. Sign in with GitHub to attach your checklist to a free account and access it on another device.

Favorites are separate from completion. Save a guide to read later without marking it finished. Visit My progress to review your completed items and saved records. Demonstration items are labeled and should not be treated as real game completion.','Companion essentials','Unverified',0,'published');
INSERT OR IGNORE INTO guides(entity_id,reading_minutes) VALUES('demo-tracking-your-progress',3);
INSERT OR IGNORE INTO entities(id,game_id,kind,slug,title,description,body,category,verification,is_demo,status) VALUES('demo-how-we-verify','gta6','guides','how-we-verify','A source behind every claim','Understand our verification labels and help build a more reliable companion.','Official means a claim has a linked primary source from the publisher or developer. Verified means an editor has reviewed supporting evidence. Community Verified means independent community evidence has been reviewed. Unverified and Rumor are not confirmations.

Every source link includes the fact it supports. Demo records are fictional examples and cannot receive a verified label. We do not infer missing statistics, codes or story details.

To help, submit a clear description and a public evidence link. A moderator reviews submissions before creating a draft. Approval does not automatically publish a page or make a claim verified. Editors check the evidence and record revisions before publication.','Editorial standards','Unverified',0,'published');
INSERT OR IGNORE INTO guides(entity_id,reading_minutes) VALUES('demo-how-we-verify',3);
INSERT OR IGNORE INTO mission_characters VALUES('demo-coastal-delivery','demo-sample-contact');
INSERT OR IGNORE INTO vehicle_locations VALUES('demo-touring-coupe','demo-harbor-point');
INSERT OR IGNORE INTO weapon_locations VALUES('demo-service-pistol','demo-transit-yard');

-- Phase 1 demonstration of the spoiler system.
--
-- These are the same fictional DEMO records as above; only their spoiler
-- classification is set here. Nothing below asserts anything about GTA VI --
-- it exists so the concealment, reveal and story-progress controls can be
-- exercised against real data instead of being taken on trust.
--
-- Deliberately idempotent UPDATEs rather than INSERTs, so re-seeding an
-- existing database re-applies the classification without duplicating records.
UPDATE entities SET
 spoiler_level=2,
 spoiler_category='story',
 reveal_after_sequence=2,
 safe_title='A later story mission',
 safe_description='A demonstration record classified as story content. Its title and details are hidden until you choose to see them.'
WHERE id='demo-after-hours';

UPDATE entities SET
 spoiler_level=2,
 spoiler_category='character',
 safe_title='A character you have not met',
 safe_description='A demonstration record classified as a character detail, to show how the companion hides who someone turns out to be.'
WHERE id='demo-sample-contact';

UPDATE entities SET
 spoiler_level=1,
 spoiler_category='mechanic',
 reveal_after_sequence=1,
 safe_title='A later unlock',
 safe_description='A demonstration record classified as a minor gameplay spoiler, shown under "Minor gameplay spoilers" and above.'
WHERE id='demo-sample-hidden-room';

UPDATE entities SET
 spoiler_level=1,
 spoiler_category='side-content',
 safe_title='Optional content',
 safe_description='A demonstration record classified as optional side content whose existence is treated as a mild surprise.'
WHERE id='demo-sample-reference';

UPDATE entities SET
 spoiler_level=2,
 spoiler_category='location',
 reveal_after_sequence=2,
 safe_title='A location reached later',
 safe_description='A demonstration record classified as a late-game location, to show how map markers are withheld.'
WHERE id='demo-north-lookout';

-- Opaque reveal handles for the demonstration records. The seed sets these
-- itself rather than relying on a trigger; see db/migrations/0004_reveal_tokens.sql
-- for why a trigger on `entities` is not safe here. Repeatable: an existing
-- token is never rewritten.
UPDATE entities SET reveal_token = lower(hex(randomblob(16))) WHERE reveal_token IS NULL;

-- Phase 2 demonstration marker detail.
--
-- Fills the fields the marker detail panel used to hard-code, so the panel can
-- be checked against real data. Every value here is explicitly fictional and
-- attached to the DEMO version label; none of it describes GTA VI.
UPDATE map_markers SET
 region_id='demo-coast',
 game_version_id='demo-version',
 verification='Unverified',
 verified_at='2026-01-01',
 unlock_requirements='Not confirmed. This is a demonstration marker.',
 notes='Fictional demonstration marker on an original schematic map.'
WHERE map_id='demo-map';

UPDATE map_markers SET subcategory='missions-story' WHERE category='missions';
UPDATE map_markers SET subcategory='collectibles-set' WHERE category='collectibles';
