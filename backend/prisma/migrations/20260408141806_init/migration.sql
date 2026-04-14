-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol_enum" TEXT NOT NULL,
    "centro_salud_id" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroSalud" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "CentroSalud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "rut" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "profesion_enum" TEXT NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("rut")
);

-- CreateTable
CREATE TABLE "Programa" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria_enum" TEXT NOT NULL,

    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" SERIAL NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consolidado" (
    "id" SERIAL NOT NULL,
    "centro_salud_id" INTEGER NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "estado_actual_enum" TEXT NOT NULL,
    "usuario_gestor_id" INTEGER,

    CONSTRAINT "Consolidado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorasExtras" (
    "id" SERIAL NOT NULL,
    "consolidado_id" INTEGER NOT NULL,
    "funcionario_rut" TEXT NOT NULL,
    "programa_id" INTEGER NOT NULL,
    "cantidad_25" DECIMAL(10,2) NOT NULL,
    "cantidad_50" DECIMAL(10,2) NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "HorasExtras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnosUrgencia" (
    "id" SERIAL NOT NULL,
    "consolidado_id" INTEGER NOT NULL,
    "funcionario_rut" TEXT NOT NULL,
    "cant_turnos_habiles" INTEGER NOT NULL,
    "cant_turnos_inhabiles" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3) NOT NULL,
    "monto_calculado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "TurnosUrgencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viaticos" (
    "id" SERIAL NOT NULL,
    "consolidado_id" INTEGER NOT NULL,
    "funcionario_rut" TEXT NOT NULL,
    "tipo_destino" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3) NOT NULL,
    "monto_calculado" DECIMAL(10,2) NOT NULL,
    "justificacion" TEXT,

    CONSTRAINT "Viaticos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atrasos" (
    "id" SERIAL NOT NULL,
    "consolidado_id" INTEGER NOT NULL,
    "funcionario_rut" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3) NOT NULL,
    "tiempo_descuento" TEXT NOT NULL,

    CONSTRAINT "Atrasos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedimientos" (
    "id" SERIAL NOT NULL,
    "consolidado_id" INTEGER NOT NULL,
    "funcionario_rut" TEXT NOT NULL,
    "total_procedimientos" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3) NOT NULL,
    "monto_calculado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Procedimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_rut_key" ON "Usuario"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_centro_salud_id_fkey" FOREIGN KEY ("centro_salud_id") REFERENCES "CentroSalud"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consolidado" ADD CONSTRAINT "Consolidado_centro_salud_id_fkey" FOREIGN KEY ("centro_salud_id") REFERENCES "CentroSalud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consolidado" ADD CONSTRAINT "Consolidado_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consolidado" ADD CONSTRAINT "Consolidado_usuario_gestor_id_fkey" FOREIGN KEY ("usuario_gestor_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorasExtras" ADD CONSTRAINT "HorasExtras_consolidado_id_fkey" FOREIGN KEY ("consolidado_id") REFERENCES "Consolidado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorasExtras" ADD CONSTRAINT "HorasExtras_funcionario_rut_fkey" FOREIGN KEY ("funcionario_rut") REFERENCES "Funcionario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorasExtras" ADD CONSTRAINT "HorasExtras_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnosUrgencia" ADD CONSTRAINT "TurnosUrgencia_consolidado_id_fkey" FOREIGN KEY ("consolidado_id") REFERENCES "Consolidado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnosUrgencia" ADD CONSTRAINT "TurnosUrgencia_funcionario_rut_fkey" FOREIGN KEY ("funcionario_rut") REFERENCES "Funcionario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaticos" ADD CONSTRAINT "Viaticos_consolidado_id_fkey" FOREIGN KEY ("consolidado_id") REFERENCES "Consolidado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaticos" ADD CONSTRAINT "Viaticos_funcionario_rut_fkey" FOREIGN KEY ("funcionario_rut") REFERENCES "Funcionario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atrasos" ADD CONSTRAINT "Atrasos_consolidado_id_fkey" FOREIGN KEY ("consolidado_id") REFERENCES "Consolidado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atrasos" ADD CONSTRAINT "Atrasos_funcionario_rut_fkey" FOREIGN KEY ("funcionario_rut") REFERENCES "Funcionario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedimientos" ADD CONSTRAINT "Procedimientos_consolidado_id_fkey" FOREIGN KEY ("consolidado_id") REFERENCES "Consolidado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedimientos" ADD CONSTRAINT "Procedimientos_funcionario_rut_fkey" FOREIGN KEY ("funcionario_rut") REFERENCES "Funcionario"("rut") ON DELETE RESTRICT ON UPDATE CASCADE;
