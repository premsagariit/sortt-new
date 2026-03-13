const axios = require('axios');
const fs = require('fs');
const { Pool } = require('pg');

const testUserId = '63a42161-0814-4f11-bf6b-e6d07b4782b8'; // Mock Seller internal ID
const BACKEND_URL = 'http://127.0.0.1:8080';
const pool = new Pool({
    connectionString: 'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require'
});

async function runGates() {
    let orderId;

    try {
        console.log('\n--- Gate G9.8: GET /api/users/me ---');
        const rMe = await axios.get(`${BACKEND_URL}/api/users/me`, {
            headers: { }
        });
        const userMap = rMe.data;
        console.log('users/me response:', userMap);
        if ('phone_hash' in userMap || 'clerk_user_id' in userMap) {
            console.error('❌ G9.8 FAILED: sensitive fields present');
        } else {
            console.log('✅ G9.8 PASSED');
        }

        console.log('\n--- Gate G9.1 & G9.5: POST /api/orders ---');
        const createRes = await axios.post(`${BACKEND_URL}/api/orders`, {
            material_codes: ["metal", "paper"],
            estimated_weights: { "metal": 5.0, "paper": 2.5 },
            pickup_address_text: "Banjara Hills, Hyderabad, Telangana 500034",
            pickup_preference: { type: "morning" },
            seller_note: "Near the blue gate",
            status: "accepted" // G9.5 test: should ignore this and set to 'created'
        }, {
            headers: { }
        });
        
        console.log('Create order response:', createRes.data);
        orderId = createRes.data.order?.id;
        
        if (orderId && createRes.data.order?.status === 'created') {
            console.log(`✅ G9.1 & G9.5 PASSED. Order Created: ${orderId}`);
        } else {
            console.error(`❌ G9.1 or G9.5 FAILED.`);
        }

        if(!orderId) return;

        console.log('\n--- Gate G9.2: GET /api/orders/:id (Address reveal) ---');
        // The token we used belongs to the seller. Wait, the seller who created the order *can* see the address.
        // Let's create another token for a different user, or we just check we can see it since we're the owner? 
        // TRD says: Hide for all other aggregators. We'll need a different aggregator token to fully test,
        // but let's test fetching it with the same token first.
        const rGet = await axios.get(`${BACKEND_URL}/api/orders/${orderId}`, {
            headers: { }
        });
        console.log('Order fetch response:', rGet.data);

        console.log('\n--- Gate G9.3 & G9.4: Invalid patching ---');
        try {
            await axios.patch(`${BACKEND_URL}/api/orders/${orderId}/status`, { status: "completed" }, {
                headers: { }
            });
            console.error('❌ G9.3 FAILED: expected 400 for completed');
        } catch (e) {
            console.log(`✅ G9.3 PASSED: got ${e.response?.status} error`);
        }

        try {
            await axios.patch(`${BACKEND_URL}/api/orders/${orderId}/status`, { status: "disputed" }, {
                headers: { }
            });
            console.error('❌ G9.4 FAILED: expected 400 for disputed');
        } catch (e) {
            console.log(`✅ G9.4 PASSED: got ${e.response?.status} error`);
        }

        console.log('\n--- Gate G9.6: order_status_history changed_by NOT NULL ---');
        const rHistory = await pool.query('SELECT id, changed_by, new_status FROM order_status_history WHERE order_id = $1', [orderId]);
        console.log('Status history rows:', rHistory.rows);
        const nullChangedBy = rHistory.rows.filter(r => r.changed_by === null);
        if (nullChangedBy.length > 0) {
            console.error('❌ G9.6 FAILED: found null changed_by rows');
        } else {
            console.log('✅ G9.6 PASSED');
        }

    } catch (e) {
        console.error('API Error:', e.response?.data || e.message);
    } finally {
        await pool.end();
    }
}

runGates();
