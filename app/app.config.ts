export default defineAppConfig({
  ui: {
    toast: {
      slots: {
        root: 'bg-bg border border-white/35',
        title: 'text-white text-lg',
        description: 'text-white/65 text-base',
        icon: 'text-white!',
        progress: '[&>div]:bg-bg! **:data-[slot=indicator]:bg-white!'
      }
    }
  }
})