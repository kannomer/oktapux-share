// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
	"@nuxt/ui",
	"nuxt-auth-utils"
	],
  css: ['~/assets/css/main.css'],
  ui: {
    theme: {
      colors: ["primary", "secondary", "info", "success", "warning", "error"]
    },
  },

  app: {
    head: {
      title: "Oktapux",
      htmlAttrs: {
        lang: "en",
      },
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico"},
      ],
    },
  },

  nitro: {
    preset: "node-server"
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      }
    }
  },
  
  vite: {
	optimizeDeps: {
		include: [
			'qrcode',
		]
	}
  },

  runtimeConfig: {
    session: {
      maxAge: 60 * 30, // 30 minutes
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      }
    }
  }
})