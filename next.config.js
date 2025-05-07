// next.config.js file
//

module.exports = {
    async headers() {
        return [
            {
                // Matching all API routes
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "https://www.patriotthanks.com" },
                    { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS, PATCH, DELETE, POST, PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, " +
                                                                    "Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, " +
                                                                    "Authorization, cache-control, pragma, expires, if-modified-since, " +
                                                                    "if-none-match, user-agent, referer, cookie" }
                ]
            }
        ]
    },
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        // MongoDB requires some node-specific modules
        // that should only be loaded during server-side rendering
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                net: false,
                tls: false,
                fs: false,
                child_process: false,
                'fs/promises': false,
            };
        }
        return config;
    },
};