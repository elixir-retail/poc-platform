import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { storeContext } = await parent();
	if (storeContext.store.business_mode === 'retail') {
		redirect(303, '/store');
	}
	return {};
};
