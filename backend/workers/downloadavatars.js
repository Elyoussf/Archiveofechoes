const https = require("https");
const stream = require("stream");
const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function downloadAvatar(username) {
  const cleanUsername = username.replace(/^@/, "");
  const url = `https://unavatar.io/x/${cleanUsername}`;

  https
    .get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error(
          `Failed to download avatar for ${cleanUsername}. Status: ${res.statusCode}`,
        );
        return;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { public_id: `avatars/${cleanUsername}`, overwrite: true },
        (error, result) => {
          if (error) {
            console.error(
              `Cloudinary upload error for @${cleanUsername}:`,
              error,
            );
          } else {
            console.log(
              `Uploaded avatar for @${cleanUsername} to Cloudinary:`,
              result.secure_url,
            );
          }
        },
      );

      res.pipe(uploadStream);
    })
    .on("error", (err) => {
      console.error(`Error downloading avatar: ${err.message}`);
    });
}

module.exports = { downloadAvatar };
