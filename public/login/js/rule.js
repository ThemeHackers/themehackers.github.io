const SUPABASE_URL = window.ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY;
const LOGIN_PAGE = "/login/";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  alert('Supabase environment variables are not set. Please check your configuration.');
  throw new Error('Missing Supabase environment variables');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAuthOrRedirect() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.replace(LOGIN_PAGE);
  }
}

checkAuthOrRedirect(); 
