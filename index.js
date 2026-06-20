'use strict';

const path = require('path');
const fs = require('fs');

// Helper to locate the running The Lounge installation directory
function findTheLoungeDir() {
    // Check main running script path
    let currentDir = require.main ? path.dirname(require.main.filename) : process.cwd();
    while (currentDir !== path.dirname(currentDir)) {
        const pkgPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (pkg.name === 'thelounge') {
                    return currentDir;
                }
            } catch (e) {}
        }
        currentDir = path.dirname(currentDir);
    }
    
    // Check standard installation paths as fallback
    const possiblePaths = [
        '/usr/local/share/.config/yarn/global/node_modules/thelounge',
        '/usr/local/lib/node_modules/thelounge',
        '/usr/lib/node_modules/thelounge'
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(path.join(p, 'package.json'))) {
            return p;
        }
    }
    
    try {
        return path.dirname(require.resolve('thelounge/package.json'));
    } catch (e) {}
    
    return null;
}

module.exports = {
    onServerStart(api) {
        api.Logger.info("Initializing Image Preview plugin...");

        const theloungeDir = findTheLoungeDir();
        if (!theloungeDir) {
            api.Logger.error("Failed to find The Lounge installation directory. Image Preview plugin will not function.");
            return;
        }
        
        api.Logger.info(`Found The Lounge installation at: ${theloungeDir}`);

        // Monkey-patch Express response prototype to allow image loading in CSP headers
        try {
            let express;
            try {
                express = require('express');
            } catch (e) {
                try {
                    express = require(path.join(theloungeDir, 'node_modules', 'express'));
                } catch (e2) {
                    express = require(path.join(path.dirname(theloungeDir), 'express'));
                }
            }
            
            const originalSetHeader = express.response.setHeader;
            express.response.setHeader = function(name, value) {
                if (typeof name === 'string' && name.toLowerCase() === 'content-security-policy' && typeof value === 'string') {
                    if (pluginConfig.enabled) {
                        value = value.replace(
                            "img-src 'self' data: https://user-images.githubusercontent.com",
                            "img-src http: https: data:"
                        );
                    }
                }
                return originalSetHeader.call(this, name, value);
            };
        } catch (e) {
            api.Logger.error("Failed to patch Express CSP headers:", e);
        }

        // Register custom style sheet
        api.Stylesheets.addFile("style.css");

        // Load configuration
        const configDir = api.Config.getPersistentStorageDir();
        const configPath = path.join(configDir, 'config.json');
        let pluginConfig = {
            enabled: true,
            maxImageSize: 2048, // in KB
            previewImgur: true,
            previewCatbox: true,
            previewGyazo: true,
            previewGiphy: true,
            previewTenor: true,
            previewAllThumbnails: false,
        };

        function loadConfig() {
            if (!fs.existsSync(configPath)) {
                try {
                    fs.writeFileSync(configPath, JSON.stringify(pluginConfig, null, 2), 'utf8');
                } catch (e) {
                    api.Logger.error("Failed to write default config:", e);
                }
                return;
            }
            try {
                const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                pluginConfig = {
                    enabled: data.enabled !== undefined ? data.enabled : true,
                    maxImageSize: data.maxImageSize !== undefined ? data.maxImageSize : 2048,
                    previewImgur: data.previewImgur !== undefined ? data.previewImgur : true,
                    previewCatbox: data.previewCatbox !== undefined ? data.previewCatbox : true,
                    previewGyazo: data.previewGyazo !== undefined ? data.previewGyazo : true,
                    previewGiphy: data.previewGiphy !== undefined ? data.previewGiphy : true,
                    previewTenor: data.previewTenor !== undefined ? data.previewTenor : true,
                    previewAllThumbnails: data.previewAllThumbnails !== undefined ? data.previewAllThumbnails : false,
                };
            } catch (e) {
                api.Logger.error("Failed to parse config.json, using defaults:", e);
            }
        }
        loadConfig();

        // 1. Helper to determine if a URL is a direct image or a supported image host
        function isImageUrlOrHost(urlStr) {
            if (pluginConfig.previewAllThumbnails) {
                return true;
            }
            try {
                const url = new URL(urlStr);
                const hostname = url.hostname.toLowerCase();
                const pathname = url.pathname.toLowerCase();

                // Direct image extensions
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.tiff'];
                if (imageExtensions.some(ext => pathname.endsWith(ext))) {
                    return true;
                }

                // Supported hosts matching config keys
                if (pluginConfig.previewImgur && (hostname === 'imgur.com' || hostname.endsWith('.imgur.com'))) {
                    return true;
                }
                if (pluginConfig.previewCatbox && (hostname === 'catbox.moe' || hostname.endsWith('.catbox.moe'))) {
                    return true;
                }
                if (pluginConfig.previewGyazo && (hostname === 'gyazo.com' || hostname.endsWith('.gyazo.com'))) {
                    return true;
                }
                if (pluginConfig.previewGiphy && (hostname === 'giphy.com' || hostname.endsWith('.giphy.com'))) {
                    return true;
                }
                if (pluginConfig.previewTenor && (hostname === 'tenor.com' || hostname.endsWith('.tenor.com'))) {
                    return true;
                }
            } catch (e) {}
            return false;
        }

        // 2. Monkey-patch Client.prototype.emit to filter/transform previews
        try {
            const Client = require(path.join(theloungeDir, 'dist/server/client')).default;
            const configModule = require(path.join(theloungeDir, 'dist/server/config'));
            const originalEmit = Client.prototype.emit;

            Client.prototype.emit = function(event, data) {
                if (event === "msg:preview" && pluginConfig.enabled) {
                    const preview = data.preview;
                    const isImage = preview.type === "image";
                    const isVideo = preview.type === "video";
                    const isAudio = preview.type === "audio";

                    if (isImage || isVideo || isAudio) {
                        // Keep direct image/media previews
                    } else if (preview.type === "link" && preview.thumb) {
                        const isHostSupported = isImageUrlOrHost(preview.link);
                        if (isHostSupported || pluginConfig.previewAllThumbnails) {
                            // Transform link preview with thumbnail to full image preview
                            preview.type = "image";
                            preview.media = preview.thumb;
                        } else {
                            // If global prefetch is disabled and we don't support the host, discard the preview
                            if (!configModule.default.values.prefetch) {
                                return;
                            }
                        }
                    } else {
                        // For other types (like standard link with no thumbnail, or error),
                        // discard if global prefetch is disabled
                        if (!configModule.default.values.prefetch) {
                            return;
                        }
                    }
                }
                return originalEmit.apply(this, arguments);
            };
        } catch (e) {
            api.Logger.error("Failed to patch Client.prototype.emit:", e);
        }

        // 2.5 Monkey-patch Chan.prototype.pushMessage to de-duplicate self-PMs
        try {
            const Chan = require(path.join(theloungeDir, 'dist/server/models/chan')).default;
            const originalPushMessage = Chan.prototype.pushMessage;

            Chan.prototype.pushMessage = function(client, msg, increasesUnread) {
                // If this is a QUERY channel, check for duplicate msgid to prevent double rendering/saving
                if (this.type === "query" && 
                    msg && 
                    msg.msgid && 
                    this.messages.some(m => m.msgid === msg.msgid)) {
                    // Duplicate message, discard it
                    return;
                }
                return originalPushMessage.apply(this, arguments);
            };
        } catch (e) {
            api.Logger.error("Failed to patch Chan.prototype.pushMessage:", e);
        }

        // 3. Monkey-patch the link module default export to intercept messages and trigger prefetch for images
        try {
            const linkModule = require(path.join(theloungeDir, 'dist/server/plugins/irc-events/link'));
            const configModule = require(path.join(theloungeDir, 'dist/server/config'));
            const linkify = require(path.join(theloungeDir, 'dist/shared/linkify'));
            
            const originalLinkDefault = linkModule.default;

            linkModule.default = function(client, chan, msg, cleanText) {
                // If global prefetch is enabled, let the original logic run normally
                if (configModule.default.values.prefetch) {
                    return originalLinkDefault.apply(this, arguments);
                }

                // If global prefetch is disabled but plugin is enabled, filter text to image links only
                if (pluginConfig.enabled) {
                    const links = linkify.findLinksWithSchema(cleanText);
                    const matchedLinks = links.filter(link => isImageUrlOrHost(link.link));

                    if (matchedLinks.length > 0) {
                        // Reconstruct message with only matching image links to avoid prefetching non-image links
                        const filteredText = matchedLinks.map(link => link.link).join(' ');

                        // Temporarily enable prefetch and override limits for originalDefault execution
                        const originalPrefetch = configModule.default.values.prefetch;
                        const originalMaxImageSize = configModule.default.values.prefetchMaxImageSize;
                        
                        configModule.default.values.prefetch = true;
                        if (pluginConfig.maxImageSize) {
                            configModule.default.values.prefetchMaxImageSize = pluginConfig.maxImageSize;
                        }

                        try {
                            return originalLinkDefault.call(this, client, chan, msg, filteredText);
                        } finally {
                            configModule.default.values.prefetch = originalPrefetch;
                            configModule.default.values.prefetchMaxImageSize = originalMaxImageSize;
                        }
                    }
                }
            };
        } catch (e) {
            api.Logger.error("Failed to patch link module default export:", e);
        }

        // 4. Register command to control settings via the client
        api.Commands.add("imagepreview", {
            input: function(client, context, cmd, args) {
                const sub = args[0] ? args[0].toLowerCase() : "";
                if (sub === "toggle") {
                    pluginConfig.enabled = !pluginConfig.enabled;
                    try {
                        fs.writeFileSync(configPath, JSON.stringify(pluginConfig, null, 2), 'utf8');
                        client.sendMessage(`[Image Preview] Plugin has been ${pluginConfig.enabled ? "enabled" : "disabled"}.`, context.chan);
                    } catch (e) {
                        client.sendMessage(`[Image Preview] Error updating config: ${e.message}`, context.chan);
                    }
                } else if (sub === "status") {
                    client.sendMessage(`[Image Preview] Plugin is ${pluginConfig.enabled ? "enabled" : "disabled"}. Max Image Size: ${pluginConfig.maxImageSize} KB. Supported sites check is active.`, context.chan);
                } else if (sub === "size" && args[1]) {
                    const newSize = parseInt(args[1], 10);
                    if (!isNaN(newSize) && newSize > 0) {
                        pluginConfig.maxImageSize = newSize;
                        try {
                            fs.writeFileSync(configPath, JSON.stringify(pluginConfig, null, 2), 'utf8');
                            client.sendMessage(`[Image Preview] Maximum image size set to ${newSize} KB.`, context.chan);
                        } catch (e) {
                            client.sendMessage(`[Image Preview] Error updating config: ${e.message}`, context.chan);
                        }
                    } else {
                        client.sendMessage(`[Image Preview] Invalid size argument. Usage: /imagepreview size <size_in_kb>`, context.chan);
                    }
                } else {
                    client.sendMessage(`[Image Preview] Usage: /imagepreview [toggle|status|size <kb>]`, context.chan);
                }
            }
        });

        api.Logger.info("Image Preview plugin successfully initialized.");
    }
};
