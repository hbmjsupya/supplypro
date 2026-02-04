-- MySQL dump 10.13  Distrib 9.6.0, for macos15 (arm64)
--
-- Host: 127.0.0.1    Database: supplypro
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `supplypro`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `supplypro` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `supplypro`;

--
-- Table structure for table `brand_supplier`
--

DROP TABLE IF EXISTS `brand_supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brand_supplier` (
  `brand_id` bigint NOT NULL,
  `supplier_id` bigint NOT NULL,
  PRIMARY KEY (`brand_id`,`supplier_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `brand_supplier_ibfk_1` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`),
  CONSTRAINT `brand_supplier_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brand_supplier`
--

LOCK TABLES `brand_supplier` WRITE;
/*!40000 ALTER TABLE `brand_supplier` DISABLE KEYS */;
INSERT INTO `brand_supplier` VALUES (1,32),(3,32),(1,33),(3,33);
/*!40000 ALTER TABLE `brand_supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `trademark_no` varchar(255) DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'ENABLED',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'测试品牌','001110',NULL,'ENABLED','2026-01-28 05:22:05','2026-01-28 05:22:05'),(2,'Test Brand',NULL,NULL,'ENABLED','2026-01-28 06:18:25','2026-01-28 06:18:25'),(3,'测试品牌01','2312121',NULL,'ENABLED','2026-01-28 06:33:50','2026-01-28 06:33:50');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_no` varchar(50) NOT NULL COMMENT '客户编号',
  `name` varchar(200) NOT NULL COMMENT '客户名称',
  `contact_person` varchar(100) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `status` varchar(20) DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_no` (`customer_no`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'CUST001','Customer_1_Ltd','Client_1','13920532119','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(2,'CUST002','Customer_2_Ltd','Client_2','13914459943','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(3,'CUST003','Customer_3_Ltd','Client_3','13975503705','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(4,'CUST004','Customer_4_Ltd','Client_4','13917267007','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(5,'CUST005','Customer_5_Ltd','Client_5','13962214156','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(6,'CUST006','Customer_6_Ltd','Client_6','13970479772','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(7,'CUST007','Customer_7_Ltd','Client_7','13983542541','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(8,'CUST008','Customer_8_Ltd','Client_8','13927903485','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(9,'CUST009','Customer_9_Ltd','Client_9','13969957957','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(10,'CUST010','Customer_10_Ltd','Client_10','13951736566','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(11,'CUST011','Customer_11_Ltd','Client_11','13952057341','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(12,'CUST012','Customer_12_Ltd','Client_12','13958120427','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(13,'CUST013','Customer_13_Ltd','Client_13','13987555726','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(14,'CUST014','Customer_14_Ltd','Client_14','13985937480','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(15,'CUST015','Customer_15_Ltd','Client_15','13976831439','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(16,'CUST016','Customer_16_Ltd','Client_16','13929393067','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(17,'CUST017','Customer_17_Ltd','Client_17','13934873072','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(18,'CUST018','Customer_18_Ltd','Client_18','13961618869','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(19,'CUST019','Customer_19_Ltd','Client_19','13957356414','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(20,'CUST020','Customer_20_Ltd','Client_20','13964107065','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flyway_schema_history`
--

DROP TABLE IF EXISTS `flyway_schema_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flyway_schema_history` (
  `installed_rank` int NOT NULL,
  `version` varchar(50) DEFAULT NULL,
  `description` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `script` varchar(1000) NOT NULL,
  `checksum` int DEFAULT NULL,
  `installed_by` varchar(100) NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flyway_schema_history`
--

LOCK TABLES `flyway_schema_history` WRITE;
/*!40000 ALTER TABLE `flyway_schema_history` DISABLE KEYS */;
INSERT INTO `flyway_schema_history` VALUES (1,'1.0','init schema','SQL','V1.0__init_schema.sql',2007379957,'root','2026-01-28 05:19:30',107,1),(2,'1.1','mock data cn','SQL','V1.1__mock_data_cn.sql',130819703,'root','2026-01-28 05:19:30',6,1),(3,'1.2','add distribution settlement','SQL','V1.2__add_distribution_settlement.sql',356419648,'root','2026-01-28 05:19:30',25,1),(4,'1.3','comprehensive mock data','SQL','V1.3__comprehensive_mock_data.sql',-1177692726,'root','2026-01-28 05:19:30',121,1),(5,'1.4','add brand tables','SQL','V1.4__add_brand_tables.sql',2077039606,'root','2026-01-28 05:19:30',12,1),(6,'1.5','convert enums to varchar','SQL','V1.5__convert_enums_to_varchar.sql',474465871,'root','2026-01-28 05:19:30',221,1),(7,'1.6','align entities tables','SQL','V1.6__align_entities_tables.sql',482941119,'root','2026-01-28 05:19:31',215,1),(8,'2.0','security schema','SQL','V2.0__security_schema.sql',1216754325,'root','2026-01-28 05:19:31',26,1),(9,'2.1','create stock flows','SQL','V2.1__create_stock_flows.sql',-1170419953,'root','2026-01-28 05:19:31',12,1),(10,'2.2','add missing columns','SQL','V2.2__add_missing_columns.sql',232895757,'root','2026-01-28 05:19:31',57,1),(11,'2.3','add moderator role','SQL','V2.3__add_moderator_role.sql',978929214,'root','2026-01-28 05:19:31',1,1),(12,'2.4','upgrade to v2 0','SQL','V2.4__upgrade_to_v2_0.sql',64906580,'root','2026-01-28 05:19:31',72,1),(13,'2.5','add settlement fields','SQL','V2.5__add_settlement_fields.sql',-763478953,'root','2026-01-28 05:19:31',29,1),(14,'2.6','init admin user','SQL','V2.6__init_admin_user.sql',-1159481789,'root','2026-01-28 05:19:31',2,1),(15,'2.7','init master bank','SQL','V2.7__init_master_bank.sql',-881697844,'root','2026-01-28 05:19:31',30,1),(16,'2.8','create region table','SQL','V2.8__create_region_table.sql',-2138651529,'root','2026-01-28 06:27:23',31,1),(17,'2.9','add region codes to supplier','SQL','V2.9__add_region_codes_to_supplier.sql',-871973852,'root','2026-01-28 06:27:24',37,1),(18,'3.0','enhance supplier schema','SQL','V3.0__enhance_supplier_schema.sql',557192455,'root','2026-01-28 08:12:11',569,1),(19,'3.1','add supplier sequence','SQL','V3.1__add_supplier_sequence.sql',-2061179711,'root','2026-01-28 09:41:37',4,1),(20,'3.2','add supplier coop start time','SQL','V3.2__add_supplier_coop_start_time.sql',275027620,'root','2026-01-28 09:41:37',28,1),(21,'3.3','add supplier receiver fields','SQL','V3.3__add_supplier_receiver_fields.sql',1781439192,'root','2026-01-28 09:50:32',32,1),(22,'3.4','add supplier prepayment warning','SQL','V3.4__add_supplier_prepayment_warning.sql',-1430499164,'root','2026-01-29 01:05:24',53,1),(23,'3.5','remove supplier unique constraints','SQL','V3.5__remove_supplier_unique_constraints.sql',496922229,'root','2026-01-29 02:35:31',91,1),(24,'3.6','make settlement amount nullable','SQL','V3.6__make_settlement_amount_nullable.sql',70264299,'root','2026-01-29 02:49:10',49,1),(25,'3.7','support multiple files','SQL','V3.7__support_multiple_files.sql',-573115292,'root','2026-01-29 05:09:50',108,1),(26,'4.0','create supplier files table','SQL','V4.0__create_supplier_files_table.sql',-1460433198,'root','2026-01-29 06:14:21',52,1),(27,'4.1','align logistics settlement','SQL','V4.1__align_logistics_settlement.sql',1974115125,'root','2026-01-29 09:34:57',57,1),(28,'4.2','enhance logistics provider','SQL','V4.2__enhance_logistics_provider.sql',-341728460,'root','2026-01-30 02:36:29',148,1),(29,'4.3','migrate settlement period','SQL','V4.3__migrate_settlement_period.sql',-1334518618,'root','2026-01-30 02:36:29',1,1);
/*!40000 ALTER TABLE `flyway_schema_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inbound_orders`
--

DROP TABLE IF EXISTS `inbound_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inbound_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `inbound_no` varchar(50) NOT NULL COMMENT '入库单号',
  `purchase_order_id` bigint DEFAULT NULL COMMENT '关联采购单ID',
  `warehouse_id` bigint NOT NULL COMMENT '仓库ID',
  `status` varchar(20) DEFAULT 'PENDING',
  `inbound_date` datetime DEFAULT NULL COMMENT '入库时间',
  `confirmed_by` varchar(50) DEFAULT NULL COMMENT '确认人',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inbound_no` (`inbound_no`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `warehouse_id` (`warehouse_id`),
  CONSTRAINT `inbound_orders_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `inbound_orders_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inbound_orders`
--

LOCK TABLES `inbound_orders` WRITE;
/*!40000 ALTER TABLE `inbound_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `inbound_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logistics_provider_accounts`
--

DROP TABLE IF EXISTS `logistics_provider_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logistics_provider_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `logistics_provider_id` bigint NOT NULL,
  `type` varchar(20) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `bank` varchar(100) DEFAULT NULL,
  `account` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `status` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_logistics_provider_accounts_provider` (`logistics_provider_id`),
  CONSTRAINT `fk_logistics_provider_accounts_provider` FOREIGN KEY (`logistics_provider_id`) REFERENCES `logistics_providers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logistics_provider_accounts`
--

LOCK TABLES `logistics_provider_accounts` WRITE;
/*!40000 ALTER TABLE `logistics_provider_accounts` DISABLE KEYS */;
INSERT INTO `logistics_provider_accounts` VALUES (12,12,'PERSONAL','萨达说','中国工商银行','1231231231231231',0,1,'2026-01-30 02:50:48','2026-01-30 02:50:48'),(13,12,'COMPANY','测试物流供应商','中国农业银行','211231231',1,1,'2026-01-30 02:50:48','2026-01-30 02:50:48'),(14,13,'COMPANY','我来测试','中国农业银行','1231231231231231',1,1,'2026-01-30 02:52:02','2026-01-30 02:52:02');
/*!40000 ALTER TABLE `logistics_provider_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logistics_provider_files`
--

DROP TABLE IF EXISTS `logistics_provider_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logistics_provider_files` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `logistics_provider_id` bigint NOT NULL,
  `category` varchar(50) NOT NULL,
  `original_file_name` varchar(255) NOT NULL,
  `stored_file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `upload_time` datetime DEFAULT NULL,
  `uploader` varchar(100) DEFAULT NULL,
  `description` text,
  `version` int DEFAULT '1',
  `group_id` varchar(50) NOT NULL,
  `is_latest` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_logistics_provider_files_provider` (`logistics_provider_id`),
  CONSTRAINT `fk_logistics_provider_files_provider` FOREIGN KEY (`logistics_provider_id`) REFERENCES `logistics_providers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logistics_provider_files`
--

LOCK TABLES `logistics_provider_files` WRITE;
/*!40000 ALTER TABLE `logistics_provider_files` DISABLE KEYS */;
/*!40000 ALTER TABLE `logistics_provider_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logistics_providers`
--

DROP TABLE IF EXISTS `logistics_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logistics_providers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `settlement_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settlement_period` int DEFAULT NULL,
  `prepayment_balance` decimal(19,2) DEFAULT NULL,
  `prepayment_warning` decimal(19,2) DEFAULT NULL,
  `purchaser_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_logistics_providers_purchaser` (`purchaser_id`),
  CONSTRAINT `fk_logistics_providers_purchaser` FOREIGN KEY (`purchaser_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logistics_providers`
--

LOCK TABLES `logistics_providers` WRITE;
/*!40000 ALTER TABLE `logistics_providers` DISABLE KEYS */;
INSERT INTO `logistics_providers` VALUES (12,'测试物流供应商','于涛','13241672829','ACTIVE','2026-01-30 02:50:48','2026-01-30 02:50:48','CASH',7,NULL,NULL,1),(13,'我来测试','王五','13333333333','ACTIVE','2026-01-30 02:52:02','2026-01-30 02:52:02','PREPAYMENT',NULL,NULL,10000.00,1);
/*!40000 ALTER TABLE `logistics_providers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logistics_tracks`
--

DROP TABLE IF EXISTS `logistics_tracks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logistics_tracks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `biz_type` varchar(20) NOT NULL COMMENT 'PURCHASE, INBOUND, OUTBOUND',
  `biz_no` varchar(50) NOT NULL COMMENT '关联业务单号',
  `logistics_provider` varchar(50) DEFAULT NULL COMMENT '物流商',
  `tracking_no` varchar(50) DEFAULT NULL COMMENT '运单号',
  `status` varchar(50) DEFAULT NULL COMMENT '物流状态',
  `location` varchar(100) DEFAULT NULL COMMENT '当前位置',
  `description` varchar(255) DEFAULT NULL COMMENT '详细描述',
  `event_time` datetime NOT NULL COMMENT '发生时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_biz_no` (`biz_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物流轨迹明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logistics_tracks`
--

LOCK TABLES `logistics_tracks` WRITE;
/*!40000 ALTER TABLE `logistics_tracks` DISABLE KEYS */;
/*!40000 ALTER TABLE `logistics_tracks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `master_bank`
--

DROP TABLE IF EXISTS `master_bank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_bank` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bank_code` varchar(50) NOT NULL COMMENT 'Bank Code',
  `bank_name` varchar(100) NOT NULL COMMENT 'Bank Name',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bank_code` (`bank_code`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Master Bank Information';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_bank`
--

LOCK TABLES `master_bank` WRITE;
/*!40000 ALTER TABLE `master_bank` DISABLE KEYS */;
INSERT INTO `master_bank` VALUES (1,'ICBC','中国工商银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(2,'ABC','中国农业银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(3,'BOC','中国银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(4,'CCB','中国建设银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(5,'BOCOM','交通银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(6,'PSBC','中国邮政储蓄银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(7,'CMB','招商银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(8,'SPDB','上海浦东发展银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(9,'CIB','兴业银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(10,'HXB','华夏银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(11,'CMBC','中国民生银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(12,'CEB','中国光大银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(13,'PAB','平安银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(14,'GDB','广发银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(15,'JSB','江苏银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(16,'BOB','北京银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(17,'NBCB','宁波银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(18,'SHB','上海银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(19,'NJCB','南京银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(20,'HZB','杭州银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(21,'HSBC','汇丰银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(22,'SCB','渣打银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(23,'BEA','东亚银行','2026-01-28 05:19:31','2026-01-28 05:19:31'),(24,'CITI','花旗银行','2026-01-28 05:19:31','2026-01-28 05:19:31');
/*!40000 ALTER TABLE `master_bank` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `outbound_orders`
--

DROP TABLE IF EXISTS `outbound_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outbound_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `outbound_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouse_id` bigint DEFAULT NULL,
  `logistics_provider_id` bigint DEFAULT NULL,
  `consignee` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consignee_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consignee_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sales_order_id` bigint DEFAULT NULL,
  `outbound_date` datetime DEFAULT NULL,
  `confirmed_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logistics_fee` decimal(15,2) DEFAULT NULL,
  `settlement_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'UNSETTLED',
  `source_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SALES, DROPSHIP',
  `source_ref_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源单号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`outbound_no`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `logistics_provider_id` (`logistics_provider_id`),
  KEY `fk_outbound_sales_order` (`sales_order_id`),
  CONSTRAINT `fk_outbound_sales_order` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `outbound_orders_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `outbound_orders_ibfk_2` FOREIGN KEY (`logistics_provider_id`) REFERENCES `logistics_providers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `outbound_orders`
--

LOCK TABLES `outbound_orders` WRITE;
/*!40000 ALTER TABLE `outbound_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `outbound_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_bundles`
--

DROP TABLE IF EXISTS `product_bundles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_bundles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parent_product_id` bigint NOT NULL COMMENT '父商品(Bundle)ID',
  `child_product_id` bigint NOT NULL COMMENT '子商品(SKU)ID',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '包含数量',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parent_child` (`parent_product_id`,`child_product_id`),
  UNIQUE KEY `UK79rg2xn2gdir5vdgmas4d16wb` (`parent_product_id`,`child_product_id`),
  KEY `child_product_id` (`child_product_id`),
  CONSTRAINT `product_bundles_ibfk_1` FOREIGN KEY (`parent_product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `product_bundles_ibfk_2` FOREIGN KEY (`child_product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='组合商品关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_bundles`
--

LOCK TABLES `product_bundles` WRITE;
/*!40000 ALTER TABLE `product_bundles` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_bundles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sku_code` varchar(50) NOT NULL COMMENT 'SKU编码',
  `name` varchar(200) NOT NULL COMMENT '商品名称',
  `brand` varchar(100) DEFAULT NULL COMMENT '品牌',
  `category` varchar(100) DEFAULT NULL COMMENT '分类',
  `spec` varchar(100) DEFAULT NULL COMMENT '规格',
  `cost_price` decimal(10,2) NOT NULL COMMENT '成本价',
  `status` varchar(20) DEFAULT 'ACTIVE',
  `default_supplier_id` bigint DEFAULT NULL COMMENT '默认供应商ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tax_class` varchar(50) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `tax_code` varchar(50) DEFAULT NULL,
  `logistics_template` varchar(255) DEFAULT NULL,
  `promo_file` varchar(255) DEFAULT NULL,
  `is_bundle` tinyint(1) DEFAULT '0' COMMENT '是否为组合商品',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku_code` (`sku_code`),
  KEY `default_supplier_id` (`default_supplier_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`default_supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商品信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'SKU001','高性能CPU处理器','Intel','电子元器件','i9-13900K',3500.00,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(2,'SKU002','32GB DDR5内存条','Kingston','电子元器件','32GB 6000MHz',800.00,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(3,'SKU003','2TB NVMe固态硬盘','Samsung','存储设备','980 PRO',1200.00,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(4,'SKU004','精密轴承','SKF','机械配件','6204-2RSH',25.00,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(5,'SKU005','ABS工程塑料颗粒','Sinopec','原材料','25kg/袋',300.00,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(6,'SKU006','瓦楞纸箱','Generic','包装材料','50x40x30cm',5.00,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(7,'SKU007','Product_7','Brand_3','Packaging','Spec_7',843.64,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(8,'SKU008','Product_8','Brand_7','Electronics','Spec_8',420.81,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(9,'SKU009','Product_9','Brand_4','Machinery','Spec_9',634.03,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(10,'SKU010','Product_10','Brand_8','Machinery','Spec_10',325.66,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(11,'SKU011','Product_11','Brand_4','Raw Materials','Spec_11',727.30,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(12,'SKU012','Product_12','Brand_8','Office','Spec_12',383.98,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(13,'SKU013','Product_13','Brand_10','Electronics','Spec_13',701.59,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(14,'SKU014','Product_14','Brand_8','Packaging','Spec_14',476.33,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(15,'SKU015','Product_15','Brand_8','Office','Spec_15',830.91,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(16,'SKU016','Product_16','Brand_2','Machinery','Spec_16',473.50,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(17,'SKU017','Product_17','Brand_8','Machinery','Spec_17',341.78,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(18,'SKU018','Product_18','Brand_2','Office','Spec_18',981.13,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(19,'SKU019','Product_19','Brand_7','Raw Materials','Spec_19',687.73,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(20,'SKU020','Product_20','Brand_3','Raw Materials','Spec_20',982.87,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(21,'SKU021','Product_21','Brand_8','Packaging','Spec_21',735.68,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(22,'SKU022','Product_22','Brand_1','Machinery','Spec_22',64.10,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(23,'SKU023','Product_23','Brand_8','Electronics','Spec_23',49.36,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(24,'SKU024','Product_24','Brand_6','Packaging','Spec_24',620.02,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(25,'SKU025','Product_25','Brand_8','Raw Materials','Spec_25',37.18,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(26,'SKU026','Product_26','Brand_4','Machinery','Spec_26',900.72,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(27,'SKU027','Product_27','Brand_6','Packaging','Spec_27',51.46,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(28,'SKU028','Product_28','Brand_7','Electronics','Spec_28',199.12,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(29,'SKU029','Product_29','Brand_6','Office','Spec_29',572.85,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(30,'SKU030','Product_30','Brand_4','Electronics','Spec_30',628.48,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(31,'SKU031','Product_31','Brand_10','Packaging','Spec_31',808.49,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(32,'SKU032','Product_32','Brand_8','Office','Spec_32',309.02,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(33,'SKU033','Product_33','Brand_3','Raw Materials','Spec_33',432.42,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(34,'SKU034','Product_34','Brand_5','Electronics','Spec_34',191.36,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(35,'SKU035','Product_35','Brand_3','Office','Spec_35',306.02,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(36,'SKU036','Product_36','Brand_6','Electronics','Spec_36',520.34,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(37,'SKU037','Product_37','Brand_5','Raw Materials','Spec_37',783.53,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(38,'SKU038','Product_38','Brand_6','Packaging','Spec_38',744.85,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(39,'SKU039','Product_39','Brand_8','Electronics','Spec_39',872.78,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(40,'SKU040','Product_40','Brand_10','Raw Materials','Spec_40',610.72,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(41,'SKU041','Product_41','Brand_5','Raw Materials','Spec_41',963.61,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(42,'SKU042','Product_42','Brand_10','Packaging','Spec_42',694.28,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(43,'SKU043','Product_43','Brand_8','Raw Materials','Spec_43',172.76,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(44,'SKU044','Product_44','Brand_4','Packaging','Spec_44',638.39,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(45,'SKU045','Product_45','Brand_5','Packaging','Spec_45',258.06,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(46,'SKU046','Product_46','Brand_2','Office','Spec_46',560.72,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(47,'SKU047','Product_47','Brand_2','Machinery','Spec_47',61.14,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(48,'SKU048','Product_48','Brand_6','Electronics','Spec_48',775.30,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(49,'SKU049','Product_49','Brand_8','Raw Materials','Spec_49',915.92,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(50,'SKU050','Product_50','Brand_6','Raw Materials','Spec_50',494.21,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(51,'SKU051','Product_51','Brand_2','Machinery','Spec_51',927.01,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(52,'SKU052','Product_52','Brand_9','Electronics','Spec_52',664.24,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(53,'SKU053','Product_53','Brand_2','Office','Spec_53',190.17,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(54,'SKU054','Product_54','Brand_8','Packaging','Spec_54',354.95,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(55,'SKU055','Product_55','Brand_6','Machinery','Spec_55',917.86,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0),(56,'SKU056','Product_56','Brand_1','Raw Materials','Spec_56',551.92,'ACTIVE',NULL,'2026-01-28 05:19:30','2026-01-28 08:12:11',NULL,NULL,NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL COMMENT '采购单ID',
  `product_id` bigint NOT NULL COMMENT '商品ID',
  `quantity` int NOT NULL COMMENT '采购数量',
  `unit_price` decimal(10,2) NOT NULL COMMENT '采购单价',
  `total_price` decimal(15,2) NOT NULL COMMENT '总价',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购订单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
INSERT INTO `purchase_order_items` VALUES (1,1,1,10,3500.00,35000.00),(2,1,2,10,800.00,8000.00),(3,2,3,20,1200.00,24000.00),(4,3,27,78,51.46,4013.88),(5,3,43,82,172.76,14166.32),(6,3,15,25,830.91,20772.75),(7,3,34,66,191.36,12629.76),(8,3,23,14,49.36,691.04),(9,4,41,29,963.61,27944.69),(10,4,30,93,628.48,58448.64),(11,5,27,90,51.46,4631.40),(12,5,25,56,37.18,2082.08),(13,6,25,41,37.18,1524.38),(14,7,13,97,701.59,68054.23),(15,7,21,59,735.68,43405.12),(16,7,55,69,917.86,63332.34),(17,8,21,58,735.68,42669.44),(18,8,13,81,701.59,56828.79),(19,8,45,71,258.06,18322.26),(20,9,30,11,628.48,6913.28),(21,9,51,56,927.01,51912.56),(22,9,56,36,551.92,19869.12),(23,9,37,17,783.53,13320.01),(24,10,18,49,981.13,48075.37),(25,11,8,16,420.81,6732.96),(26,11,26,81,900.72,72958.32),(27,11,12,19,383.98,7295.62),(28,11,22,10,64.10,641.00),(29,11,43,21,172.76,3627.96),(30,12,25,84,37.18,3123.12),(31,12,9,60,634.03,38041.80),(32,12,50,64,494.21,31629.44),(33,12,39,63,872.78,54985.14),(34,13,47,83,61.14,5074.62),(35,13,9,41,634.03,25995.23),(36,13,23,24,49.36,1184.64),(37,13,13,90,701.59,63143.10),(38,14,28,97,199.12,19314.64),(39,14,48,12,775.30,9303.60),(40,14,38,13,744.85,9683.05),(41,14,33,46,432.42,19891.32),(42,15,31,77,808.49,62253.73),(43,15,31,86,808.49,69530.14),(44,15,15,43,830.91,35729.13),(45,15,8,47,420.81,19778.07),(46,15,52,66,664.24,43839.84),(47,16,52,32,664.24,21255.68),(48,16,45,77,258.06,19870.62),(49,16,39,80,872.78,69822.40),(50,16,14,12,476.33,5715.96),(51,16,32,51,309.02,15760.02),(52,17,42,54,694.28,37491.12),(53,17,47,88,61.14,5380.32),(54,17,9,84,634.03,53258.52),(55,17,48,17,775.30,13180.10),(56,18,11,53,727.30,38546.90),(57,18,48,18,775.30,13955.40),(58,18,15,66,830.91,54840.06),(59,19,55,71,917.86,65168.06),(60,19,43,72,172.76,12438.72),(61,19,31,53,808.49,42849.97),(62,19,28,88,199.12,17522.56),(63,20,53,71,190.17,13502.07),(64,20,39,46,872.78,40147.88),(65,20,43,87,172.76,15030.12),(66,21,47,34,61.14,2078.76),(67,21,18,45,981.13,44150.85),(68,21,8,46,420.81,19357.26),(69,21,56,24,551.92,13246.08),(70,21,40,70,610.72,42750.40),(71,22,9,84,634.03,53258.52),(72,23,26,62,900.72,55844.64),(73,23,7,95,843.64,80145.80),(74,23,9,59,634.03,37407.77),(75,23,13,33,701.59,23152.47),(76,23,52,59,664.24,39190.16),(77,24,33,69,432.42,29836.98),(78,24,7,75,843.64,63273.00),(79,24,7,88,843.64,74240.32),(80,24,35,67,306.02,20503.34),(81,24,43,29,172.76,5010.04),(82,25,16,56,473.50,26516.00),(83,25,7,65,843.64,54836.60),(84,25,23,82,49.36,4047.52),(85,26,48,82,775.30,63574.60),(86,26,17,19,341.78,6493.82),(87,26,36,27,520.34,14049.18),(88,26,54,54,354.95,19167.30),(89,26,32,25,309.02,7725.50),(90,27,17,71,341.78,24266.38),(91,27,11,92,727.30,66911.60),(92,27,48,79,775.30,61248.70),(93,28,29,17,572.85,9738.45),(94,28,23,20,49.36,987.20),(95,28,23,83,49.36,4096.88),(96,28,27,96,51.46,4940.16),(97,29,20,54,982.87,53074.98),(98,29,21,72,735.68,52968.96),(99,29,14,20,476.33,9526.60),(100,30,53,18,190.17,3423.06),(101,30,8,37,420.81,15569.97),(102,30,32,20,309.02,6180.40),(103,30,24,12,620.02,7440.24),(104,31,32,74,309.02,22867.48),(105,31,36,57,520.34,29659.38),(106,31,18,86,981.13,84377.18),(107,31,56,16,551.92,8830.72),(108,31,24,82,620.02,50841.64),(109,32,36,94,520.34,48911.96),(110,32,45,25,258.06,6451.50),(111,32,42,45,694.28,31242.60),(112,32,36,100,520.34,52034.00);
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '采购订单编号',
  `supplier_id` bigint NOT NULL COMMENT '供应商ID',
  `warehouse_id` bigint NOT NULL COMMENT '目标仓库ID',
  `type` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'PENDING',
  `total_amount` decimal(15,2) NOT NULL COMMENT '订单总金额',
  `delivery_date` date DEFAULT NULL COMMENT '预计交付日期',
  `remark` text COMMENT '备注',
  `created_by` varchar(50) NOT NULL COMMENT '创建人',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `biz_type` varchar(50) DEFAULT NULL,
  `biz_no` varchar(50) DEFAULT NULL,
  `settlement_status` varchar(20) DEFAULT NULL,
  `adjust_status` varchar(20) DEFAULT NULL,
  `refund_status` varchar(20) DEFAULT NULL,
  `project` varchar(50) DEFAULT NULL,
  `third_party_platform` varchar(50) DEFAULT NULL,
  `third_party_no` varchar(50) DEFAULT NULL,
  `platform_order_no` varchar(50) DEFAULT NULL,
  `freight` decimal(15,2) DEFAULT NULL,
  `settlement_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `FKc6xbe43qy76y8121t0kl1bnlh` (`settlement_id`),
  CONSTRAINT `FKc6xbe43qy76y8121t0kl1bnlh` FOREIGN KEY (`settlement_id`) REFERENCES `settlement_orders` (`id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购订单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `regions`
--

DROP TABLE IF EXISTS `regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `regions` (
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `parent_code` varchar(20) DEFAULT NULL,
  `level` int NOT NULL,
  PRIMARY KEY (`code`),
  KEY `idx_regions_parent_code` (`parent_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `regions`
--

LOCK TABLES `regions` WRITE;
/*!40000 ALTER TABLE `regions` DISABLE KEYS */;
/*!40000 ALTER TABLE `regions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '角色名称',
  `description` varchar(200) DEFAULT NULL COMMENT '描述',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ROLE_ADMIN','系统管理员','2026-01-28 05:19:31','2026-01-28 05:19:31'),(2,'ROLE_USER','普通用户','2026-01-28 05:19:31','2026-01-28 05:19:31'),(3,'ROLE_PURCHASER','采购员','2026-01-28 05:19:31','2026-01-28 05:19:31'),(4,'ROLE_WAREHOUSE_MANAGER','仓库管理员','2026-01-28 05:19:31','2026-01-28 05:19:31'),(5,'ROLE_MODERATOR','内容审核员','2026-01-28 05:19:31','2026-01-28 05:19:31');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_items`
--

DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL COMMENT '销售订单ID',
  `product_id` bigint NOT NULL COMMENT '商品ID',
  `quantity` int NOT NULL COMMENT '销售数量',
  `unit_price` decimal(10,2) NOT NULL COMMENT '销售单价',
  `total_price` decimal(15,2) NOT NULL COMMENT '总价',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `sales_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `sales_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_items`
--

LOCK TABLES `sales_order_items` WRITE;
/*!40000 ALTER TABLE `sales_order_items` DISABLE KEYS */;
INSERT INTO `sales_order_items` VALUES (1,1,29,18,859.28,15467.04),(2,1,48,17,1162.95,19770.15),(3,1,40,5,916.08,4580.40),(4,1,31,3,1212.74,3638.22),(5,1,54,16,532.42,8518.72),(6,2,38,7,1117.28,7820.96),(7,2,7,8,1265.46,10123.68),(8,2,40,11,916.08,10076.88),(9,2,13,15,1052.38,15785.70),(10,2,16,3,710.25,2130.75),(11,3,36,10,780.51,7805.10),(12,3,34,17,287.04,4879.68),(13,3,30,19,942.72,17911.68),(14,3,16,9,710.25,6392.25),(15,3,32,16,463.53,7416.48),(16,4,35,18,459.03,8262.54),(17,4,56,15,827.88,12418.20),(18,4,41,14,1445.41,20235.74),(19,4,48,13,1162.95,15118.35),(20,4,14,12,714.50,8574.00),(21,5,16,12,710.25,8523.00),(22,5,44,8,957.59,7660.72),(23,5,45,14,387.09,5419.26),(24,5,14,7,714.50,5001.50),(25,5,41,18,1445.41,26017.38),(26,6,30,4,942.72,3770.88),(27,6,24,14,930.03,13020.42),(28,6,49,12,1373.88,16486.56),(29,6,52,12,996.36,11956.32),(30,7,7,16,1265.46,20247.36),(31,8,30,6,942.72,5656.32),(32,8,26,9,1351.08,12159.72),(33,8,22,16,96.15,1538.40),(34,8,31,6,1212.74,7276.44),(35,9,49,14,1373.88,19234.32),(36,9,30,14,942.72,13198.08),(37,9,47,5,91.71,458.55),(38,9,9,19,951.04,18069.76),(39,10,17,10,512.67,5126.70),(40,10,47,5,91.71,458.55),(41,10,44,20,957.59,19151.80),(42,10,48,1,1162.95,1162.95),(43,10,36,12,780.51,9366.12),(44,11,30,5,942.72,4713.60),(45,11,45,10,387.09,3870.90),(46,12,35,6,459.03,2754.18),(47,13,37,14,1175.30,16454.20),(48,14,56,5,827.88,4139.40),(49,14,52,4,996.36,3985.44),(50,14,15,4,1246.37,4985.48),(51,14,43,4,259.14,1036.56),(52,15,43,18,259.14,4664.52),(53,15,41,6,1445.41,8672.46),(54,15,7,7,1265.46,8858.22),(55,15,20,14,1474.31,20640.34),(56,16,34,4,287.04,1148.16),(57,16,49,11,1373.88,15112.68),(58,16,9,5,951.04,4755.20),(59,16,38,20,1117.28,22345.60),(60,17,47,20,91.71,1834.20),(61,17,27,4,77.19,308.76),(62,17,52,9,996.36,8967.24),(63,17,23,2,74.04,148.08),(64,17,43,3,259.14,777.42),(65,18,44,16,957.59,15321.44),(66,18,14,19,714.50,13575.50),(67,18,52,11,996.36,10959.96),(68,19,47,1,91.71,91.71),(69,19,40,8,916.08,7328.64),(70,19,8,18,631.22,11361.96),(71,19,46,11,841.08,9251.88),(72,19,51,13,1390.51,18076.63),(73,20,20,16,1474.31,23588.96),(74,20,53,14,285.25,3993.50),(75,20,51,5,1390.51,6952.55),(76,20,52,17,996.36,16938.12),(77,21,19,12,1031.60,12379.20),(78,21,38,7,1117.28,7820.96),(79,22,8,10,631.22,6312.20),(80,22,47,15,91.71,1375.65),(81,22,11,11,1090.95,12000.45),(82,22,22,10,96.15,961.50),(83,23,44,14,957.59,13406.26),(84,23,14,18,714.50,12861.00),(85,23,13,8,1052.38,8419.04),(86,23,10,8,488.49,3907.92),(87,23,21,12,1103.52,13242.24),(88,24,39,1,1309.17,1309.17),(89,25,7,19,1265.46,24043.74),(90,25,22,17,96.15,1634.55),(91,25,12,7,575.97,4031.79),(92,25,27,12,77.19,926.28),(93,25,51,3,1390.51,4171.53),(94,26,40,18,916.08,16489.44),(95,26,16,6,710.25,4261.50),(96,26,32,19,463.53,8807.07),(97,27,36,13,780.51,10146.63),(98,27,39,13,1309.17,17019.21),(99,27,22,17,96.15,1634.55),(100,28,53,15,285.25,4278.75),(101,28,48,2,1162.95,2325.90),(102,28,35,5,459.03,2295.15),(103,29,39,3,1309.17,3927.51),(104,29,18,17,1471.69,25018.73),(105,30,7,16,1265.46,20247.36),(106,30,22,6,96.15,576.90),(107,30,24,14,930.03,13020.42),(108,30,20,1,1474.31,1474.31),(109,30,52,20,996.36,19927.20);
/*!40000 ALTER TABLE `sales_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '销售订单编号',
  `customer_id` bigint NOT NULL COMMENT '客户ID',
  `warehouse_id` bigint NOT NULL COMMENT '发货仓库ID',
  `status` varchar(20) DEFAULT 'PENDING',
  `total_amount` decimal(15,2) NOT NULL COMMENT '订单总金额',
  `order_date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '下单时间',
  `created_by` varchar(50) NOT NULL COMMENT '创建人',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `delivery_date` date DEFAULT NULL,
  `remark` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `customer_id` (`customer_id`),
  KEY `warehouse_id` (`warehouse_id`),
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
INSERT INTO `sales_orders` VALUES (1,'SO20240001',7,3,'PENDING',51974.53,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(2,'SO20240002',7,7,'PENDING',45937.97,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(3,'SO20240003',11,6,'PENDING',44405.19,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(4,'SO20240004',3,2,'PENDING',64608.83,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(5,'SO20240005',3,1,'PENDING',52621.86,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(6,'SO20240006',1,8,'PENDING',45234.18,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(7,'SO20240007',1,3,'PENDING',20247.36,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(8,'SO20240008',5,3,'PENDING',26630.88,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(9,'SO20240009',7,8,'PENDING',50960.71,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(10,'SO20240010',16,3,'PENDING',35266.12,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(11,'SO20240011',4,4,'PENDING',8584.50,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(12,'SO20240012',15,6,'PENDING',2754.18,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(13,'SO20240013',8,10,'PENDING',16454.20,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(14,'SO20240014',16,9,'PENDING',14146.88,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(15,'SO20240015',13,1,'PENDING',42835.54,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(16,'SO20240016',14,2,'PENDING',43361.64,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(17,'SO20240017',9,2,'PENDING',12035.70,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(18,'SO20240018',16,4,'PENDING',39856.90,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(19,'SO20240019',13,1,'PENDING',46110.82,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(20,'SO20240020',8,5,'PENDING',51473.13,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(21,'SO20240021',17,10,'PENDING',20200.16,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(22,'SO20240022',2,4,'PENDING',20649.80,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(23,'SO20240023',14,8,'PENDING',51836.46,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(24,'SO20240024',19,7,'PENDING',1309.17,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(25,'SO20240025',7,2,'PENDING',34807.89,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(26,'SO20240026',7,1,'PENDING',29558.01,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(27,'SO20240027',12,9,'PENDING',28800.39,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(28,'SO20240028',6,1,'PENDING',8899.80,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(29,'SO20240029',16,6,'PENDING',28946.24,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL),(30,'SO20240030',1,10,'PENDING',55246.19,'2026-01-28 05:19:30','admin','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL);
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settlement_orders`
--

DROP TABLE IF EXISTS `settlement_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settlement_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `settlement_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'PURCHASE, LOGISTICS',
  `related_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' COMMENT 'PENDING, PAID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_date` datetime DEFAULT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `supplier_id` bigint DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT NULL,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_proof` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settlement_no` (`settlement_no`),
  KEY `FK76ldecx7ungjjlt1gyed43m52` (`supplier_id`),
  CONSTRAINT `FK76ldecx7ungjjlt1gyed43m52` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settlement_orders`
--

LOCK TABLES `settlement_orders` WRITE;
/*!40000 ALTER TABLE `settlement_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `settlement_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_batches`
--

DROP TABLE IF EXISTS `stock_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_batches` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `batch_no` varchar(50) NOT NULL COMMENT '批次编号',
  `product_id` bigint NOT NULL COMMENT '商品ID',
  `warehouse_id` bigint NOT NULL COMMENT '仓库ID',
  `inbound_order_id` bigint DEFAULT NULL COMMENT '入库单ID',
  `quantity` int NOT NULL COMMENT '总数量',
  `available_quantity` int NOT NULL COMMENT '可用数量',
  `locked_quantity` int DEFAULT '0' COMMENT '锁定数量',
  `unit_cost` decimal(10,2) NOT NULL COMMENT '单位成本',
  `total_cost` decimal(15,2) NOT NULL COMMENT '总成本',
  `production_date` date DEFAULT NULL COMMENT '生产日期',
  `expiry_date` date DEFAULT NULL COMMENT '过期日期',
  `status` varchar(20) DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_no` (`batch_no`),
  KEY `product_id` (`product_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `inbound_order_id` (`inbound_order_id`),
  CONSTRAINT `stock_batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `stock_batches_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `stock_batches_ibfk_3` FOREIGN KEY (`inbound_order_id`) REFERENCES `inbound_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存批次表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_batches`
--

LOCK TABLES `stock_batches` WRITE;
/*!40000 ALTER TABLE `stock_batches` DISABLE KEYS */;
INSERT INTO `stock_batches` VALUES (1,'BATCH2023100101',1,1,NULL,100,100,0,3500.00,350000.00,'2023-10-01',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(2,'BATCH2023100201',2,1,NULL,200,200,0,800.00,160000.00,'2023-10-02',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(3,'BATCH2023100301',3,2,NULL,50,50,0,1200.00,60000.00,'2023-10-03',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),(4,'BATCH2023100401',4,3,NULL,1000,1000,0,25.00,25000.00,'2023-10-04',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30');
/*!40000 ALTER TABLE `stock_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_flows`
--

DROP TABLE IF EXISTS `stock_flows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_flows` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `stock_batch_id` bigint DEFAULT NULL,
  `warehouse_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `batch_no` varchar(50) DEFAULT NULL,
  `flow_type` varchar(20) NOT NULL COMMENT 'INBOUND, OUTBOUND, ADJUSTMENT_IN, ADJUSTMENT_OUT',
  `quantity` int NOT NULL,
  `balance_after` int DEFAULT NULL,
  `reference_no` varchar(50) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `operator` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `stock_batch_id` (`stock_batch_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stock_flows_ibfk_1` FOREIGN KEY (`stock_batch_id`) REFERENCES `stock_batches` (`id`),
  CONSTRAINT `stock_flows_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `stock_flows_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存流水表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_flows`
--

LOCK TABLES `stock_flows` WRITE;
/*!40000 ALTER TABLE `stock_flows` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_flows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_accounts`
--

DROP TABLE IF EXISTS `supplier_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account` varchar(255) DEFAULT NULL,
  `bank` varchar(255) DEFAULT NULL,
  `is_default` bit(1) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` bit(1) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `supplier_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKowxj1ipbvgat3glqx8m5iurjc` (`supplier_id`),
  CONSTRAINT `FKowxj1ipbvgat3glqx8m5iurjc` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_accounts`
--

LOCK TABLES `supplier_accounts` WRITE;
/*!40000 ALTER TABLE `supplier_accounts` DISABLE KEYS */;
INSERT INTO `supplier_accounts` VALUES (23,'1231231231231231','中国工商银行',_binary '\0','测试供应商',_binary '','PERSONAL',32),(24,'1231231231231231','中国工商银行',_binary '','萨达说',_binary '','PERSONAL',32),(25,'1231231231231231','交通银行',_binary '','测试供应商01',_binary '','COMPANY',33);
/*!40000 ALTER TABLE `supplier_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_files`
--

DROP TABLE IF EXISTS `supplier_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_files` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint NOT NULL,
  `category` varchar(50) NOT NULL COMMENT 'QUALIFICATION, CONTRACT',
  `original_file_name` varchar(255) NOT NULL,
  `stored_file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `upload_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `uploader` varchar(100) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `version` int DEFAULT '1',
  `group_id` varchar(36) NOT NULL COMMENT 'UUID linking versions of the same file',
  `is_latest` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_supplier_files_supplier_id` (`supplier_id`),
  KEY `idx_supplier_files_group_id` (`group_id`),
  CONSTRAINT `fk_supplier_files_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_files`
--

LOCK TABLES `supplier_files` WRITE;
/*!40000 ALTER TABLE `supplier_files` DISABLE KEYS */;
INSERT INTO `supplier_files` VALUES (7,32,'QUALIFICATION','b6a98928b9a56.png','1db73a0c-97e6-4e65-bd6e-0c3e12e4aab0_b6a98928b9a56.png','/uploads/1db73a0c-97e6-4e65-bd6e-0c3e12e4aab0_b6a98928b9a56.png','image/png',2669717,'2026-01-29 08:55:22','system',NULL,1,'7668385b-ef8d-4a37-9ed2-0715aca9db67',1,0),(8,32,'QUALIFICATION','fb3ca13720ea4.png','e61925b1-1288-4665-8b8d-985ed8a8ad8a_fb3ca13720ea4.png','/uploads/e61925b1-1288-4665-8b8d-985ed8a8ad8a_fb3ca13720ea4.png','image/png',701698,'2026-01-29 08:55:22','system',NULL,1,'5d990dd8-19b8-4ecc-9a9d-a3df390b8318',1,0),(9,32,'CONTRACT','人工智能产品经理  AI时代PM修炼手册.pdf','240d3923-e30f-4532-ad08-50f44df96b26_人工智能产品经理  AI时代PM修炼手册.pdf','/uploads/240d3923-e30f-4532-ad08-50f44df96b26_人工智能产品经理  AI时代PM修炼手册.pdf','application/pdf',5994278,'2026-01-29 08:55:22','system',NULL,1,'098194f0-5d97-4d7e-836d-7ece5aef51cc',1,0),(10,32,'CONTRACT','人工智能产品经理  AI时代PM修炼手册.pdf','93a36082-c68b-40f5-bbea-c698d9e03a74_人工智能产品经理  AI时代PM修炼手册.pdf','/uploads/93a36082-c68b-40f5-bbea-c698d9e03a74_人工智能产品经理  AI时代PM修炼手册.pdf','application/pdf',5994278,'2026-01-29 08:55:22','system',NULL,1,'671bf604-114c-4c60-9f80-7d3bc66ae544',1,0),(11,32,'QUALIFICATION','fb3ca13720ea4.png','8e02ca6c-ff29-45c7-9a3a-e6b3872992d1_fb3ca13720ea4.png','/uploads/8e02ca6c-ff29-45c7-9a3a-e6b3872992d1_fb3ca13720ea4.png','image/png',701698,'2026-01-30 02:35:32','system',NULL,1,'8b210d62-1881-4375-88f9-b86d6f517efa',1,0),(12,33,'QUALIFICATION','b6a98928b9a56.png','23bc2b50-2385-452a-85b8-ae1fec7545a6_b6a98928b9a56.png','/uploads/23bc2b50-2385-452a-85b8-ae1fec7545a6_b6a98928b9a56.png','image/png',2669717,'2026-01-30 05:09:28','system',NULL,1,'b81c890c-0f86-46f3-ba48-c7a654dc4cbc',1,0),(13,33,'CONTRACT','人工智能产品经理  AI时代PM修炼手册.pdf','2a1c6417-441a-4808-a5d7-8e8c8ee529d7_人工智能产品经理  AI时代PM修炼手册.pdf','/uploads/2a1c6417-441a-4808-a5d7-8e8c8ee529d7_人工智能产品经理  AI时代PM修炼手册.pdf','application/pdf',5994278,'2026-01-30 05:09:28','system',NULL,1,'af325c0e-020e-41e4-9897-4367dc6ab4d9',1,0);
/*!40000 ALTER TABLE `supplier_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_prepayment_logs`
--

DROP TABLE IF EXISTS `supplier_prepayment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_prepayment_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint NOT NULL,
  `type` varchar(20) NOT NULL COMMENT 'CHARGE, DEDUCT, REFUND',
  `amount` decimal(15,2) NOT NULL COMMENT '变动金额',
  `balance_after` decimal(15,2) NOT NULL COMMENT '变动后余额',
  `related_order_no` varchar(50) DEFAULT NULL COMMENT '关联单号',
  `remark` varchar(255) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `supplier_prepayment_logs_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='预付款流水表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_prepayment_logs`
--

LOCK TABLES `supplier_prepayment_logs` WRITE;
/*!40000 ALTER TABLE `supplier_prepayment_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_prepayment_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `supplier_no` varchar(50) NOT NULL COMMENT '供应商编号',
  `name` varchar(200) NOT NULL COMMENT '供应商名称',
  `contact_person` varchar(100) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `settlement_type` varchar(20) DEFAULT NULL,
  `settlement_period` int DEFAULT NULL COMMENT '结算周期(天)',
  `prepayment_balance` decimal(15,2) DEFAULT '0.00' COMMENT '预付款余额',
  `status` varchar(20) DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `province_code` varchar(20) DEFAULT NULL,
  `city_code` varchar(20) DEFAULT NULL,
  `district_code` varchar(20) DEFAULT NULL,
  `org_code` varchar(18) DEFAULT NULL,
  `qualification_file` text,
  `contract_file` text,
  `purchaser_id` bigint DEFAULT NULL,
  `coop_end_time` datetime DEFAULT NULL,
  `coop_start_time` datetime DEFAULT NULL,
  `receiver_name` varchar(50) DEFAULT NULL COMMENT '收货人姓名',
  `receiver_phone` varchar(20) DEFAULT NULL COMMENT '收货人联系方式',
  `prepayment_warning` decimal(19,2) DEFAULT NULL COMMENT 'Prepayment balance warning threshold',
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_no` (`supplier_no`),
  UNIQUE KEY `uk_supplier_name_phone` (`name`,`contact_phone`),
  KEY `idx_supplier_no` (`supplier_no`),
  KEY `idx_status` (`status`),
  KEY `fk_supplier_purchaser` (`purchaser_id`),
  CONSTRAINT `fk_supplier_purchaser` FOREIGN KEY (`purchaser_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (32,'GYS0000001','测试供应商','于涛','13241672829','CASH',7,NULL,'ACTIVE','2026-01-29 08:55:22','2026-01-29 08:55:22',NULL,'我的','110000','110102',NULL,NULL,'[]','[]',1,'2026-02-10 16:00:00','2026-01-28 16:00:00','于涛','13241672829',NULL),(33,'GYS0000002','测试供应商01','于涛','13241672829','CASH',7,NULL,'ACTIVE','2026-01-30 05:09:28','2026-01-30 05:09:28',NULL,'我的','110000','110101',NULL,NULL,'[]','[]',1,'2026-02-27 16:00:00','2026-01-29 16:00:00','于涛','13241672829',NULL);
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(100) NOT NULL COMMENT '密码',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '电话',
  `status` enum('ACTIVE','LOCKED','DISABLED') DEFAULT 'ACTIVE' COMMENT '状态',
  `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2a$10$fRh2fYbUFYaILgvUc3DHructelB9juVGRBBFhCnRUNpzDK15q/1Mm','admin@supplypro.com','13800138000','ACTIVE',NULL,'2026-01-28 05:19:31','2026-01-28 05:19:31');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '仓库名称',
  `code` varchar(50) NOT NULL COMMENT '仓库代码',
  `region` varchar(100) DEFAULT NULL COMMENT '地区',
  `address` varchar(255) DEFAULT NULL COMMENT '详细地址',
  `manager` varchar(100) DEFAULT NULL COMMENT '负责人',
  `status` varchar(20) DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `province` varchar(50) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `district` varchar(50) DEFAULT NULL,
  `admins` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='仓库信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
INSERT INTO `warehouses` VALUES (1,'北京总仓','WH-BJ-01','华北','北京市大兴区物流园1号','陈建国','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(2,'上海分仓','WH-SH-01','华东','上海市嘉定区工业路88号','周杰','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(3,'深圳分仓','WH-SZ-01','华南','深圳市宝安区科技园3栋','吴刚','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(4,'成都中转仓','WH-CD-01','西南','成都市双流区空港大道','郑强','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(5,'Warehouse_5','WH-05','South','Address_5','Manager_5','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(6,'Warehouse_6','WH-06','West','Address_6','Manager_6','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(7,'Warehouse_7','WH-07','West','Address_7','Manager_7','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(8,'Warehouse_8','WH-08','West','Address_8','Manager_8','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(9,'Warehouse_9','WH-09','West','Address_9','Manager_9','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL),(10,'Warehouse_10','WH-10','East','Address_10','Manager_10','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-30 15:29:32
