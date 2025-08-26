-- AlterTable
ALTER TABLE "public"."Channel" ALTER COLUMN "appId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."DirectMessage" ALTER COLUMN "appId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Message" ALTER COLUMN "appId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Session" ALTER COLUMN "appId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "appId" DROP DEFAULT;
