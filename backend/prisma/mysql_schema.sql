-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rut` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `rol_enum` VARCHAR(191) NOT NULL,
    `centro_salud_id` INTEGER NULL,

    UNIQUE INDEX `Usuario_rut_key`(`rut`),
    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CentroSalud` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `porcentaje_zona` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `porcentaje_dificil` DECIMAL(5, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Funcionario` (
    `rut` VARCHAR(191) NOT NULL,
    `nombre_completo` VARCHAR(191) NOT NULL,
    `profesion_enum` VARCHAR(191) NOT NULL,
    `categoria_aps` VARCHAR(191) NULL,
    `nivel_aps` INTEGER NULL,
    `jornada_horas` INTEGER NULL,
    `centro_salud_id` INTEGER NULL,

    PRIMARY KEY (`rut`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscalaSueldo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoria` VARCHAR(191) NOT NULL,
    `nivel` INTEGER NOT NULL,
    `sueldo_base` DECIMAL(12, 2) NOT NULL,

    UNIQUE INDEX `EscalaSueldo_categoria_nivel_key`(`categoria`, `nivel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Programa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `categoria_enum` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Periodo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mes` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `estado` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Consolidado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_salud_id` INTEGER NOT NULL,
    `periodo_id` INTEGER NOT NULL,
    `estado_actual_enum` VARCHAR(191) NOT NULL,
    `vb_control_interno` BOOLEAN NOT NULL DEFAULT false,
    `fecha_vb_control_interno` DATETIME(3) NULL,
    `firma_vb_control_interno` VARCHAR(191) NULL,
    `vb_finanzas` BOOLEAN NOT NULL DEFAULT false,
    `fecha_vb_finanzas` DATETIME(3) NULL,
    `firma_vb_finanzas` VARCHAR(191) NULL,
    `usuario_gestor_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HorasExtras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `consolidado_id` INTEGER NOT NULL,
    `funcionario_rut` VARCHAR(191) NOT NULL,
    `programa_id` INTEGER NOT NULL,
    `cantidad_25` DECIMAL(10, 2) NOT NULL,
    `cantidad_50` DECIMAL(10, 2) NOT NULL,
    `monto_25` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `monto_50` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `estado_25` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `estado_50` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_termino` DATETIME(3) NOT NULL,
    `observaciones_25` VARCHAR(191) NULL,
    `observaciones_50` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TurnosUrgencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `consolidado_id` INTEGER NOT NULL,
    `funcionario_rut` VARCHAR(191) NOT NULL,
    `cant_turnos_habiles` INTEGER NOT NULL,
    `cant_turnos_inhabiles` INTEGER NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_termino` DATETIME(3) NOT NULL,
    `monto_calculado` DECIMAL(12, 2) NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Viaticos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `consolidado_id` INTEGER NOT NULL,
    `funcionario_rut` VARCHAR(191) NOT NULL,
    `tipo_destino` VARCHAR(191) NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_termino` DATETIME(3) NOT NULL,
    `monto_calculado` DECIMAL(12, 2) NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `justificacion` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Atrasos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `consolidado_id` INTEGER NOT NULL,
    `funcionario_rut` VARCHAR(191) NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_termino` DATETIME(3) NOT NULL,
    `tiempo_descuento` VARCHAR(191) NOT NULL,
    `monto_descuento` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Procedimientos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `consolidado_id` INTEGER NOT NULL,
    `funcionario_rut` VARCHAR(191) NOT NULL,
    `total_procedimientos` INTEGER NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_termino` DATETIME(3) NOT NULL,
    `monto_calculado` DECIMAL(10, 2) NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistorialAuditoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_modulo` VARCHAR(191) NOT NULL,
    `registro_id` INTEGER NOT NULL,
    `usuario_nombre` VARCHAR(191) NOT NULL,
    `campo_afectado` VARCHAR(191) NULL,
    `valor_anterior` VARCHAR(191) NULL,
    `valor_nuevo` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscalaHorasExtras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoria` VARCHAR(191) NOT NULL,
    `nivel` INTEGER NOT NULL,
    `valor_25` DECIMAL(12, 2) NOT NULL,
    `valor_50` DECIMAL(12, 2) NOT NULL,
    `anio` INTEGER NOT NULL DEFAULT 2026,

    UNIQUE INDEX `EscalaHorasExtras_categoria_nivel_anio_key`(`categoria`, `nivel`, `anio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_centro_salud_id_fkey` FOREIGN KEY (`centro_salud_id`) REFERENCES `CentroSalud`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Funcionario` ADD CONSTRAINT `Funcionario_centro_salud_id_fkey` FOREIGN KEY (`centro_salud_id`) REFERENCES `CentroSalud`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consolidado` ADD CONSTRAINT `Consolidado_centro_salud_id_fkey` FOREIGN KEY (`centro_salud_id`) REFERENCES `CentroSalud`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consolidado` ADD CONSTRAINT `Consolidado_periodo_id_fkey` FOREIGN KEY (`periodo_id`) REFERENCES `Periodo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consolidado` ADD CONSTRAINT `Consolidado_usuario_gestor_id_fkey` FOREIGN KEY (`usuario_gestor_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HorasExtras` ADD CONSTRAINT `HorasExtras_consolidado_id_fkey` FOREIGN KEY (`consolidado_id`) REFERENCES `Consolidado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HorasExtras` ADD CONSTRAINT `HorasExtras_funcionario_rut_fkey` FOREIGN KEY (`funcionario_rut`) REFERENCES `Funcionario`(`rut`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HorasExtras` ADD CONSTRAINT `HorasExtras_programa_id_fkey` FOREIGN KEY (`programa_id`) REFERENCES `Programa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnosUrgencia` ADD CONSTRAINT `TurnosUrgencia_consolidado_id_fkey` FOREIGN KEY (`consolidado_id`) REFERENCES `Consolidado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnosUrgencia` ADD CONSTRAINT `TurnosUrgencia_funcionario_rut_fkey` FOREIGN KEY (`funcionario_rut`) REFERENCES `Funcionario`(`rut`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Viaticos` ADD CONSTRAINT `Viaticos_consolidado_id_fkey` FOREIGN KEY (`consolidado_id`) REFERENCES `Consolidado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Viaticos` ADD CONSTRAINT `Viaticos_funcionario_rut_fkey` FOREIGN KEY (`funcionario_rut`) REFERENCES `Funcionario`(`rut`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atrasos` ADD CONSTRAINT `Atrasos_consolidado_id_fkey` FOREIGN KEY (`consolidado_id`) REFERENCES `Consolidado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atrasos` ADD CONSTRAINT `Atrasos_funcionario_rut_fkey` FOREIGN KEY (`funcionario_rut`) REFERENCES `Funcionario`(`rut`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Procedimientos` ADD CONSTRAINT `Procedimientos_consolidado_id_fkey` FOREIGN KEY (`consolidado_id`) REFERENCES `Consolidado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Procedimientos` ADD CONSTRAINT `Procedimientos_funcionario_rut_fkey` FOREIGN KEY (`funcionario_rut`) REFERENCES `Funcionario`(`rut`) ON DELETE RESTRICT ON UPDATE CASCADE;

