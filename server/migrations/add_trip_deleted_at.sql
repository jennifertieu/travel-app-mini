-- Migration: Add deleted_at soft-delete column to trips table
-- Run this in your Supabase SQL editor

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN trips.deleted_at IS 'Soft delete timestamp; non-null means trip is deleted';
