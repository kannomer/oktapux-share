import { checkAdminExists } from "../utils/admin-state";

export default defineEventHandler(async (event) => {
	const path = getRequestURL(event).pathname

	if(path.startsWith("/setup") || path === "/api/setup") return

	const exists = await checkAdminExists()
	if(exists) return

	// API requests get a clean error instead of an HTML redirect
	if(path.startsWith("/api/")) {
		throw createError({ statusCode: 403, message: "Setup has not yet been completed" })
	}

	return sendRedirect(event, "/setup")
})