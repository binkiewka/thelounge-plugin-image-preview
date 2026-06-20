# The Lounge Image Preview Plugin

`thelounge-plugin-image-preview` is a plugin for **[The Lounge](https://thelounge.chat/)** IRC client that automatically detects and inlines image and media previews from links. It overrides default prefetch limits, supports popular image hosting sites, and works even when the global `prefetch` setting is disabled.

## Features

- **Direct Image Previews**: Automatically detects direct URLs (e.g. `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.svg`) and renders them inline.
- **Image Host Support**: Supports major image hosts like Imgur, Catbox, Gyazo, Giphy, and Tenor.
- **Custom Prefetch Bypass**: Operates independently of the server's global `prefetch: false` configuration to only prefetch images, protecting privacy and saving bandwidth.
- **Configurable Settings**: Define a custom maximum image size limit and selectively toggle image hosts.
- **Premium Styling**: Glassmorphic borders, nice rounding, and subtle hover transition effects.

## Installation

Add the plugin to your `package.json` in The Lounge's configuration directory (usually `~/.thelounge/packages/package.json`):

```json
"dependencies": {
  "thelounge-plugin-image-preview": "^1.0.0"
}
```

Then run the installation command or restart The Lounge container.

## Commands

Control settings dynamically from any chat query:

- `/imagepreview status` - Show current plugin status and limits.
- `/imagepreview toggle` - Toggle the plugin on or off.
- `/imagepreview size <kb>` - Update the maximum allowed preview image size in kilobytes.

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

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
