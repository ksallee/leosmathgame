import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';

// Lab routes are dev-only — they ship in the static bundle (Vite tree-
// shaking won't drop them since they're route entries) but the runtime
// gate redirects to / in production. Don't link to /lab from the kid-
// facing UI in prod builds either (the home page already gates its own
// /lab link on import.meta.env.DEV).
export const prerender = false;

export const load = () => {
	if (browser && !import.meta.env.DEV) {
		throw redirect(303, '/');
	}
	return {};
};
