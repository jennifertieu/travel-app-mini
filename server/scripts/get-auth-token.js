#!/usr/bin/env node

/**
 * Script to get a Supabase JWT token for testing
 * 
 * Usage:
 *   node scripts/get-auth-token.js
 *   node scripts/get-auth-token.js --email user@example.com --password secret
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://imzyqjkdbxeubmmmwlyk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY or PUBLIC_SUPABASE_ANON_KEY not found in environment variables');
  console.error('   Please set it in your .env file or as an environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
let email = null;
let password = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    email = args[i + 1];
    i++;
  } else if (args[i] === '--password' && args[i + 1]) {
    password = args[i + 1];
    i++;
  }
}

// Helper to get user input
function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getToken() {
  try {
    // Get credentials if not provided
    if (!email) {
      email = await question('Enter your email: ');
    }
    if (!password) {
      password = await question('Enter your password: ');
    }

    console.log('\n🔐 Signing in to Supabase...');

    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error('❌ Authentication failed:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        console.error('\n💡 Tip: Make sure the user exists in your Supabase Auth system.');
        console.error('   You can create a user via the Supabase Dashboard or sign up first.');
      }
      
      process.exit(1);
    }

    if (!data.session) {
      console.error('❌ No session returned');
      process.exit(1);
    }

    const token = data.session.access_token;
    const expiresAt = new Date(data.session.expires_at * 1000);

    console.log('\n✅ Successfully authenticated!');
    console.log('\n📋 Your JWT Token:');
    console.log('─'.repeat(80));
    console.log(token);
    console.log('─'.repeat(80));
    console.log(`\n⏰ Token expires at: ${expiresAt.toLocaleString()}`);
    console.log(`👤 User ID: ${data.user.id}`);
    console.log(`📧 Email: ${data.user.email}`);
    
    console.log('\n💡 To use in Postman:');
    console.log('   1. Copy the token above');
    console.log('   2. In Postman, go to your environment variables');
    console.log('   3. Set "auth_token" to the token value');
    console.log('   4. Or add it directly to the Authorization header: Bearer <token>');
    
    console.log('\n🧪 Test the token:');
    console.log(`   curl -X GET 'http://localhost:5001/member-profiles' \\`);
    console.log(`     -H "Authorization: Bearer ${token.substring(0, 20)}..."`);

    return token;
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
getToken();
