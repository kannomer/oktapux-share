export default function () {
	const checkStrength = (password: string) => {
		const issues: string[] = []
		if(password.length < 8) issues.push("At least 8 characters")
		if (!/[A-Z]/.test(password)) issues.push('At least one uppercase letter')
    	if (!/[0-9]/.test(password)) issues.push('At least one number')
		
		return { isStrong: issues.length === 0, issues }
	}
	return checkStrength
}