-- AlterTable
ALTER TABLE "Atrasos" ADD COLUMN     "monto_descuento" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CentroSalud" ADD COLUMN     "porcentaje_dificil" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "porcentaje_zona" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Funcionario" ADD COLUMN     "categoria_aps" TEXT,
ADD COLUMN     "jornada_horas" INTEGER,
ADD COLUMN     "nivel_aps" INTEGER;

-- AlterTable
ALTER TABLE "HorasExtras" ADD COLUMN     "monto_25" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "monto_50" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TurnosUrgencia" ALTER COLUMN "monto_calculado" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Viaticos" ALTER COLUMN "monto_calculado" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "EscalaSueldo" (
    "id" SERIAL NOT NULL,
    "categoria" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "sueldo_base" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "EscalaSueldo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EscalaSueldo_categoria_nivel_key" ON "EscalaSueldo"("categoria", "nivel");
