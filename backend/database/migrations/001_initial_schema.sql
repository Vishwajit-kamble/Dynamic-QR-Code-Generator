-- TapReview Initial Database Schema (Supabase PostgreSQL)
-- Milestone 1 & 2: Cards, Businesses, Scan Events, Admin Logs

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: businesses
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    contact_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    google_review_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: cards
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_code VARCHAR(20) UNIQUE NOT NULL,      -- e.g. TR001
    slug VARCHAR(20) UNIQUE NOT NULL,           -- e.g. TR001
    redirect_url TEXT UNIQUE NOT NULL,          -- e.g. https://yourdomain.com/r/TR001
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' 
        CHECK (status IN ('AVAILABLE', 'ACTIVATED', 'DEACTIVATED')),
    business_id UUID NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    qr_image_path TEXT NULL,
    qr_production_status VARCHAR(30) DEFAULT 'PENDING'
        CHECK (qr_production_status IN ('PENDING', 'GENERATED', 'PRINTED')),
    nfc_status VARCHAR(30) DEFAULT 'NOT_PROGRAMMED'
        CHECK (nfc_status IN ('NOT_PROGRAMMED', 'PROGRAMMED', 'TESTED')),
    nfc_programmed_at TIMESTAMP WITH TIME ZONE NULL,
    nfc_tested_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE NULL,
    deactivated_at TIMESTAMP WITH TIME ZONE NULL
);

-- Ensure a card can only be assigned to one business
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_business_id_unique 
    ON cards(business_id) 
    WHERE business_id IS NOT NULL;

-- Table: scan_events
CREATE TABLE IF NOT EXISTS scan_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT NULL,
    referrer TEXT NULL,
    source VARCHAR(50) DEFAULT 'QR/NFC',
    ip_hash VARCHAR(64) NULL
);

-- Table: admin_logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    card_id UUID NULL REFERENCES cards(id) ON DELETE SET NULL,
    business_id UUID NULL REFERENCES businesses(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    admin_user_id VARCHAR(100) NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_card_code ON cards(card_code);
CREATE INDEX IF NOT EXISTS idx_scan_events_card_id ON scan_events(card_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_scanned_at ON scan_events(scanned_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);

-- Trigger to update updated_at on businesses
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON businesses;
CREATE TRIGGER trg_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Database Safeguard: Prevent reassignment of an activated card to another business
CREATE OR REPLACE FUNCTION check_card_assignment_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- If card is already ACTIVATED or DEACTIVATED and has a business_id,
    -- changing business_id to a different ID or NULL is strictly forbidden!
    IF OLD.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id THEN
        RAISE EXCEPTION 'Permanent Card Assignment: Card % cannot be reassigned or unassigned.', OLD.card_code;
    END IF;

    -- If card was ACTIVATED, it cannot return to AVAILABLE
    IF OLD.status = 'ACTIVATED' AND NEW.status = 'AVAILABLE' THEN
        RAISE EXCEPTION 'Permanent Card Assignment: Activated card % cannot return to AVAILABLE status.', OLD.card_code;
    END IF;

    -- If card was DEACTIVATED, it cannot return to AVAILABLE
    IF OLD.status = 'DEACTIVATED' AND NEW.status = 'AVAILABLE' THEN
        RAISE EXCEPTION 'Permanent Card Assignment: Deactivated card % cannot return to AVAILABLE status.', OLD.card_code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_card_assignment_integrity ON cards;
CREATE TRIGGER trg_card_assignment_integrity
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION check_card_assignment_integrity();

