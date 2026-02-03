// Test Google OAuth endpoint
async function testGoogleOAuth() {
  try {
    // Create a mock Google credential (for testing only)
    const mockCredential = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEIn0.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXVkIjoiNTE3ODE4OTg4NzA5LWRjcnM5NDRmN2tsMTI5ZDhrZnU3bW9kNzdkcjVlc2wuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiVGVzdCBVc2VyIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDaG9jR3ZqQW9nMk9yNnJtT2hVYzJ5a1pQb0Z1Wk9YUzZqZz09PXM5Ni1jIiwiaWF0IjoxNjcwMDAwMDAwLCJleHAiOjE2NzAwMDM2MDB9.test";

    const response = await fetch('http://localhost:5000/api/auth/oauth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ 
        credential: mockCredential,
        redirectUrl: '/account'
      }),
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testGoogleOAuth();
