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
  
  const phoneElement = document.getElementById('profile-detail-phone');
  if (phoneElement) {
    phoneElement.textContent = profile?.phone || '-';
  }


  window.currentProfile = profile;

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

async function updateUserProfile(name, phone) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('No valid session found');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/update-profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ name, phone })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error updating profile via Edge Function:', error);
    return { success: false, error: error.message };
  }
}

async function updateUserProfileWithEdgeFunction(name, phone) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('No valid session found');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/update-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ name, phone })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error updating profile via Edge Function:', error);
    return { success: false, error: error.message };
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
    const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
    if (authToken) {
      try {
        const tokenData = JSON.parse(authToken);
        const isExpired = Date.now() > tokenData.expires_at * 1000;
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

  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const mobileDeleteBtn = document.getElementById('mobile-delete-account-btn');
  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.classList.add('loading');
  confirmDeleteBtn.textContent = '';
  
  if (mobileDeleteBtn) {
    mobileDeleteBtn.classList.add('loading');
  }

  try { 
    const url = 'https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/delete-user';
    const requestBody = { user_id: user.id };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      let errorMessage = "Unknown error";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || "Unknown error";
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      confirmDeleteBtn.classList.remove('loading');
      confirmDeleteBtn.classList.add('shake-animation');
      confirmDeleteBtn.textContent = originalText;
      
      if (mobileDeleteBtn) {
        mobileDeleteBtn.classList.remove('loading');
        mobileDeleteBtn.classList.add('shake-animation');
      }
      
      setTimeout(() => {
        confirmDeleteBtn.classList.remove('shake-animation');
        if (mobileDeleteBtn) {
          mobileDeleteBtn.classList.remove('shake-animation');
        }
      }, 500);
      
      showResultModal(false, "Error deleting account: " + errorMessage);
      return;
    }

    const result = await response.json();
    
    if (result.success) {

      confirmDeleteBtn.classList.remove('loading');
      confirmDeleteBtn.classList.add('success');
      confirmDeleteBtn.classList.add('success-animation');
      
      if (mobileDeleteBtn) {
        mobileDeleteBtn.classList.remove('loading');
        mobileDeleteBtn.classList.add('success');
      }
      
      setTimeout(() => {
        showResultModal(true, "Your account has been deleted successfully.");
        setTimeout(() => {
          supabase.auth.signOut().then(() => {
            window.location.href = '/';
          });
        }, 1500);
      }, 800);
    } else {

      confirmDeleteBtn.classList.remove('loading');
      confirmDeleteBtn.classList.add('shake-animation');
      confirmDeleteBtn.textContent = originalText;
      
      if (mobileDeleteBtn) {
        mobileDeleteBtn.classList.remove('loading');
        mobileDeleteBtn.classList.add('shake-animation');
      }
      
      setTimeout(() => {
        confirmDeleteBtn.classList.remove('shake-animation');
        if (mobileDeleteBtn) {
          mobileDeleteBtn.classList.remove('shake-animation');
        }
      }, 500);
      
      showResultModal(false, "Error deleting account: " + (result.error || "Unknown error"));
    }
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      confirmDeleteBtn.classList.remove('loading');
      confirmDeleteBtn.textContent = originalText;
      
      showResultModal(false, "Edge Function unavailable. Trying alternative method...");
      
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', user.id);
        
        if (profileError) {
          showResultModal(false, 'Error deleting profile: ' + profileError.message);
          return;
        }
        
        await supabase.auth.signOut();
        
        confirmDeleteBtn.classList.add('success');
        confirmDeleteBtn.classList.add('success-animation');
        
        if (mobileDeleteBtn) {
          mobileDeleteBtn.classList.remove('loading');
          mobileDeleteBtn.classList.add('success');
        }
        
        setTimeout(() => {
          showResultModal(true, 'Account deleted successfully');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }, 800);
        
      } catch (directError) {
        confirmDeleteBtn.classList.remove('loading');
        confirmDeleteBtn.classList.add('shake-animation');
        confirmDeleteBtn.textContent = originalText;
        
        if (mobileDeleteBtn) {
          mobileDeleteBtn.classList.remove('loading');
          mobileDeleteBtn.classList.add('shake-animation');
        }
        
        setTimeout(() => {
          confirmDeleteBtn.classList.remove('shake-animation');
          if (mobileDeleteBtn) {
            mobileDeleteBtn.classList.remove('shake-animation');
          }
        }, 500);
        
        showResultModal(false, "Both methods failed. Please contact support.");
      }
    } else {
      
      confirmDeleteBtn.classList.remove('loading');
      confirmDeleteBtn.classList.add('shake-animation');
      confirmDeleteBtn.textContent = originalText;
      
      if (mobileDeleteBtn) {
        mobileDeleteBtn.classList.remove('loading');
        mobileDeleteBtn.classList.add('shake-animation');
      }
      
      setTimeout(() => {
        confirmDeleteBtn.classList.remove('shake-animation');
        if (mobileDeleteBtn) {
          mobileDeleteBtn.classList.remove('shake-animation');
        }
      }, 500);
      
      showResultModal(false, "Network error: " + error.message);
    }
  }
}

document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteAccount);

window.addEventListener('DOMContentLoaded', getUserAndProfile);


async function getUserId() {
  try {
 
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log('No user found');
      return null;
    }
    console.log('User ID:', user.id); 
    return user.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

async function getUserIdFromSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.log('No session found');
      return null;
    }
    console.log('User ID from session:', session.user.id);
    return session.user.id;
  } catch (error) {
    console.error('Error getting user ID from session:', error);
    return null;
  }
}

function getUserIdFromLocalStorage() {
  try {
    const authToken = localStorage.getItem('sb-tcjxrlsebxdyoohcugsr-auth-token');
    if (authToken) {
      const tokenData = JSON.parse(authToken);
      console.log('User ID from localStorage:', tokenData.user.id);
      return tokenData.user.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from localStorage:', error);
    return null;
  }
}


function listenToAuthChanges() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      console.log('User signed in, ID:', session.user.id);
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
    }
  });
}

async function getUserPhone() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('No user found');
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting profile:', profileError);
      return null;
    }

    console.log('Phone from profiles:', profile.phone);
    return profile.phone;
  } catch (error) {
    console.error('Error getting phone:', error);
    return null;
  }
}

async function getUserPhoneFromMetadata() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }

    const phone = user.user_metadata?.phone;
    console.log('Phone from metadata:', phone);
    return phone;
  } catch (error) {
    console.error('Error getting phone from metadata:', error);
    return null;
  }
}

async function getUserProfile() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting profile:', profileError);
      return null;
    }

    console.log('Full profile:', profile);
    console.log('Phone:', profile.phone);
    console.log('Name:', profile.name);
    console.log('Email:', profile.email);
    
    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

async function getAllUserPhones() {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, name, phone, email')
      .not('phone', 'is', null);

    if (error) {
      console.error('Error getting all profiles:', error);
      return null;
    }

    console.log('All users with phones:', profiles);
    return profiles;
  } catch (error) {
    console.error('Error getting all user phones:', error);
    return null;
  }
}
