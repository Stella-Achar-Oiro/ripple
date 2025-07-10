// Test script to verify search functionality
const API_URL = 'http://localhost:8000';

async function testLogin() {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email: 'denil@mail.com',
      password: 'password123' // Assuming this is the password
    })
  });
  
  const data = await response.json();
  console.log('Login response:', data);
  return response.ok;
}

async function testUserSearch() {
  console.log('\n=== Testing User Search ===');
  const response = await fetch(`${API_URL}/api/auth/search?q=sent`, {
    credentials: 'include',
  });
  
  const data = await response.json();
  console.log('User search response:', JSON.stringify(data, null, 2));
  return response.ok;
}

async function testGroupSearch() {
  console.log('\n=== Testing Group Search ===');
  const response = await fetch(`${API_URL}/api/groups/search?q=rgb`, {
    credentials: 'include',
  });
  
  const data = await response.json();
  console.log('Group search response:', JSON.stringify(data, null, 2));
  return response.ok;
}

async function runTests() {
  try {
    console.log('=== Starting Search Tests ===');
    
    // First try to login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.error('Login failed, cannot proceed with search tests');
      return;
    }
    
    // Test user search
    const userSearchSuccess = await testUserSearch();
    console.log('User search success:', userSearchSuccess);
    
    // Test group search
    const groupSearchSuccess = await testGroupSearch();
    console.log('Group search success:', groupSearchSuccess);
    
    console.log('\n=== Test Results ===');
    console.log('User search:', userSearchSuccess ? 'PASS' : 'FAIL');
    console.log('Group search:', groupSearchSuccess ? 'PASS' : 'FAIL');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the tests
runTests();
