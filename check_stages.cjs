require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT p.key, p.sort_order, p.label FROM pipeline_stages p JOIN tenants t ON t.id = p.tenant_id WHERE t.slug = 'olx' ORDER BY p.sort_order")
  .then(res => console.log(res.rows))
  .catch(err => console.error(err.message))
  .finally(() => pool.end());
