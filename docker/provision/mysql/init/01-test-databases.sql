-- create databases
CREATE DATABASE IF NOT EXISTS `Apillon_access_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_console_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_storage_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_config_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_authentication_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_referral_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_nfts_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_blockchain_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_computing_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_social_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_contracts_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_infrastructure_test`;
CREATE DATABASE IF NOT EXISTS `Apillon_mailing_test`;

-- create root user and grant rights
GRANT ALL ON *.* TO 'root'@'localhost';
