SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: `sproot`
--
CREATE DATABASE IF NOT EXISTS `sproot` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `sproot`;

-- --------------------------------------------------------

--
-- Table structure for table `automations`
--

CREATE TABLE IF NOT EXISTS `automations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `operator` varchar(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `automation_tags`
--

CREATE TABLE IF NOT EXISTS `automation_tags` (
  `tag` varchar(32) NOT NULL,
  PRIMARY KEY (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `automation_tag_lookup`
--

CREATE TABLE IF NOT EXISTS `automation_tag_lookup` (
  `automation_id` int(11) NOT NULL,
  `tag` varchar(32) NOT NULL,
  PRIMARY KEY (`automation_id`,`tag`),
  KEY `output_automation_tag_lookup_ibfk_2` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `outputs`
--

CREATE TABLE IF NOT EXISTS `outputs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `model` varchar(64) NOT NULL,
  `address` varchar(64) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `color` varchar(64) NOT NULL,
  `pin` int(11) NOT NULL,
  `isPwm` tinyint(1) NOT NULL,
  `isInvertedPwm` tinyint(1) NOT NULL,
  `automationTimeout` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `output_actions`
--

CREATE TABLE IF NOT EXISTS `output_actions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `automation_id` int(11) NOT NULL,
  `output_id` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `automation_id` (`automation_id`),
  KEY `output_id` (`output_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `output_actions_view`
-- (See below for the actual view)
--
CREATE TABLE IF NOT EXISTS `output_actions_view` (
`automationId` int(11)
,`outputId` int(11)
,`id` int(11)
,`name` varchar(32)
,`value` int(11)
,`operator` varchar(6)
);

-- --------------------------------------------------------

--
-- Table structure for table `output_conditions`
--

CREATE TABLE IF NOT EXISTS `output_conditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `automation_id` int(11) NOT NULL,
  `groupType` varchar(6) NOT NULL,
  `operator` varchar(16) NOT NULL,
  `comparisonValue` decimal(12,7) NOT NULL,
  `output_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `output_id` (`output_id`),
  KEY `automation_id` (`automation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `output_data`
--

CREATE TABLE IF NOT EXISTS `output_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `output_id` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  `controlMode` varchar(32) NOT NULL,
  `logTime` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `output_id` (`output_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sensors`
--

CREATE TABLE IF NOT EXISTS `sensors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) DEFAULT NULL,
  `model` varchar(64) NOT NULL,
  `address` varchar(64) DEFAULT NULL,
  `color` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sensor_conditions`
--

CREATE TABLE IF NOT EXISTS `sensor_conditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `automation_id` int(11) NOT NULL,
  `groupType` varchar(6) NOT NULL,
  `operator` varchar(16) NOT NULL,
  `comparisonValue` decimal(12,7) NOT NULL,
  `sensor_id` int(11) NOT NULL,
  `readingType` varchar(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sensor_id` (`sensor_id`),
  KEY `automation_id` (`automation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sensor_data`
--

CREATE TABLE IF NOT EXISTS `sensor_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sensor_id` int(11) NOT NULL,
  `metric` varchar(32) NOT NULL,
  `data` decimal(12,7) NOT NULL,
  `units` varchar(16) NOT NULL,
  `logTime` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sensor_id` (`sensor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `time_conditions`
--

CREATE TABLE IF NOT EXISTS `time_conditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `automation_id` int(11) NOT NULL,
  `groupType` varchar(6) NOT NULL,
  `startTime` varchar(8) DEFAULT NULL,
  `endTime` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `automation_id` (`automation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `username` varchar(32) NOT NULL,
  `hash` char(60) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure for view `output_actions_view`
--
DROP TABLE IF EXISTS `output_actions_view`;

CREATE VIEW IF NOT EXISTS `output_actions_view`  AS SELECT `automations`.`id` AS `automationId`, `output_actions`.`output_id` AS `outputId`, `output_actions`.`id` AS `id`, `automations`.`name` AS `name`, `output_actions`.`value` AS `value`, `automations`.`operator` AS `operator` FROM (`automations` join `output_actions` on(`automations`.`id` = `output_actions`.`automation_id`)) ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `automation_tag_lookup`
--
ALTER TABLE `automation_tag_lookup`
  ADD CONSTRAINT `automation_tag_lookup_ibfk_2` FOREIGN KEY (`tag`) REFERENCES `automation_tags` (`tag`) ON DELETE CASCADE,
  ADD CONSTRAINT `automation_tag_lookup_ibfk_3` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `output_actions`
--
ALTER TABLE `output_actions`
  ADD CONSTRAINT `output_actions_ibfk_1` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `output_actions_ibfk_2` FOREIGN KEY (`output_id`) REFERENCES `outputs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `output_conditions`
--
ALTER TABLE `output_conditions`
  ADD CONSTRAINT `output_conditions_ibfk_2` FOREIGN KEY (`output_id`) REFERENCES `outputs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `output_conditions_ibfk_3` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `output_data`
--
ALTER TABLE `output_data`
  ADD CONSTRAINT `output_data_ibfk_1` FOREIGN KEY (`output_id`) REFERENCES `outputs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sensor_conditions`
--
ALTER TABLE `sensor_conditions`
  ADD CONSTRAINT `sensor_conditions_ibfk_2` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sensor_conditions_ibfk_3` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sensor_data`
--
ALTER TABLE `sensor_data`
  ADD CONSTRAINT `sensor_data_ibfk_1` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `time_conditions`
--
ALTER TABLE `time_conditions`
  ADD CONSTRAINT `time_conditions_ibfk_1` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE;
COMMIT;