module.exports = {
    // Only use Next.js for API routes
    rewrites: async () => {
        return [
            {
                source: '/api/:path*',
                destination: '/api/:path*',
            },
        ];
    },
    // Prevent Next.js from handling non-API routes
    webpack: (config, { isServer }) => {
        return config;
    },
}