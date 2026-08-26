-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(128)
);

-- Insert global workspace
INSERT OR IGNORE INTO workspaces (id, name, description) 
VALUES ('global', 'Global Workspace', 'Default workspace for legacy data');

-- Add workspace_id to relevant tables
ALTER TABLE users ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE residents ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE wastes ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE bins ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE vehicles ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE collections ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE incidents ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE local_hubs ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE transfers ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE transport_facilities ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE recycling_batches ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE geo_locations ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE service_areas ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE vehicle_locations ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE route_requests ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE routes ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE vehicle_inspections ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE qr_events ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE alerts ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
ALTER TABLE audit_logs ADD COLUMN workspace_id VARCHAR(36) NOT NULL DEFAULT 'global';
