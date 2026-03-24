import { Router } from 'express';
import { pool, query } from '../lib/db';
import { verifyUserRole } from '../middleware/verifyRole';

const router = Router();

type AddressRow = {
  id: string;
  label: string;
  building_name: string | null;
  street: string | null;
  colony: string | null;
  city: string;
  pincode: string;
  city_code: string | null;
  pickup_locality: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at?: string;
};

const toAddressDto = (row: AddressRow) => ({
  id: row.id,
  label: row.label,
  building_name: row.building_name,
  street: row.street,
  colony: row.colony,
  city: row.city,
  pincode: row.pincode,
  city_code: row.city_code,
  pickup_locality: row.pickup_locality,
  latitude: row.latitude,
  longitude: row.longitude,
  is_default: row.is_default,
});

const PINCODE_REGEX = /^\d{6}$/;

router.get('/', verifyUserRole('seller'), async (req, res) => {
  const sellerId = req.user?.id;
  if (!sellerId) return res.status(401).json({ error: 'Unauthorized' });

  const result = await query(
    `SELECT id, label, building_name, street, colony, city, pincode,
            city_code, pickup_locality, latitude, longitude, is_default, created_at
       FROM seller_addresses
      WHERE seller_id = $1
      ORDER BY is_default DESC, created_at DESC`,
    [sellerId]
  );

  return res.json({ addresses: result.rows.map(toAddressDto) });
});

router.post('/', verifyUserRole('seller'), async (req, res) => {
  const sellerId = req.user?.id;
  if (!sellerId) return res.status(401).json({ error: 'Unauthorized' });

  const {
    label,
    building_name,
    street,
    colony,
    city,
    pincode,
    city_code,
    pickup_locality,
    latitude,
    longitude,
    set_as_default,
  } = req.body ?? {};

  if (!city || !pincode) {
    return res.status(400).json({ error: 'city and pincode are required' });
  }
  if (!PINCODE_REGEX.test(String(pincode))) {
    return res.status(400).json({ error: 'pincode must be 6 digits' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS count FROM seller_addresses WHERE seller_id = $1',
      [sellerId]
    );
    const addressCount = Number(countRes.rows[0]?.count ?? 0);
    if (addressCount >= 10) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'max_10_addresses_exceeded' });
    }

    const shouldSetDefault = Boolean(set_as_default) || addressCount === 0;
    if (shouldSetDefault) {
      await client.query(
        'UPDATE seller_addresses SET is_default = false WHERE seller_id = $1',
        [sellerId]
      );
    }

    const insertRes = await client.query(
      `INSERT INTO seller_addresses (
         seller_id, label, building_name, street, colony, city, pincode,
         city_code, pickup_locality, latitude, longitude, is_default
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, label, building_name, street, colony, city, pincode,
                 city_code, pickup_locality, latitude, longitude, is_default`,
      [
        sellerId,
        label ?? 'Home',
        building_name ?? null,
        street ?? null,
        colony ?? null,
        city,
        String(pincode),
        city_code ?? null,
        pickup_locality ?? null,
        latitude ?? null,
        longitude ?? null,
        shouldSetDefault,
      ]
    );

    await client.query('COMMIT');
    return res.status(201).json(toAddressDto(insertRes.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.patch('/:addressId', verifyUserRole('seller'), async (req, res) => {
  const sellerId = req.user?.id;
  if (!sellerId) return res.status(401).json({ error: 'Unauthorized' });

  const { addressId } = req.params;
  const allowedFields = [
    'label',
    'building_name',
    'street',
    'colony',
    'city',
    'pincode',
    'city_code',
    'pickup_locality',
    'latitude',
    'longitude',
    'is_default',
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, key)) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  if (updates.pincode != null && !PINCODE_REGEX.test(String(updates.pincode))) {
    return res.status(400).json({ error: 'pincode must be 6 digits' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (updates.is_default === true) {
      await client.query(
        'UPDATE seller_addresses SET is_default = false WHERE seller_id = $1',
        [sellerId]
      );
    }

    const keys = Object.keys(updates);
    const assignments = keys.map((key, idx) => `${key} = $${idx + 1}`);
    assignments.push(`updated_at = NOW()`);

    const values = keys.map((key) => updates[key]);
    values.push(addressId, sellerId);

    const updateRes = await client.query(
      `UPDATE seller_addresses
          SET ${assignments.join(', ')}
        WHERE id = $${keys.length + 1} AND seller_id = $${keys.length + 2}
      RETURNING id, label, building_name, street, colony, city, pincode,
                city_code, pickup_locality, latitude, longitude, is_default`,
      values
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Address not found' });
    }

    await client.query('COMMIT');
    return res.json(toAddressDto(updateRes.rows[0]));
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.delete('/:addressId', verifyUserRole('seller'), async (req, res) => {
  const sellerId = req.user?.id;
  if (!sellerId) return res.status(401).json({ error: 'Unauthorized' });

  const { addressId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const toDeleteRes = await client.query(
      'SELECT id, is_default FROM seller_addresses WHERE id = $1 AND seller_id = $2',
      [addressId, sellerId]
    );

    if (toDeleteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Address not found' });
    }

    const wasDefault = Boolean(toDeleteRes.rows[0].is_default);

    await client.query(
      'DELETE FROM seller_addresses WHERE id = $1 AND seller_id = $2',
      [addressId, sellerId]
    );

    if (wasDefault) {
      const newestRes = await client.query(
        `SELECT id
           FROM seller_addresses
          WHERE seller_id = $1
          ORDER BY created_at DESC
          LIMIT 1`,
        [sellerId]
      );
      if (newestRes.rows.length > 0) {
        await client.query(
          'UPDATE seller_addresses SET is_default = true WHERE id = $1',
          [newestRes.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;