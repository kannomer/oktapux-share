import { checkAdminExists } from "../utils/admin-state";

export default defineEventHandler(async (event) => {
	const path = getRequestURL(event).pathname
	const exists = await checkAdminExists()

	// /setup (and its API) is only meant to be reachable before an admin
	// account exists. Once one does, it should redirect away rather than
	// stay reachable indefinitely.
	if(path.startsWith("/setup") || path === "/api/setup") {
		if(exists) {
			if(path.startsWith("/api/")) {
				throw createError({ statusCode: 403, message: "Setup has already been completed" })
			}
			return sendRedirect(event, "/admin/login")
		}
		return
	}

	if(exists) return

	// API requests get a clean error instead of an HTML redirect
	if(path.startsWith("/api/")) {
		throw createError({ statusCode: 403, message: "Setup has not yet been completed" })
	}

	return sendRedirect(event, "/setup")
})