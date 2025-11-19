/*
  Warnings:

  - Added the required column `appId` to the `Call` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Call" ADD COLUMN     "appId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_appId_fkey" FOREIGN KEY ("appId") REFERENCES "public"."App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
