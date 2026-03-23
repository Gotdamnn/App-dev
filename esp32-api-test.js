#!/usr/bin/env node

/**
 * PatientPulse ESP32 API Test Script
 * 
 * This script tests the ESP32 temperature sensor API endpoints
 * without needing actual hardware.
 * 
 * Usage:
 *   node esp32-api-test.js [server] [device-id]
 * 
 * Examples:
 *   node esp32-api-test.js http://localhost:3001 1
 *   node esp32-api-test.js http://192.168.1.100:3001 2
 */

const http = require('http');
const https = require('https');

// Configuration
const API_SERVER = process.argv[2] || 'http://localhost:3001';
const DEVICE_ID = process.argv[3] || '1';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Helper function to make API requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_SERVER);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        console.log(`\n${colors.cyan}[REQUEST]${colors.reset} ${method} ${path}`);

        const req = client.request(url, options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: jsonBody,
                        rawBody: body
                    });
                } catch (err) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: null,
                        rawBody: body,
                        parseError: err.message
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            const jsonData = JSON.stringify(data, null, 2);
            console.log(`${colors.blue}Payload:${colors.reset}`);
            console.log(jsonData);
            req.write(jsonData);
        }

        req.end();
    });
}

// Log response helper
function logResponse(response) {
    const status = response.statusCode;
    const statusColor = status >= 200 && status < 300 ? colors.green : colors.red;

    console.log(`\n${colors.cyan}[RESPONSE]${colors.reset} ${statusColor}${status}${colors.reset}`);

    if (response.parseError) {
        console.log(`${colors.yellow}⚠ Parse Error: ${response.parseError}${colors.reset}`);
        console.log('Raw body:', response.rawBody);
    } else if (response.body) {
        console.log(JSON.stringify(response.body, null, 2));
    } else if (response.rawBody) {
        console.log(response.rawBody);
    }
}

// Test scenarios
async function runTests() {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  PatientPulse ESP32 API Test Suite${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`\nServer: ${colors.yellow}${API_SERVER}${colors.reset}`);
    console.log(`Device ID: ${colors.yellow}${DEVICE_ID}${colors.reset}\n`);

    try {
        // Test 1: POST /api/devices/:id/vitals (Send temperature)
        console.log(`\n${colors.green}[TEST 1]${colors.reset} Send Temperature Reading`);
        console.log('─'.repeat(60));

        const temperature = 37.2;
        const payload = {
            body_temperature: temperature,
            temperature_status: 'Normal',
            connection_status: 'online',
            signal_strength: 85,
            // patient_id: 1  // Optional
        };

        let response = await makeRequest(
            'POST',
            `/api/devices/${DEVICE_ID}/vitals`,
            payload
        );
        logResponse(response);

        // Test 2: GET /api/devices/:id/status (Get device status)
        console.log(`\n\n${colors.green}[TEST 2]${colors.reset} Get Device Status`);
        console.log('─'.repeat(60));

        response = await makeRequest(
            'GET',
            `/api/devices/${DEVICE_ID}/status`
        );
        logResponse(response);

        // Test 3: GET /api/devices/:id/vitals (Get temperature history)
        console.log(`\n\n${colors.green}[TEST 3]${colors.reset} Get Temperature History (Last 10 readings)`);
        console.log('─'.repeat(60));

        response = await makeRequest(
            'GET',
            `/api/devices/${DEVICE_ID}/vitals?limit=10&hours=24`
        );
        logResponse(response);

        // Test 4: Send fever temperature (should create alert)
        console.log(`\n\n${colors.green}[TEST 4]${colors.reset} Send High Temperature (Fever Alert)`);
        console.log('─'.repeat(60));

        const feverPayload = {
            body_temperature: 39.2,
            temperature_status: 'Fever',
            connection_status: 'online',
            signal_strength: 75
        };

        response = await makeRequest(
            'POST',
            `/api/devices/${DEVICE_ID}/vitals`,
            feverPayload
        );
        logResponse(response);

        // Test 5: Send low signal strength (should create warning)
        console.log(`\n\n${colors.green}[TEST 5]${colors.reset} Send Low Signal Strength (Warning Alert)`);
        console.log('─'.repeat(60));

        const lowSignalPayload = {
            body_temperature: 36.8,
            connection_status: 'online',
            signal_strength: 20  // Low signal
        };

        response = await makeRequest(
            'POST',
            `/api/devices/${DEVICE_ID}/vitals`,
            lowSignalPayload
        );
        logResponse(response);

        // Test 6: Simulate offline device
        console.log(`\n\n${colors.green}[TEST 6]${colors.reset} Send Offline Status`);
        console.log('─'.repeat(60));

        const offlinePayload = {
            body_temperature: 37.0,
            connection_status: 'offline',
            signal_strength: 0
        };

        response = await makeRequest(
            'POST',
            `/api/devices/${DEVICE_ID}/vitals`,
            offlinePayload
        );
        logResponse(response);

        // Test 7: Get latest status again
        console.log(`\n\n${colors.green}[TEST 7]${colors.reset} Get Final Device Status`);
        console.log('─'.repeat(60));

        response = await makeRequest(
            'GET',
            `/api/devices/${DEVICE_ID}/status`
        );
        logResponse(response);

        // Summary
        console.log(`\n\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
        console.log(`${colors.green}✓ All tests completed${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    } catch (error) {
        console.error(`\n${colors.red}✗ Test failed:${colors.reset}`, error.message);
        console.log(`\nMake sure:${colors.reset}`);
        console.log(`  1. PatientPulse server is running: ${API_SERVER}`);
        console.log(`  2. Device ID ${DEVICE_ID} exists in database`);
        console.log(`  3. Network connection is working\n`);
    }
}

// Help text
function showHelp() {
    console.log(`\n${colors.cyan}PatientPulse ESP32 API Test Script${colors.reset}`);
    console.log(`\nUsage:`);
    console.log(`  node esp32-api-test.js [server-url] [device-id]\n`);
    console.log(`Arguments:`);
    console.log(`  server-url    API server URL (default: http://localhost:3001)`);
    console.log(`  device-id     Device ID from database (default: 1)\n`);
    console.log(`Examples:`);
    console.log(`  node esp32-api-test.js`);
    console.log(`  node esp32-api-test.js http://localhost:3001 1`);
    console.log(`  node esp32-api-test.js http://192.168.1.100:3001 2\n`);
}

// Run tests if not showing help
if (process.argv.includes('-h') || process.argv.includes('--help')) {
    showHelp();
} else {
    runTests();
}
