/**
 * Usage:
 *   node scripts/add-key.mjs <key> <clientId> <name>
 *
 * Example:
 *   node scripts/add-key.mjs thanzi_abc123 app-thanzi "Thanzi PWA"
 *
 * This generates the wrangler CLI command to store the key in KV.
 * You can then run the printed command directly.
 */

const [,, key, clientId, name] = process.argv;

if (!key || !clientId || !name) {
  console.error('Usage: node scripts/add-key.mjs <key> <clientId> <name>');
  console.error('Example: node scripts/add-key.mjs thanzi_abc123 app-thanzi "Thanzi PWA"');
  process.exit(1);
}

if (!key.startsWith('thanzi_')) {
  console.error('Key must start with thanzi_');
  process.exit(1);
}

const record = JSON.stringify({
  clientId,
  name,
  active: true,
  createdAt: new Date().toISOString(),
});

console.log('\n✅ Run this command to add the key to KV:\n');
console.log(`wrangler kv key put "key:${key}" '${record}' --binding THANZI_KEYS`);
console.log('\nFor preview/dev namespace, append: --preview');
console.log(`\nKey: ${key}`);
console.log(`Client ID: ${clientId}`);
