
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// Remove /api if present in BASE_URL for local testing if needed, 
// but usually BASE_URL is just host. 
// The app mounts routes at '/' based on app.ts, NOT '/api'.
// So we will target BASE_URL + /route

console.log(`Checking backend performance at: ${BASE_URL}`);

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret'; // Fallback only for user safety
const prisma = new PrismaClient();

const endpointsRecruiter = [
  // Public
  { method: 'GET', url: '/health' },

  // User
  { method: 'GET', url: '/auth/me' },
  
  // Recruiter Specific
  { method: 'GET', url: '/recruiters/company' },
  { method: 'GET', url: '/recruiters/jobs' },
  { method: 'GET', url: '/recruiters/feed' }, 
  { method: 'GET', url: '/recruiters/signals' },
  
  // Recruiter viewing Matches
  { method: 'GET', url: '/matches' },
];

const endpointsCandidate = [
  // User
  { method: 'GET', url: '/auth/me' },
  
  // Candidate Specific
  { method: 'GET', url: '/candidates/bookmarks' },
  { method: 'GET', url: '/candidates/applications' },
  
  // Job Feed (Candidate view)
  { method: 'GET', url: '/jobs/feed' },
  
  // Candidate viewing Matches
  { method: 'GET', url: '/matches' },
];

const endpointsAdmin = [
  { method: 'GET', url: '/admin/metrics' },
  // { method: 'GET', url: '/ai/data/users' } // Requires AI Key, distinct flow
];

async function measureEndpoint(method: string, url: string, token: string, role: string) {
  const start = performance.now();
  try {
    const res = await axios({
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      validateStatus: () => true 
    });
    const duration = performance.now() - start;
    
    // Colorize
    let statusColor = '\x1b[32m'; // Green
    if (res.status >= 400) statusColor = '\x1b[31m'; // Red
    
    let timeColor = '\x1b[32m';
    if (duration > 200) timeColor = '\x1b[33m'; // Yellow
    if (duration > 500) timeColor = '\x1b[31m'; // Red
    
    console.log(
      `[${role.padEnd(9)}] ${method} ${url.padEnd(30)} | Status: ${statusColor}${res.status}\x1b[0m | Time: ${timeColor}${duration.toFixed(2)}ms\x1b[0m`
    );

    // Display response preview
    const dataStr = JSON.stringify(res.data);
    const preview = dataStr.length > 200 ? dataStr.substring(0, 200) + '...' : dataStr;
    console.log(`            Response: \x1b[90m${preview}\x1b[0m`);
    
    return { url, duration, status: res.status };
  } catch (err: any) {
    const duration = performance.now() - start;
    console.log(`[${role.padEnd(9)}] ${method} ${url.padEnd(30)} | Error: ${err.message} | Time: ${duration.toFixed(2)}ms`);
    return { url, duration, status: 0 };
  }
}

async function runTests() {
  console.log('Connecting to DB...');
  
  // Fetch a Recruiter
  const recruiter = await prisma.user.findFirst({
    where: { role: 'recruiter' }
  });

  // Fetch a Candidate
  const candidate = await prisma.user.findFirst({
    where: { role: 'candidate' }
  });

  // Fetch an Admin
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });

  if (!recruiter) console.error('Warning: No recruiter found.');
  if (!candidate) console.error('Warning: No candidate found.');
  if (!admin) console.log('Info: No admin found, skipping admin tests.');

  const results = [];

  console.log('\n--- Starting Performance Benchmark ---\n');

  // Test Recruiter Endpoints
  if (recruiter) {
    const tokenRecruiter = jwt.sign({ id: recruiter.id, role: recruiter.role }, JWT_SECRET, { expiresIn: '1h' });
    for (const endpoint of endpointsRecruiter) {
      results.push(await measureEndpoint(endpoint.method, endpoint.url, tokenRecruiter, 'Recruiter'));
    }
  }

  // Test Candidate Endpoints
  if (candidate) {
    const tokenCandidate = jwt.sign({ id: candidate.id, role: candidate.role }, JWT_SECRET, { expiresIn: '1h' });
    for (const endpoint of endpointsCandidate) {
      results.push(await measureEndpoint(endpoint.method, endpoint.url, tokenCandidate, 'Candidate'));
    }
  }

  // Test Admin Endpoints
  if (admin) {
    const tokenAdmin = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
    for (const endpoint of endpointsAdmin) {
      results.push(await measureEndpoint(endpoint.method, endpoint.url, tokenAdmin, 'Admin'));
    }
  }
  
  if (results.length > 0) {
    const average = results.reduce((acc, curr) => acc + curr.duration, 0) / results.length;
    console.log(`\nAverage Response Time: ${average.toFixed(2)}ms`);
    console.log('\nNote: Write endpoints (POST/PUT/DELETE) are skipped to avoid data modification.');
  } else {
    console.log('No tests ran.');
  }
  
  await prisma.$disconnect();
}

runTests();
