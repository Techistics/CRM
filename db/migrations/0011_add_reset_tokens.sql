ALTER TABLE "users" ADD COLUMN "reset_token" text;
ALTER TABLE "users" ADD COLUMN "reset_token_expiry" timestamp;
