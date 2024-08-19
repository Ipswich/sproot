START TRANSACTION;

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `sproot` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `sproot`;

CREATE TABLE IF NOT EXISTS `outputs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `model` varchar(64) NOT NULL,
  `address` varchar(64) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `color` varchar(64) NOT NULL,
  `pin` int(11) NOT NULL,
  `isPwm` tinyint(1) NOT NULL,
  `isInvertedPwm` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `automations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `output_id` int(11) NOT NULL,
  `name` varchar(64) NOT NULL,
  `value` int(11) NOT NULL,
  `operator` varchar(6) NOT NULL,
  `startTime` varchar(8) DEFAULT NULL,
  `endTime` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `output_id` (`output_id`),
  CONSTRAINT `automations_ibfk_2` FOREIGN KEY (`output_id`) REFERENCES `outputs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `output_automation_conditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `automation_id` int(11) NOT NULL,
  `type` varchar(6) NOT NULL,
  `operator` varchar(16) NOT NULL,
  `comparisonValue` int(11) NOT NULL,
  `output_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `automation_id` (`automation_id`),
  KEY `output_id` (`output_id`),
  CONSTRAINT `output_automation_conditions_ibfk_1` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `output_automation_conditions_ibfk_2` FOREIGN KEY (`output_id`) REFERENCES `outputs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `sensors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) DEFAULT NULL,
  `model` varchar(64) NOT NULL,
  `address` varchar(64) DEFAULT NULL,
  `color` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `sensor_automation_conditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `automation_id` int(11) NOT NULL,
  `type` varchar(6) NOT NULL,
  `operator` varchar(16) NOT NULL,
  `comparisonValue` int(11) NOT NULL,
  `sensor_id` int(11) NOT NULL,
  `readingType` varchar(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `automation_id` (`automation_id`),
  KEY `sensor_id` (`sensor_id`),
  CONSTRAINT `sensor_automation_conditions_ibfk_1` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sensor_automation_conditions_ibfk_2` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `sensor_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sensor_id` int(11) NOT NULL,
  `metric` varchar(32) NOT NULL,
  `data` decimal(12,7) NOT NULL,
  `units` varchar(16) NOT NULL,
  `logTime` datetime NOT NULL DEFAULT current_timestamp(), #SERVER STORES THIS AS ISO8601, RESPECT IT ON READS/WRITES
  PRIMARY KEY (`id`),
  KEY `sensor_id` (`sensor_id`),
  CONSTRAINT `sensor_data_ibfk_1` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `output_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `output_id` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  `controlMode` varchar(32) NOT NULL,
  `logTime` datetime NOT NULL DEFAULT current_timestamp(), #SERVER STORES THIS AS ISO8601, RESPECT IT ON READS/WRITES
  PRIMARY KEY (`id`),
  KEY `output_id` (`output_id`),
  CONSTRAINT `output_data_ibfk_1` FOREIGN KEY (`output_id`) REFERENCES `outputs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `users` (
  `username` varchar(32) NOT NULL,
  `hash` char(60) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `outputs` (`model`, `address`, `name`, `pin`, `isPwm`, `isInvertedPwm`) VALUES
('pca9685',	'0x40',	'Relay #1',	0,	0,	0),
('pca9685',	'0x40',	'Relay #2',	1,	0,	0),
('pca9685',	'0x40',	'Relay #3',	2,	0,	0),
('pca9685',	'0x40',	'Relay #4',	3,	0,	0),
('pca9685',	'0x40',	'Pwm #1',	4,	1,	0),
('pca9685',	'0x40',	'Pwm #2',	5,	1,	0),
('pca9685',	'0x40',	'Pwm #3',	6,	1,	0),
('pca9685',	'0x40',	'Pwm #4',	7,	1,	0);

COMMIT;