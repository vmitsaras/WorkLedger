DO
$$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workledger_app') THEN
    CREATE ROLE workledger_app LOGIN PASSWORD 'workledger_dev_password';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workledger_migrator') THEN
    CREATE ROLE workledger_migrator LOGIN PASSWORD 'workledger_migration_password';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workledger_test') THEN
    CREATE ROLE workledger_test LOGIN PASSWORD 'workledger_test_password';
  END IF;
END
$$;

ALTER DATABASE workledger_dev OWNER TO workledger_migrator;
GRANT CONNECT ON DATABASE workledger_dev TO workledger_app;
GRANT USAGE ON SCHEMA public TO workledger_app;
ALTER DEFAULT PRIVILEGES FOR ROLE workledger_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO workledger_app;

SELECT 'CREATE DATABASE workledger_test OWNER workledger_test'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'workledger_test')\gexec
