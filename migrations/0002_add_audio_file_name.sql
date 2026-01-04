-- Add audio_file_name column to memos table for audio playback support
ALTER TABLE memos ADD COLUMN audio_file_name TEXT;
