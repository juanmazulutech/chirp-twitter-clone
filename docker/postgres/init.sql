-- Executed by the postgres image only when the data volume is created for the first time.
-- The development database (POSTGRES_DB) is created by the image itself; tests get their own.
CREATE DATABASE chirp_test;
