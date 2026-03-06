// Test script to check and populate Neighborhood Rhythm data
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });

    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'found' : 'missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'found' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingData() {
  console.log('Checking existing reports...');

  // Check infrastructure reports
  const { data: infraReports, error: infraError } = await supabase
    .from('infrastructure_reports')
    .select('id, created_at, latitude, longitude, report_type')
    .limit(10);

  if (infraError) {
    console.error('Error fetching infrastructure reports:', infraError);
  } else {
    console.log(`Found ${infraReports?.length || 0} infrastructure reports`);
    if (infraReports?.length > 0) {
      console.log('Sample infrastructure reports:', infraReports.slice(0, 3));
    }
  }

  // Check vibe reports
  const { data: vibeReports, error: vibeError } = await supabase
    .from('reports')
    .select('id, created_at, latitude, longitude, vibe_type')
    .limit(10);

  if (vibeError) {
    console.error('Error fetching vibe reports:', vibeError);
  } else {
    console.log(`Found ${vibeReports?.length || 0} vibe reports`);
    if (vibeReports?.length > 0) {
      console.log('Sample vibe reports:', vibeReports.slice(0, 3));
    }
  }
}

async function insertTestData() {
  console.log('Inserting test data...');

  const testLocation = {
    latitude: 40.7128, // New York City coordinates
    longitude: -74.0060
  };

  // Insert infrastructure reports
  const infraReports = [];
  for (let i = 0; i < 20; i++) {
    const hoursAgo = Math.floor(Math.random() * 24 * 7); // Random time within last week
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    infraReports.push({
      latitude: testLocation.latitude + (Math.random() - 0.5) * 0.01, // Within ~1km
      longitude: testLocation.longitude + (Math.random() - 0.5) * 0.01,
      report_type: ['streetlight', 'construction', 'pothole', 'traffic'][Math.floor(Math.random() * 4)],
      description: `Test report ${i + 1}`,
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      user_id: 'test-user',
      created_at: createdAt.toISOString()
    });
  }

  const { error: infraError } = await supabase
    .from('infrastructure_reports')
    .insert(infraReports);

  if (infraError) {
    console.error('Error inserting infrastructure reports:', infraError);
  } else {
    console.log('Inserted 20 infrastructure reports');
  }

  // Insert vibe reports
  const vibeReports = [];
  const vibeTypes = ['safe', 'unsafe', 'crowded', 'quiet', 'well_lit', 'dark'];

  for (let i = 0; i < 30; i++) {
    const hoursAgo = Math.floor(Math.random() * 24 * 7); // Random time within last week
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    vibeReports.push({
      user_id: 'test-user',
      vibe_type: vibeTypes[Math.floor(Math.random() * vibeTypes.length)],
      latitude: testLocation.latitude + (Math.random() - 0.5) * 0.01,
      longitude: testLocation.longitude + (Math.random() - 0.5) * 0.01,
      location: `Test Location ${i + 1}`,
      notes: `Test vibe report ${i + 1}`,
      emergency: false,
      created_at: createdAt.toISOString()
    });
  }

  const { error: vibeError } = await supabase
    .from('reports')
    .insert(vibeReports);

  if (vibeError) {
    console.error('Error inserting vibe reports:', vibeError);
  } else {
    console.log('Inserted 30 vibe reports');
  }

  console.log('Test data insertion complete!');
  console.log('Test location coordinates:', testLocation);
  console.log('You can now test the Neighborhood Rhythm feature at these coordinates.');
}

async function main() {
  try {
    await checkExistingData();

    const shouldInsert = process.argv.includes('--insert');
    if (shouldInsert) {
      await insertTestData();
    } else {
      console.log('\nTo insert test data, run: node test-neighborhood-rhythm.js --insert');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
