-- AlterTable
ALTER TABLE "public"."Channel" ALTER COLUMN "appId" SET DEFAULT 'app123';

-- AlterTable
ALTER TABLE "public"."DirectMessage" ALTER COLUMN "appId" SET DEFAULT 'app123';

-- AlterTable
ALTER TABLE "public"."Message" ALTER COLUMN "appId" SET DEFAULT 'app123';

-- AlterTable
ALTER TABLE "public"."Session" ALTER COLUMN "appId" SET DEFAULT 'app123';

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "appId" SET DEFAULT 'app123';
