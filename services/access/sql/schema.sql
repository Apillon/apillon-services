-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema ATv2_access_dev
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema ATv2_access_dev
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `ATv2_access_dev` DEFAULT CHARACTER SET utf8 ;
USE `ATv2_access_dev` ;

-- -----------------------------------------------------
-- Table `authUser`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `authUser` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` INT NULL,
  `user_uuid` VARCHAR(36) NULL,
  `password` VARCHAR(300) NULL,
  `email` VARCHAR(100) NULL,
  `wallet` VARCHAR(42) NULL,
  `_createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `_createUser` INT NULL,
  `_updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_updateUser` INT NULL,
  PRIMARY KEY (`id`));


-- -----------------------------------------------------
-- Table `apiKey`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `apiKey` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` INT NULL,
  `apiKey` VARCHAR(36) NOT NULL,
  `project_uuid` VARCHAR(36) NOT NULL,
  `_createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `_createUser` INT NULL,
  `_updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_updateUser` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `key_UNIQUE` (`key` ASC) VISIBLE);


-- -----------------------------------------------------
-- Table `role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `role` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` INT NULL,
  `name` VARCHAR(45) NULL,
  `type` INT NULL COMMENT '1- user role\n2- api key role',
  `_createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `_createUser` INT NULL,
  `_updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_updateUser` INT NULL,
  PRIMARY KEY (`id`));


-- -----------------------------------------------------
-- Table `authUser_role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `authUser_role` (
  `role_id` INT NOT NULL,
  `authUser_id` INT NOT NULL,
  `status` INT NULL,
  `project_uuid` VARCHAR(36) NOT NULL,
  `user_uuid` VARCHAR(36) NOT NULL,
  `_createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `_createUser` INT NULL,
  `_updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_updateUser` INT NULL,
  INDEX `fk_authUser_role_authUser_idx` (`authUser_id` ASC) VISIBLE,
  PRIMARY KEY (`authUser_id`, `role_id`),
  INDEX `fk_authUser_role_role1_idx` (`role_id` ASC) VISIBLE,
  CONSTRAINT `fk_authUser_role_authUser`
    FOREIGN KEY (`authUser_id`)
    REFERENCES `authUser` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_authUser_role_role1`
    FOREIGN KEY (`role_id`)
    REFERENCES `role` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION);


-- -----------------------------------------------------
-- Table `permission`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `permission` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` INT NULL,
  `name` VARCHAR(45) NULL,
  `_createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `_createUser` INT NULL,
  `_updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_updateUser` INT NULL,
  PRIMARY KEY (`id`));


-- -----------------------------------------------------
-- Table `role_permission`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permission` (
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `_createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `_createUser` INT NULL,
  `_updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_updateUser` INT NULL,
  INDEX `fk_role_permission_role1_idx` (`role_id` ASC) VISIBLE,
  PRIMARY KEY (`role_id`, `permission_id`),
  INDEX `fk_role_permission_permission1_idx` (`permission_id` ASC) VISIBLE,
  CONSTRAINT `fk_role_permission_role1`
    FOREIGN KEY (`role_id`)
    REFERENCES `role` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_role_permission_permission1`
    FOREIGN KEY (`permission_id`)
    REFERENCES `permission` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION);


-- -----------------------------------------------------
-- Table `apiKey_role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `apiKey_role` (
  `apiKey_id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `service_uuid` VARCHAR(36) NOT NULL,
  `project_uuid` VARCHAR(36) NOT NULL,
  `status` INT NULL,
  `_createTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `_createUser` INT NULL,
  `_updateTime` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_updateUser` INT NULL,
  PRIMARY KEY (`apiKey_id`, `role_id`, `service_uuid`),
  INDEX `fk_apiKey_role_role1_idx` (`role_id` ASC) VISIBLE,
  CONSTRAINT `fk_apiKey_role_apiKey1`
    FOREIGN KEY (`apiKey_id`)
    REFERENCES `apiKey` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_apiKey_role_role1`
    FOREIGN KEY (`role_id`)
    REFERENCES `role` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION);


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
