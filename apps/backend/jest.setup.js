process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-super-secret-jwt-key-for-unit-testing";
process.env.JWT_EXPIRES_IN = "7d";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.PORT = "5000";

