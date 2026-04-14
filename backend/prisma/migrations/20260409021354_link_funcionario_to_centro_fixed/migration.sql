-- AlterTable
ALTER TABLE "Funcionario" ADD COLUMN     "centro_salud_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_centro_salud_id_fkey" FOREIGN KEY ("centro_salud_id") REFERENCES "CentroSalud"("id") ON DELETE SET NULL ON UPDATE CASCADE;
