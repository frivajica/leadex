import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, cookies, redirect } = context;

	// Define route lists
	const publicRoutes = ['/', '/login', '/register', '/auth/verify', '/pricing', '/checkout'];
	const guestOnlyRoutes = ['/login', '/register'];

	// Normalize path: ignore trailing slash
	const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '');

	const isPublic = publicRoutes.includes(path) || path.startsWith('/locales/') || path === '/favicon.svg';
	const isGuestOnly = guestOnlyRoutes.includes(path);

	// Check for authentication cookie
	const token = cookies.get('access_token');
	const isAuthenticated = !!token?.value;

	console.log(`[Middleware] ${path} - Authenticated: ${isAuthenticated}`);

	// 1. If trying to access a protected route without auth, redirect to login
	if (!isAuthenticated && !isPublic) {
		console.log(`[Middleware] Redirecting to /login from ${path}`);
		return redirect('/login');
	}

	// 2. If trying to access login/register while authenticated, redirect to dashboard
	if (isAuthenticated && isGuestOnly) {
		console.log(`[Middleware] Redirecting to /dashboard from ${path}`);
		return redirect('/dashboard');
	}

	return next();
});
