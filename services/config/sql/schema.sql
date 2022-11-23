-- -----------------------------------------------------
-- Schema Apillon_config
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `Apillon_config` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `Apillon_config` ;

-- -----------------------------------------------------
-- Table `quota`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `quota` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` INT NULL,
  `group` VARCHAR(45) NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(3000) NULL,
  `limitType` INT NULL COMMENT '1- MAX\n2- MIN\n3 - boolean',
  `limit` INT NULL,
  `service_type_id` INT NULL,
  `createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createUser` VARCHAR(36) NULL,
  `updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updateUser` VARCHAR(36) NULL,
  PRIMARY KEY (`id`));


-- -----------------------------------------------------
-- Table `override`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `override` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `quota_id` INT NOT NULL,
  `status` INT NULL,
  `project_uuid` VARCHAR(45) NULL,
  `object_uuid` VARCHAR(45) NULL,
  `description` VARCHAR(3000) NULL,
  `limit` INT NULL,
  `createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createUser` VARCHAR(36) NULL,
  `updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updateUser` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_quota_overrides_quota_idx` (`quota_id` ASC) VISIBLE,
  CONSTRAINT `fk_quota_overrides_quota`
    FOREIGN KEY (`quota_id`)
    REFERENCES `quota` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION);


-- -----------------------------------------------------
-- Table `quotaTemplate`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `quotaTemplate` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` INT NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(3000) NULL,
  `createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createUser` VARCHAR(36) NULL,
  `updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updateUser` VARCHAR(36) NULL,
  PRIMARY KEY (`id`));


-- -----------------------------------------------------
-- Table `templateValue`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `templateValue` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `quotaTemplates_id` INT NOT NULL,
  `quota_id` INT NOT NULL,
  `status` INT NULL,
  `description` VARCHAR(3000) NULL,
  `limit` INT NULL,
  `createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createUser` VARCHAR(36) NULL,
  `updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updateUser` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_quota_overrides_quota_idx` (`quota_id` ASC) VISIBLE,
  INDEX `fk_overrides_copy1_quotaTemplates1_idx` (`quotaTemplates_id` ASC) VISIBLE,
  CONSTRAINT `fk_quota_overrides_quota0`
    FOREIGN KEY (`quota_id`)
    REFERENCES `quota` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_overrides_copy1_quotaTemplates1`
    FOREIGN KEY (`quotaTemplates_id`)
    REFERENCES `quotaTemplate` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION);
