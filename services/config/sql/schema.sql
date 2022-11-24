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
-- Table `subscriptionPackage`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptionPackage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` INT NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(3000) NULL,
  `isDefault` TINYINT NULL,
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
  `package_id` INT NULL,
  `project_uuid` VARCHAR(36) NULL,
  `object_uuid` VARCHAR(36) NULL,
  `description` VARCHAR(3000) NULL,
  `limit` INT NULL,
  `createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createUser` VARCHAR(36) NULL,
  `updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updateUser` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_quota_overrides_quota_idx` (`quota_id` ASC) VISIBLE,
  INDEX `fk_override_subscriptionPackage1_idx` (`package_id` ASC) VISIBLE,
  CONSTRAINT `fk_quota_overrides_quota`
    FOREIGN KEY (`quota_id`)
    REFERENCES `quota` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_override_subscriptionPackage1`
    FOREIGN KEY (`package_id`)
    REFERENCES `subscriptionPackage` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION);


-- -----------------------------------------------------
-- Table `subscription`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscription` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `package_id` INT NULL,
  `project_uuid` VARCHAR(36) NULL,
  `status` INT NULL,
  `expiresOn` DATETIME NULL,
  `createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createUser` VARCHAR(36) NULL,
  `updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updateUser` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_subscription_subscriptionPackage1_idx` (`package_id` ASC) VISIBLE,
  CONSTRAINT `fk_subscription_subscriptionPackage1`
    FOREIGN KEY (`package_id`)
    REFERENCES `subscriptionPackage` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION);
