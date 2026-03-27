-- Migration 0026: Add unique constraint on invoices.order_id
-- Required for ON CONFLICT (order_id) upsert in invoice generator

ALTER TABLE invoices
  ADD CONSTRAINT invoices_order_id_unique UNIQUE (order_id);
