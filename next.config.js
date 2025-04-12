module.exports = {
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