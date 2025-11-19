/*
  Warnings:

  - Added the required column `callType` to the `Call` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Call" ADD COLUMN     "callType" TEXT NOT NULL;
