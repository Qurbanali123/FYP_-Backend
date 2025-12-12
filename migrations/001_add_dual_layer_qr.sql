USE fpd_db;

ALTER TABLE products ADD COLUMN IF NOT EXISTS crypto_token LONGTEXT COMMENT 'Encrypted cryptographic token for hidden layer';
ALTER TABLE products ADD COLUMN IF NOT EXISTS token_signature VARCHAR(255) COMMENT 'HMAC signature of the encrypted token';
ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden_qr_nonce VARCHAR(255) COMMENT 'Unique nonce for hidden QR generation';
ALTER TABLE products ADD COLUMN IF NOT EXISTS qr_timestamp BIGINT COMMENT 'Timestamp when QR was generated';
ALTER TABLE products ADD COLUMN IF NOT EXISTS qr_version ENUM('single-layer', 'dual-layer') DEFAULT 'dual-layer' COMMENT 'QR code version';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_verified_both_layers BOOLEAN DEFAULT FALSE COMMENT 'Both layers verified during scan';
ALTER TABLE products ADD COLUMN IF NOT EXISTS verification_count INT DEFAULT 0 COMMENT 'Number of successful verifications';
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP NULL COMMENT 'Last time product was verified';
ALTER TABLE products ADD INDEX idx_qr_version (qr_version);
ALTER TABLE products ADD INDEX idx_last_verified (last_verified_at);

CREATE TABLE IF NOT EXISTS qr_verification_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  visible_layer_detected BOOLEAN DEFAULT TRUE,
  hidden_layer_detected BOOLEAN DEFAULT FALSE,
  crypto_token_valid BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_ip VARCHAR(45),
  verification_method ENUM('manual-id', 'qr-scan', 'hidden-detection') DEFAULT 'manual-id',
  result ENUM('genuine', 'counterfeit', 'partial-verification') DEFAULT 'genuine',
  notes LONGTEXT,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  INDEX idx_product_verification (product_id),
  INDEX idx_verification_time (timestamp)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE products ADD INDEX idx_product_created (created_at);
