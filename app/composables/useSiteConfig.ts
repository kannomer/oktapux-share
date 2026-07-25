export default function () {
	// this is used for the app to not make 
	// duplicate calls to the api.
	return useFetch("/api/config", { key: "site-config" })
}