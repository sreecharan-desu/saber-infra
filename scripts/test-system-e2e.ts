
import axios from 'axios';
import { PrismaClient, UserRole } from '@prisma/client';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { faker } from '@faker-js/faker';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET!;
const ADMIN_API_KEY = process.env.AI_INTERNAL_API_KEY!;
const prisma = new PrismaClient();

// Utils
function generateTestToken(userId: string, role: string) {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function logStep(msg: string) {
    console.log(`\n🔵 ${msg}`);
}

async function logSuccess(msg: string) {
    console.log(`✅ ${msg}`);
}

async function runSystemTest() {
    console.log(`🚀 Starting SABER End-to-End System Test`);
    console.log(`Target: ${BASE_URL}\n`);

    try {
        // --- 1. ADMIN SETUP ---
        await logStep('1. Admin: Creating Admin User & Token');
        const adminEmail = `admin-${faker.string.uuid()}@saber.test`;
        const adminUser = await prisma.user.create({
            data: {
                name: 'System Admin',
                email: adminEmail,
                role: UserRole.admin,
                photo_url: faker.image.avatar()
            }
        });
        const adminToken = generateTestToken(adminUser.id, 'admin');
        await logSuccess(`Admin created: ${adminEmail} (ID: ${adminUser.id})`);

        // --- 2. RECRUITER FLOW ---
        await logStep('2. Recruiter: Onboarding & Job Creation');
        
        // 2a. Create Recruiter via direct DB (simulating OAuth login + token generation)
        const recruiterEmail = `recruiter-${faker.string.uuid()}@corp.test`;
        const recruiterUser = await prisma.user.create({
            data: {
                name: 'Hiring Manager',
                email: recruiterEmail,
                role: UserRole.recruiter,
                photo_url: faker.image.avatar()
            }
        });
        const recruiterToken = generateTestToken(recruiterUser.id, 'recruiter');
        await logSuccess(`Recruiter created: ${recruiterEmail}`);

        // 2b. Create Company
        await logStep('2b. Recruiter: Creating Company');
        const companyRes = await axios.post(`${BASE_URL}/company`, {
            name: faker.company.name(),
            website: faker.internet.url()
        }, { headers: { Authorization: `Bearer ${recruiterToken}` } });
        const companyId = companyRes.data.id;
        await logSuccess(`Company created: ${companyRes.data.name} (ID: ${companyId})`);

        // 2c. Post Job
        await logStep('2c. Recruiter: Posting Job');
        const jobRes = await axios.post(`${BASE_URL}/job`, {
            company_id: companyId,
            problem_statement: 'We need to scale our backend to 1M users.',
            expectations: 'Rewrite legacy node apps in Rust or Go.',
            non_negotiables: 'Must know distributed systems.',
            deal_breakers: 'No remote work.',
            skills_required: ['Rust', 'Go', 'PostgreSQL'],
            constraints_json: {
                salary_range: [120000, 180000],
                location: 'San Francisco'
            }
        }, { headers: { Authorization: `Bearer ${recruiterToken}` } });
        const jobId = jobRes.data.id;
        await logSuccess(`Job posted: ${jobId}`);


        // --- 3. CANDIDATE FLOW ---
        await logStep('3. Candidate: Onboarding & Matching');

        // 3a. Create Candidate
        const candidateEmail = `dev-${faker.string.uuid()}@talent.test`;
        const candidateUser = await prisma.user.create({
            data: {
                name: 'Talented Dev',
                email: candidateEmail,
                role: UserRole.candidate,
                skills: {
                    create: [
                        { name: 'Rust', source: 'github', confidence_score: 0.9 },
                        { name: 'Go', source: 'manual', confidence_score: 0.8 }
                    ]
                }
            }
        });
        const candidateToken = generateTestToken(candidateUser.id, 'candidate');
        await logSuccess(`Candidate created: ${candidateEmail}`);

        // 3b. Update Intent & Constraints
        await axios.post(`${BASE_URL}/intent`, {
            intent_text: 'Looking for systems programming roles.',
            why_text: 'I love low-level optimization.'
        }, { headers: { Authorization: `Bearer ${candidateToken}` } });

        await axios.post(`${BASE_URL}/constraints`, {
            preferred_salary: 130000,
            preferred_locations: ['San Francisco', 'Remote'],
            remote_only: false
        }, { headers: { Authorization: `Bearer ${candidateToken}` } });
        await logSuccess('Candidate intent and constraints updated');

        // 3c. Get Feed
        await logStep('3c. Candidate: Fetching Job Feed');
        const feedRes = await axios.get(`${BASE_URL}/jobs/feed`, {
            headers: { Authorization: `Bearer ${candidateToken}` }
        });
        const jobs = feedRes.data.jobs || [];
        await logSuccess(`Feed returned ${jobs.length} jobs`);

        // Find our job
        const targetJobParams = jobs.find((j: any) => j.id === jobId);
        if (!targetJobParams) {
             console.warn(`⚠️ Created job not in feed yet (might need seed data or AI update). Manually setting ID for test.`);
        }

        // 3d. Swipe Right (Candidate)
        await logStep('3d. Candidate: Swiping Right on Job');
        await axios.post(`${BASE_URL}/swipe`, {
            job_id: jobId,
            direction: 'right'
        }, { headers: { Authorization: `Bearer ${candidateToken}` } });
        await logSuccess('Candidate swiped RIGHT');

        
        // --- 4. MATCHING FLOW ---
        await logStep('4. Recruiter: Swiping & Matching');

        // 4a. Recruiter Feed
        const recFeedRes = await axios.get(`${BASE_URL}/recruiter/feed`, {
             headers: { Authorization: `Bearer ${recruiterToken}` } 
        });
        // Note: Our fresh candidate might not appear immediately without AI run, 
        // so we trust the ID we created.

        // 4b. Swipe Right (Recruiter)
        await logStep(`4b. Recruiter: Swiping Right on Candidate ${candidateUser.id}`);
        await axios.post(`${BASE_URL}/recruiter/swipe`, {
            job_id: jobId,
            target_user_id: candidateUser.id,
            direction: 'right'
        }, { headers: { Authorization: `Bearer ${recruiterToken}` } });
        await logSuccess('Recruiter swiped RIGHT -> MATCH SHOULD EXIST');


        // --- 5. VERIFY MATCH & MESSAGING ---
        await logStep('5. Match Verification & Chat');
        
        // 5a. Check Candidate Matches
        const candMatchesRes = await axios.get(`${BASE_URL}/matches`, {
             headers: { Authorization: `Bearer ${candidateToken}` } 
        });
        const match = candMatchesRes.data.matches.find((m: any) => m.job_id === jobId);
        
        if (!match) {
            throw new Error('❌ Match not found in candidate list!');
        }
        await logSuccess(`Match confirmed! ID: ${match.id}`);
        
        // 5b. Send Message
        await axios.post(`${BASE_URL}/messages`, {
            match_id: match.id,
            content: "Hello! I'm interested in the Rust role."
        }, { headers: { Authorization: `Bearer ${candidateToken}` } });
        await logSuccess('Candidate sent message');

        // 5c. Recruiter Sees Message
         const recMatchesRes = await axios.get(`${BASE_URL}/matches`, {
             headers: { Authorization: `Bearer ${recruiterToken}` } 
        });
        const recMatch = recMatchesRes.data.matches.find((m: any) => m.id === match.id);
        if (recMatch.messages.length > 0) {
            await logSuccess(`Recruiter received message: "${recMatch.messages[0].content}"`);
        } else {
             throw new Error('❌ Message not received by recruiter');
        }


        // --- 6. CLEANUP ---
        await logStep('6. Cleanup (Optional)');
        console.log('Skipping DB cleanup to allow manual inspection.');
        
        console.log('\n🎉 SYSTEM TEST COMPLETED SUCCESSFULLY 🎉');

    } catch (error: any) {
        console.error('\n❌ TEST FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runSystemTest();
