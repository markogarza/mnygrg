import get from 'lodash/get';
import settings from './config/settings.json';
import menuSettings from './config/menus.json';
import { getGoogleFontConfig } from './modules/swell-editor/utils';
import { getLangSettings } from './modules/swell-editor/lang/utils';
import { loadSettings, mergeSettings } from './modules/swell/utils/mergeSettings';

const isProduction = process.env.NODE_ENV === 'production';
const editorMode = process.env.SWELL_EDITOR === 'true';

export default async () => {
	const storeId = process.env.SWELL_STORE_ID;
	const publicKey = process.env.SWELL_PUBLIC_KEY || settings.store.public_key;
	const storeUrl = process.env.SWELL_STORE_URL || settings.store.url;

	const initialSettings = await loadSettings({
		storeId,
		publicKey,
		storeUrl
	});

	const mergedSettings = mergeSettings(initialSettings, settings);
	const mergedMenuSettings = mergeSettings(initialSettings, menuSettings, {
		model: 'menu'
	});

	return {
		build: {
			analyze: !isProduction
		},
		vue: {
			config: {
				devtools: !isProduction,
				productionTip: false
			}
		},

		/*
     ** Make all components in the /components folder available in templates without
     *  needing to import them explicitly or define them on the Vue instance object.
     */
		components: true,

		/*
     ** Set the progress-bar color
     */
		loading: { color: get(mergedSettings, 'colors.accent'), continuous: true },

		/*
     ** Vue plugins to load before mounting the App
     */
		plugins: [
			{ src: '~/plugins/global-scripts', mode: 'client' },
			{ src: '~/plugins/vue-credit-card-validation', mode: 'client' },
			{ src: '~/plugins/directives', mode: 'client' },
			{ src: '~/plugins/swell-lang.js' }
		],

		/*
     ** Nuxt.js modules
     */
		modules: [
			[ '@nuxtjs/gtm' ],

			// [
			//   '@nuxtjs/sentry',
			//   /*
			//    ** Logs app errors with Sentry's browser and node SDKs.
			//    *
			//    *  You can use environment variables or the object below to set config options.
			//    *  See https://github.com/nuxt-community/sentry-module for all available
			//    *  options, defaults, and environment variables.
			//    */
			//   {
			//     // dsn: '', // or SENTRY_DSN in .env
			//     // config: {}
			//   },
			// ],

			/*
       ** Generates a sitemap.xml
       *
       *  Automatically generate or serve dynamic sitemap.xml for Nuxt projects!
       *  See https://github.com/nuxt-community/sentry-module for all available
       *  options, defaults, and environment variables.
       */
			'@nuxtjs/sitemap'
		],

		buildModules: [
			[ 'nuxt-i18n' ],

			[
				/*
         ** Generate dynamic routes for @nuxtjs/sitemap
         *
         */
				'~/modules/swell/utils/generateDynamicRoutes'
			],

			[
				'@nuxtjs/tailwindcss',
				/*
         ** Adds TailwindCSS (including PurgeCSS)
         *
         *  See https://tailwindcss.nuxtjs.org/ for config options.
         */
				{
					// Put your config overrides here
				}
			],

			[
				'@nuxtjs/google-fonts',
				/*
         ** Parses Google Font families and loads them via stylesheet.
         *
         *  The config object is generated by the swell-editor module.
         *  See https://github.com/nuxt-community/google-fonts-module if you want
         *  to eject or provide your own config options.
         */
				getGoogleFontConfig(mergedSettings)
			],

			[
				'~/modules/swell-editor',
				/*
         ** Provides communication and utilitiy functions for interfacing
         *  with Swell's storefront editor and fetching settings/content.
         *
         * IMPORTANT: the swell module must come after this one, otherwise everything breaks.
         * If you aren't using the storefront editor, this module can be safely removed.
         */
				{
					useEditorSettings: editorMode,
					settings: mergedSettings
				}
			],

			[
				'~/modules/swell',
				/*
         ** Initializes Swell.js SDK and injects it into Nuxt's context.
         *
         *  If you've cloned this repository from your store dashboard,
         *  these settings will already be configured in config/settings.json.
         *
         *  You can optionally override them here or using environment variables.
         *  https://github.com/swellstores/swell-theme-origin#configuration
         */
				{
					storeId,
					publicKey,
					storeUrl,
					previewContent: editorMode,
					currentSettings: {
						settings: mergedSettings,
						menus: mergedMenuSettings
					}
				}
			],

			[
				'@nuxtjs/pwa'
				/*
         ** Provides PWA (Progressive Web App) functionality including app icons,
         *  SEO metadata, manifest.json file, and offline caching.
         *
         *  Use the object below to set config options.
         *  See https://pwa.nuxtjs.org/ for all available options and defaults.
         */
			]
		],

		gtm: {
			id: get(mergedSettings, 'analytics.gtmId'),
			enabled: !!get(mergedSettings, 'analytics.gtmId') && isProduction
		},

		pwa: {
			manifest: false,
			meta: {
				name: get(mergedSettings, 'store.name')
			},
			workbox: {
				runtimeCaching: [
					{
						urlPattern: `${process.env.CDN_HOST}/*` || 'https://cdn.schema.io/*'
					}
				]
			}
		},

		i18n: getLangSettings(mergedSettings, editorMode),

		sitemap: {
			hostname: storeUrl,
			gzip: true,
			i18n: true,
			exclude: [ '/account/**', '/*/account/**' ]
		},

		generate: {
			exclude: [ /^\/?([a-z]{2}-?[A-Z]{2}?)?\/account/ ],
			fallback: true // Fallback to the generated 404.html
		},

		/*
     ** Extend default Nuxt routes to add page aliases
     */
		router: {
			trailingSlash: true,
			extendRoutes(routes, resolve) {
				// Rewrite to use the pages/_slug.vue component for home page, since the
				// content type is the same. If you want to have a unique template,
				// create a pages/index.vue and remove this route definition.
				routes.push({
					name: 'index',
					path: '/',
					component: resolve(__dirname, 'pages/_slug.vue')
				});
			}
		},

		/*
     ** Extend default Nuxt server options
     */
		server: {
			host: process.env.HOST || 'localhost',
			port: process.env.PORT || 3333
		},

		env: {
			cdnHost: process.env.CDN_HOST || 'https://cdn.schema.io'
		}
	};
};
