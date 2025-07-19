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
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert('User not found');
    return;
  }
  
  
  let accessToken = null;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (session && session.access_token) {
    accessToken = session.access_token;
  } else {
  
    try {
      const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
      if (authToken) {
        const tokenData = JSON.parse(authToken);
        accessToken = tokenData.access_token;
      }
    } catch (localStorageError) {
      console.error('Error reading from localStorage:', localStorageError);
    }
  }
  
  if (!accessToken) {
    console.error('Session error:', sessionError);
    console.log('Session data:', session);
    console.log('localStorage auth token:', localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token'));
    alert('No access token found. Please login again.');
    return;
  }

  try {
    console.log('Attempting to delete account for user:', user.id);
    const response = await fetch('https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/smart-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ user_id: user.id })
    });

    console.log('Delete account response status:', response.status);
    
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
    showResultModal(false, "Network error: " + error.message);
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
