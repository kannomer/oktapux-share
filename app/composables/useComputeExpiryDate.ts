export default function(expiryAmount: Ref<number>, expiryUnit: Ref<string>){
    const computedExpiryDate = computed(() => {
        const now = new Date()
        const amount = expiryAmount.value

        switch (expiryUnit.value) {
            case 'minute': now.setMinutes(now.getMinutes() + amount); break
            case 'hour':   now.setHours(now.getHours() + amount); break
            case 'day':    now.setDate(now.getDate() + amount); break
            case 'week':   now.setDate(now.getDate() + amount * 7); break
            case 'month':  now.setMonth(now.getMonth() + amount); break
            case 'year':   now.setFullYear(now.getFullYear() + amount); break
        }
        return now.toISOString()
    })
    return { computedExpiryDate }
}