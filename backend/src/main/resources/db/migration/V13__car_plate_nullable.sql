-- Align with JPA: inventory vehicles may omit plate until sold.
ALTER TABLE car ALTER COLUMN plate DROP NOT NULL;
