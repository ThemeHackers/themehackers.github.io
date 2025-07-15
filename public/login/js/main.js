const SUPABASE_URL = window.ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  alert('Supabase environment variables are not set. Please check your Netlify configuration.');
  throw new Error('Missing Supabase environment variables');
}

console.log('SUPABASE_URL', SUPABASE_URL);
console.log('SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const googleBtn = document.getElementById('google-signin');
const alertBox = document.getElementById('login-alert');

if (googleBtn && alertBox) {
  googleBtn.addEventListener('click', async () => {
    googleBtn.disabled = true;
    googleBtn.innerHTML = '<span class="th-spinner"></span> Signing in...';
    alertBox.style.display = 'none';
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/login/dashboard.html'
        }
      });
      if (error) {
        console.error('OAuth error:', error);
        alertBox.style.display = 'block';
        alertBox.className = 'th-alert th-alert-danger';
        alertBox.textContent = 'Login failed: ' + error.message;
      }
    } catch (err) {
      alertBox.style.display = 'block';
      alertBox.className = 'th-alert th-alert-danger';
      alertBox.textContent = 'Unexpected error: ' + (err && err.message ? err.message : 'Unknown error');
    } finally {
      googleBtn.disabled = false;
      googleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M43.6 20.5H42V20.5H24V27.5H35.1C33.6 31.4 29.1 34 24 34C17.4 34 12 28.6 12 22C12 15.4 17.4 10 24 10C27.1 10 29.9 11.1 32 13L37 8C33.5 4.8 28.1 3 24 3C13.5 3 5 11.5 5 22C5 32.5 13.5 41 24 41C34.5 41 43 32.5 43 22C43 21 43 20.7 43.6 20.5Z"></path><path fill="#34A853" d="M6.3 14.7L12.1 18.7C13.7 15.1 18.4 10 24 10C27.1 10 29.9 11.1 32 13L37 8C33.5 4.8 28.1 3 24 3C16.3 3 9.6 7.8 6.3 14.7Z"></path><path fill="#FBBC05" d="M24 41C29 41 33.4 39.2 36.7 36.3L31.3 31.7C29.3 33.1 26.8 34 24 34C18.9 34 14.4 31.4 12.9 27.5L6.2 31.8C9.5 38.2 16.2 41 24 41Z"></path><path fill="#EA4335" d="M43.6 20.5H42V20.5H24V27.5H35.1C34.4 29.3 33.2 30.8 31.3 31.7L36.7 36.3C39.7 33.6 41.7 28.9 41.7 22C41.7 21 41.6 20.7 43.6 20.5Z"></path></g></svg> Sign in with Google`;
    }
  });
}
