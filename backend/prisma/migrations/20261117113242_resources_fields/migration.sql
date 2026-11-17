/*
  Warnings:

  - Added the required column `fileName` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectName` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "subjectName" TEXT NOT NULL;
