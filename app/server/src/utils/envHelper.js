const fs = require('fs');
const path = require('path');

/**
 * Updates a key-value pair across available .env files and process.env.
 * @param {string} key - Environment variable key
 * @param {string} value - New value
 */
function updateEnvVariable(key, value) {
  process.env[key] = value;
  if (key === 'ADMIN_PASSWORD') {
    process.env.OWNER_PASSWORD = value;
  }

  const candidatePaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'app/server/.env'),
  ];

  const uniquePaths = [...new Set(candidatePaths)];

  for (const envPath of uniquePaths) {
    if (fs.existsSync(envPath)) {
      try {
        let content = fs.readFileSync(envPath, 'utf8');
        const keyPattern = new RegExp(`^${key}=.*$`, 'm');

        if (keyPattern.test(content)) {
          content = content.replace(keyPattern, `${key}=${value}`);
        } else if (key === 'ADMIN_PASSWORD' && /^OWNER_PASSWORD=.*$/m.test(content)) {
          content = content.replace(/^OWNER_PASSWORD=.*$/m, `OWNER_PASSWORD=${value}\n${key}=${value}`);
        } else {
          content = content.trimEnd() + `\n${key}=${value}\n`;
        }

        if (key === 'ADMIN_PASSWORD' && /^OWNER_PASSWORD=.*$/m.test(content)) {
          content = content.replace(/^OWNER_PASSWORD=.*$/m, `OWNER_PASSWORD=${value}`);
        }

        fs.writeFileSync(envPath, content, 'utf8');
      } catch (err) {
        console.error(`[envHelper] Failed to update ${key} in ${envPath}:`, err.message);
      }
    }
  }
}

module.exports = {
  updateEnvVariable,
};
