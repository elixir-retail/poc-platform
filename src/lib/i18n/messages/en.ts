export const en = {
	'app.platform': 'Platform',
	'app.operatorDashboard': 'Operator dashboard',
	'app.navigation': 'Navigation',
	'app.signedIn': 'Signed in',
	'app.signOut': 'Sign out',
	'app.toggleSidebar': 'Toggle Sidebar',
	'app.sidebar': 'Sidebar',
	'app.sidebarDescription': 'Displays the mobile sidebar.',
	'app.language': 'Language',

	'nav.dashboard': 'Dashboard',
	'nav.organizations': 'Organizations',
	'nav.billing': 'Billing',
	'nav.users': 'Users',
	'nav.audit': 'Audit log',

	'theme.toggle': 'Toggle dark mode',
	'theme.toLight': 'Switch to light mode',
	'theme.toDark': 'Switch to dark mode',

	'login.title': 'Sign in',
	'login.description': 'Platform operator dashboard',
	'login.email': 'Email',
	'login.password': 'Password',
	'login.submit': 'Sign in',
	'login.error.invalidEmail': 'Enter a valid email address',
	'login.error.passwordRequired': 'Password is required',
	'login.error.invalidCredentials': 'Invalid email or password',
	'login.error.generic': 'Unable to sign in. Please try again.',

	'dashboard.title': 'Dashboard',
	'dashboard.welcome':
		'Welcome, {email}. Merchant onboarding, billing, access, and audit views will land here.',
	'dashboard.welcomeAnonymous':
		'Welcome. Merchant onboarding, billing, access, and audit views will land here.',

	'organizations.title': 'Organizations',
	'organizations.description': 'Merchant and organization onboarding will appear here.',

	'billing.title': 'Billing',
	'billing.description': 'Subscription and billing views will appear here.',

	'users.title': 'Users',
	'users.description': 'User access management will appear here.',

	'audit.title': 'Audit log',
	'audit.description': 'Platform audit events will appear here.'
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
