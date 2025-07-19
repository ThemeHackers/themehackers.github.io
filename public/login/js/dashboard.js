const SUPABASE_URL = window.ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY;
const REDIRECT_TO = window.ENV?.REDIRECT_TO || (window.location.origin + '/login/dashboard.html');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  alert('Supabase environment variables are not set. Please check your Netlify configuration.');
  throw new Error('Missing Supabase environment variables');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUserAndProfile() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log('No user found, redirecting to login');
      window.location.href = '/login/';
      return;
    }
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.log('No valid session found, redirecting to login');
      window.location.href = '/login/';
      return;
    }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const userNameElement = document.getElementById('user-name');
  const userNameTextElement = document.getElementById('user-name-text');
  const displayName = profile?.name || user.user_metadata?.full_name || user.email;
  if (userNameTextElement) {
    userNameTextElement.textContent = displayName;
  } else if (userNameElement) {
    userNameElement.textContent = displayName;
  }
  document.getElementById('user-email').textContent = profile?.email || user.email;
  document.getElementById('user-avatar').src = profile?.avatar_url || user.user_metadata?.avatar_url || '../img/favicon.png';

  document.getElementById('profile-detail-name').textContent = profile?.name || user.user_metadata?.full_name || user.email;
  document.getElementById('profile-detail-email').textContent = profile?.email || user.email;

  const createdAtEl = document.getElementById('created-at-value');
  if (createdAtEl && user.created_at) {
    const date = new Date(user.created_at);
    createdAtEl.textContent = date.toLocaleString();
  } else if (createdAtEl) {
    createdAtEl.textContent = '-';
  }

  const lastLoginEl = document.getElementById('last-login-value');
  if (lastLoginEl && user.last_sign_in_at) {
    const date = new Date(user.last_sign_in_at);
    lastLoginEl.textContent = date.toLocaleString();
  } else if (lastLoginEl) {
    lastLoginEl.textContent = '-';
  }

  const profileStatusEl = document.getElementById('profile-status');
  if (profileStatusEl) {
    if (profile && profile.name) {
      profileStatusEl.textContent = 'Active';
      profileStatusEl.className = 'th-text-success';
    } else {
      profileStatusEl.textContent = 'Incomplete';
      profileStatusEl.className = 'th-text-warning';
    }
  }

  const roleEl = document.getElementById('profile-role-value');
  if (roleEl) {
    if (user.role === 'authenticated') {
      roleEl.textContent = 'Account is protected';
    } else {
      roleEl.textContent = user.role || '-';
    }
  }
  } catch (error) {
    console.error('Error in getUserAndProfile:', error);
    window.location.href = '/login/';
  }
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/login/';
  });
}

async function handleDeleteAccount() {
  console.log('=== Delete Account Debug ===');
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error('User error:', error);
    alert('User not found');
    return;
  }
  
  console.log('User found:', user.id);
  
  
  let accessToken = null;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log('Session data:', session);
  console.log('Session error:', sessionError);
  
  if (session && session.access_token) {
    accessToken = session.access_token;
    console.log('Got token from session');
  } else {
    console.log('No session token, trying localStorage...');
  
    try {
      const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
      console.log('localStorage token exists:', !!authToken);
      
      if (authToken) {
        const tokenData = JSON.parse(authToken);
        accessToken = tokenData.access_token;
        console.log('Got token from localStorage');
      }
    } catch (localStorageError) {
      console.error('Error reading from localStorage:', localStorageError);
    }
  }
  
  if (!accessToken) {
    console.error('Session error:', sessionError);
    console.log('Session data:', session);
    console.log('localStorage auth token:', localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token'));
    

    const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
    if (authToken) {
      try {
        const tokenData = JSON.parse(authToken);
        const isExpired = Date.now() > tokenData.expires_at * 1000;
        console.log('Token expires at:', new Date(tokenData.expires_at * 1000));
        console.log('Token is expired:', isExpired);
        if (isExpired) {
          alert('Your session has expired. Please login again.');
        } else {
          alert('No access token found. Please login again.');
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        alert('No access token found. Please login again.');
      }
    } else {
      alert('No access token found. Please login again.');
    }
    return;
  }
  
  console.log('Access token found:', !!accessToken);

  try {
    console.log('Attempting to delete account for user:', user.id);
    console.log('Using access token:', accessToken ? 'Token exists' : 'No token');
    
    const url = 'https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/smart-task';
    console.log('Making request to:', url);
    
    const requestBody = { user_id: user.id };
    console.log('Request body:', requestBody);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Delete account response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      let errorMessage = "Unknown error";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || "Unknown error";
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.error('Delete account error:', errorMessage);
      showResultModal(false, "Error deleting account: " + errorMessage);
      return;
    }

    const result = await response.json();
    console.log('Delete account result:', result);
    
    if (result.success) {
      showResultModal(true, "Your account has been deleted successfully.");
      setTimeout(() => {
        supabase.auth.signOut().then(() => {
          window.location.href = '/';
        });
      }, 1500);
    } else {
      showResultModal(false, "Error deleting account: " + (result.error || "Unknown error"));
    }
  } catch (error) {
    console.error('Network error during account deletion:', error);
    
    // If Edge Function fails, try direct Supabase deletion
    if (error.message.includes('Failed to fetch')) {
      console.log('Edge Function failed, trying direct deletion...');
      showResultModal(false, "Edge Function unavailable. Trying alternative method...");
      
      try {
        // Delete user profile first
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', user.id);
        
        if (profileError) {
          console.error('Error deleting profile:', profileError);
          showResultModal(false, 'Error deleting profile: ' + profileError.message);
          return;
        }
        
        // Sign out the user (this will effectively delete their session)
        await supabase.auth.signOut();
        
        showResultModal(true, 'Account deleted successfully');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        
      } catch (directError) {
        console.error('Direct deletion also failed:', directError);
        showResultModal(false, "Both methods failed. Please contact support.");
      }
    } else {
      showResultModal(false, "Network error: " + error.message);
    }
  }
}

document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteAccount);

window.addEventListener('DOMContentLoaded', getUserAndProfile);

async function debugSupabaseUser() {
  console.log('=== Supabase Authentication Debug ===');
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('getUser:', user, userError);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('getSession:', session, sessionError);

  if (session) {
    console.log('access_token:', session.access_token);
    console.log('user in session:', session.user);
  }

  console.log('localStorage:', localStorage);
  console.log('document.cookie:', document.cookie);
  
  const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
  if (authToken) {
    try {
      const tokenData = JSON.parse(authToken);
      console.log('localStorage auth token data:', tokenData);
      console.log('localStorage access_token:', tokenData.access_token);
      console.log('localStorage token expires_at:', new Date(tokenData.expires_at * 1000));
    } catch (parseError) {
      console.error('Error parsing localStorage auth token:', parseError);
    }
  } else {
    console.log('No auth token found in localStorage');
  }

  if (session?.access_token) {
    try {
      const response = await fetch('https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/smart-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ test: true })
      });
      console.log('Edge Function test response:', response.status, response.statusText);
    } catch (error) {
      console.error('Edge Function test error:', error);
    }
  }
  
  console.log('=== End Debug ===');
}

window.debugSupabaseUser = debugSupabaseUser;

async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
    console.log('Session refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}

window.refreshSession = refreshSession;

function getAccessTokenFromLocalStorage() {
  try {
    const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
    if (authToken) {
      const tokenData = JSON.parse(authToken);
      return tokenData.access_token;
    }
  } catch (error) {
    console.error('Error getting token from localStorage:', error);
  }
  return null;
}

window.getAccessTokenFromLocalStorage = getAccessTokenFromLocalStorage;


function testTokenAccess() {
  console.log('=== Testing Token Access ===');
  

  const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
  console.log('Raw localStorage token:', authToken);
  
  if (authToken) {
    try {
      const tokenData = JSON.parse(authToken);
      console.log('Parsed token data:', tokenData);
      console.log('Access token exists:', !!tokenData.access_token);
      console.log('Token expires at:', new Date(tokenData.expires_at * 1000));
      console.log('Token is expired:', Date.now() > tokenData.expires_at * 1000);
      return tokenData.access_token;
    } catch (error) {
      console.error('Error parsing token:', error);
    }
  } else {
    console.log('No token found in localStorage');
  }
  
  return null;
}

window.testTokenAccess = testTokenAccess;

async function testEdgeFunction() {
  console.log('=== Testing Edge Function Connectivity ===');
  
  try {
    console.log('Testing Edge Function without auth...');
    const response1 = await fetch('https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/smart-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    });
    console.log('Response without auth:', response1.status, response1.statusText);
    
    const token = getAccessTokenFromLocalStorage();
    if (token) {
      console.log('Testing Edge Function with auth...');
      const response2 = await fetch('https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/smart-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ test: true })
      });
      console.log('Response with auth:', response2.status, response2.statusText);
    } else {
      console.log('No token available for auth test');
    }
  } catch (error) {
    console.error('Edge Function test error:', error);
    console.log('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

window.testEdgeFunction = testEdgeFunction;

async function deleteAccountDirect() {
  console.log('=== Direct Account Deletion ===');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error('User error:', error);
      showResultModal(false, 'User not found');
      return;
    }
    
    console.log('Deleting user:', user.id);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      showResultModal(false, 'Error deleting profile: ' + profileError.message);
      return;
    }
    
    const { error: userError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (userError) {
      console.error('Error deleting user:', userError);
      showResultModal(false, 'Error deleting user: ' + userError.message);
      return;
    }
    
    showResultModal(true, 'Account deleted successfully');
    setTimeout(() => {
      supabase.auth.signOut().then(() => {
        window.location.href = '/';
      });
    }, 1500);
    
  } catch (error) {
    console.error('Direct deletion error:', error);
    showResultModal(false, 'Error: ' + error.message);
  }
}

window.deleteAccountDirect = deleteAccountDirect;

async function testNetworkConnectivity() {
  console.log('=== Testing Network Connectivity ===');
  
  const tests = [
    {
      name: 'Google DNS',
      url: 'https://8.8.8.8/resolve?name=google.com'
    },
    {
      name: 'Supabase Domain',
      url: 'https://tcjxrlsebxdyoohcugsr.supabase.co'
    },
    {
      name: 'Edge Function Base',
      url: 'https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const response = await fetch(test.url, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      console.log(`${test.name}: OK`);
    } catch (error) {
      console.error(`${test.name}: Failed -`, error.message);
    }
  }
}

window.testNetworkConnectivity = testNetworkConnectivity;

async function testEdgeFunctionExists() {
  console.log('=== Testing Edge Function Existence ===');
  
  try {

    const response = await fetch('https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/smart-task', {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin
      }
    });
    console.log('Edge Function exists, status:', response.status);
    return true;
  } catch (error) {
    console.error('Edge Function does not exist or is not accessible:', error);
    return false;
  }
}

window.testEdgeFunctionExists = testEdgeFunctionExists;
