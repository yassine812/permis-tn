/* eslint-env browser */
// A navigation preference only; all data access is authorized on the server.
export function rememberAudience(role) {
  try {
    localStorage.setItem('permis-tn-audience', role);
  } catch {}
}
export function isStudentEntry() {
  const view = new URLSearchParams(window.location.search).get('espace');
  if (view === 'eleve' || view === 'moniteur') {
    rememberAudience(view === 'eleve' ? 'student' : 'owner');
    return view === 'eleve';
  }
  try {
    return localStorage.getItem('permis-tn-audience') === 'student';
  } catch {
    return false;
  }
}
