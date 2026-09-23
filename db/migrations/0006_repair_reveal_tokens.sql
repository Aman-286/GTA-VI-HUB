-- Repair records created by the older CSV import path. Preserve every record
-- and existing token; do not use an INSERT trigger that could race FTS5.
UPDATE entities SET reveal_token=lower(hex(randomblob(16)))
WHERE reveal_token IS NULL OR reveal_token='';
