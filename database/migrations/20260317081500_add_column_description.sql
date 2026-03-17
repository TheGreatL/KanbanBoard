-- Migration: Add description to columns table
-- Date: 2026-03-17
-- Description: Adds an optional description field to the columns table for better collaboration.

ALTER TABLE public.columns 
ADD COLUMN IF NOT EXISTS description text;
