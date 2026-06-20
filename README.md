# The Lounge Image Preview Plugin

`thelounge-plugin-image-preview` is a plugin for **[The Lounge](https://thelounge.chat/)** IRC client that automatically detects and inlines image and media previews from links. It overrides default prefetch limits, supports popular image hosting sites, and works even when the global `prefetch` setting is disabled.

---

## Features

- **Direct Image Previews**: Automatically detects direct URLs (e.g. `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.svg`) and renders them inline.
- **Image Host Support**: Supports major image hosts like Imgur, Catbox, Gyazo, Giphy, and Tenor.
- **Custom Prefetch Bypass**: Operates independently of the server's global `prefetch: false` configuration to only prefetch images, protecting privacy and saving bandwidth.
- **Configurable Settings**: Define a custom maximum image size limit and selectively toggle image hosts.
- **Premium Styling**: Glassmorphic borders, nice rounding, and subtle hover transition effects.

---

## Installation

Depending on how you run The Lounge, choose one of the installation methods below:

### Method 1: standard/local installation (CLI)

If you run The Lounge directly on your host machine, install it via the official CLI command:

```bash
thelounge install thelounge-plugin-image-preview
```

Alternatively, you can install it using `npm` inside your Lounge packages folder (usually `~/.thelounge`):

```bash
cd ~/.thelounge/packages
npm install thelounge-plugin-image-preview
```

Then restart The Lounge server.

---

### Method 2: using Docker (thelounge/thelounge container)

If you run The Lounge in a Docker container, install it using one of the options below:

#### Option A: install via container CLI (recommended)
Execute the installation command directly inside your running container:

```bash
docker exec -it thelounge thelounge install thelounge-plugin-image-preview
```

Once installed, restart your container to load the plugin:

```bash
docker restart thelounge
```

#### Option B: manual host installation (mounted volumes)
If you have mounted The Lounge's configuration directory to a host path (e.g., `/home/user/.thelounge` or `/var/opt/thelounge`):

1. Navigate to the `packages` directory on your host:
   ```bash
   cd ~/.thelounge/packages
   ```
2. Manually add the dependency to `package.json` under `dependencies`:
   ```json
   "dependencies": {
     "thelounge-plugin-image-preview": "^1.0.0"
   }
   ```
3. Run npm install from your host (using Node.js matching the container's version) or simply restart the container—The Lounge's entrypoint will automatically install any missing dependencies listed in your `package.json`.

---

## Commands

Control settings dynamically from any chat query:

- `/imagepreview status` — Show current plugin status and limits.
- `/imagepreview toggle` — Toggle the plugin on or off.
- `/imagepreview size <kb>` — Update the maximum allowed preview image size in kilobytes.

---

## Configuration

Custom configuration options can be adjusted in your persistent storage directory:

`~/.thelounge/packages/thelounge-plugin-image-preview/config.json`

```json
{
  "enabled": true,
  "maxImageSize": 2048,
  "previewImgur": true,
  "previewCatbox": true,
  "previewGyazo": true,
  "previewGiphy": true,
  "previewTenor": true,
  "previewAllThumbnails": false
}
```

---

## Privacy & Security

This plugin respects The Lounge's standard `prefetchStorage` security settings:

* **With `prefetchStorage: true` (recommended for privacy)**: All image previews are fetched and stored/proxied by your Lounge server. Your browser loads the image directly from your own Lounge server, hiding your client IP address and user-agent from third-party sites.
* **With `prefetchStorage: false` (default)**: The Lounge fetches initial metadata on the server, but the actual image is rendered via direct link inside your browser. This exposes your client IP address and user-agent to the third-party image host (e.g. Imgur, Google) when loading the preview.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
