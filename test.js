// test.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const qs = require('qs');

// CONFIG - change SERVER_URL if your app runs elsewhere
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const LOGIN_PATH = '/login';
const CREDENTIALS_FILE = path.join(__dirname, 'demo-credentials.txt');

// Read credentials file in "username=password" per line format
function readCredentials(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('Credentials file not found:', filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const creds = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue; // skip blanks & comments
    const parts = line.split('=');
    if (parts.length < 2) {
      console.warn('Ignoring malformed line:', line);
      continue;
    }
    const username = parts.shift().trim();
    const password = parts.join('=').trim(); // allow '=' in password
    if (!username) {
      console.warn('Ignoring line with empty username:', line);
      continue;
    }
    creds.push({ username, password });
  }

  return creds;
}

// Try one login attempt
async function tryLogin(creds) {
  try {
    const url = SERVER_URL + LOGIN_PATH;
    const res = await axios.post(
      url,
      qs.stringify({ username: creds.username, password: creds.password }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: (status) => status < 500, // treat 3xx as valid
      },
    );

    const body = typeof res.data === 'string' ? res.data : '';
    const failedPattern = /Invalid password|User not found|Login failed|Unauthorized/i;
    const redirected = res.status >= 300 && res.status < 400 && res.headers.location;
    const redirectedToRoot =
      redirected && (res.headers.location === '/' || res.headers.location === SERVER_URL + '/');

    // Consider success if redirected to root OR 200 without known failure phrases
    const success = redirectedToRoot || (res.status === 200 && !failedPattern.test(body));

    return { ok: success, status: res.status, bodySnippet: body.substr(0, 200), location: res.headers.location || null };
  } catch (err) {
    if (err.response) {
      const body = typeof err.response.data === 'string' ? err.response.data : '';
      return { ok: false, status: err.response.status, bodySnippet: body.substr(0, 200) };
    } else {
      return { ok: false, error: err.message };
    }
  }
}

// Main runner: iterate through all credential pairs and stop on first success
async function runAllStopOnFirstSuccess() {
  const pairs = readCredentials(CREDENTIALS_FILE);
  if (!pairs.length) {
    console.error('No credential pairs found in', CREDENTIALS_FILE);
    process.exit(1);
  }

  console.log(`Attempting ${pairs.length} login(s) against ${SERVER_URL + LOGIN_PATH}...\n`);

  for (const p of pairs) {
    // Attempt login
    // eslint-disable-next-line no-await-in-loop
    const result = await tryLogin(p);

    if (result.ok) {
      console.log('------------------------------------');
      console.log('✅ Login SUCCESS');
      console.log(`Username: ${p.username}`);
      console.log(`Password: ${p.password}`);
      console.log(`HTTP status: ${result.status}`);
      if (result.location) console.log(`Redirected to: ${result.location}`);
      console.log('------------------------------------');
      process.exit(0); // exit with success
    } else {
      const reason = result.status ? `status ${result.status}` : result.error || 'unknown error';
      console.log(`❌ FAIL: ${p.username} - ${reason}`);
    }
  }

  console.log('\nAll attempts finished. No successful login found.');
  process.exit(2); // exit with non-zero code to indicate no success
}

// Run
runAllStopOnFirstSuccess();