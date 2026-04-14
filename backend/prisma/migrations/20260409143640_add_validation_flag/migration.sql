-- AlterTable
ALTER TABLE "Atrasos" ADD COLUMN     "validado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "HorasExtras" ADD COLUMN     "validado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Procedimientos" ADD COLUMN     "validado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TurnosUrgencia" ADD COLUMN     "validado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Viaticos" ADD COLUMN     "validado" BOOLEAN NOT NULL DEFAULT false;
