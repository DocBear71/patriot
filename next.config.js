module.exports = {
    async headers() {
        return [
            {
                // Matching all API routes
                source: "/api/:path*",
                headers: [
                    { key: "access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS, PATCH, DELETE, POST. PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-token, X-requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"}
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