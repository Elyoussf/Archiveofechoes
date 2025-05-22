const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const { v2: cloudinary } = require("cloudinary");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { downloadAvatar } = require("./workers/downloadavatars");

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.SUPABASE });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(express.json());

// CREATE PAYMENT INTENT
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { username, catchphrase, links = [] } = req.body;

    console.log("Received links:", links);
    console.log("Type of received links:", typeof links);

    const cleanUsername = (username || "")
      .replace(/^@/, "")
      .toLowerCase()
      .trim();

    if (!cleanUsername || !catchphrase?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const validLinks = links.filter((l) => {
      try {
        const url = new URL(l.link);
        return !!url.hostname;
      } catch {
        return false;
      }
    });

    console.log("Valid links:", validLinks);
    console.log("About to stringify:", validLinks);

    const stringifiedLinks = JSON.stringify(validLinks);
    console.log("Stringified links:", stringifiedLinks);

    const exists = await pool.query(
      "SELECT 1 FROM profiles WHERE LOWER(username) = $1",
      [cleanUsername],
    );
    if (exists.rowCount > 0) {
      return res
        .status(409)
        .json({ success: false, message: "Username already exists" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 200,
      currency: "usd",
      metadata: { username: cleanUsername },
    });

    await pool.query(
      `INSERT INTO pending_profiles (id, clean_username, catchphrase, links)
       VALUES ($1, $2, $3, $4)`,
      [
        paymentIntent.id,
        cleanUsername,
        catchphrase,
        stringifiedLinks, // Store as string in TEXT column
      ],
    );

    console.log("Successfully stored in pending_profiles");

    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Create payment error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
// COMPLETE PROFILE
app.post("/complete-profile", async (req, res) => {
  const { paymentIntentId } = req.body;
  if (!paymentIntentId)
    return res.status(400).json({ success: false, message: "Missing ID" });

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!intent || intent.status !== "succeeded") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not completed" });
    }

    const { rows } = await pool.query(
      "SELECT * FROM pending_profiles WHERE id = $1",
      [paymentIntentId],
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Not found" });

    const profile = rows[0];

    try {
      await downloadAvatar(profile.clean_username);
    } catch (err) {
      console.error("Avatar download failed:", err);
    }

    // Since both tables use TEXT, we can pass the string directly
    await pool.query(
      `INSERT INTO profiles (username, catchphrase, links, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        profile.clean_username,
        profile.catchphrase,
        profile.links, // Pass the JSON string as-is
        profile.created_at || new Date().toISOString(),
      ],
    );

    await pool.query("DELETE FROM pending_profiles WHERE id = $1", [
      paymentIntentId,
    ]);

    res.json({
      success: true,
      message: "Profile saved",
      profile: {
        username: profile.clean_username,
        catchphrase: profile.catchphrase,
        links: JSON.parse(profile.links), // Parse for response
        createdAt: profile.created_at,
      },
    });
  } catch (err) {
    console.error("Complete profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// STATIC TEXTURES
app.use("/texture", express.static(path.join(__dirname, "../public/textures")));

// FETCH ALL PROFILES + AVATARS
app.get("/names", async (req, res) => {
  try {
    const { rows: profiles } = await pool.query("SELECT * FROM profiles");
    const profileMap = Object.fromEntries(
      profiles.map((p) => [p.username.toLowerCase(), p]),
    );

    const cloudRes = await cloudinary.api.resources({
      type: "upload",
      prefix: "avatars/",
      max_results: 100,
    });

    const fileInfo = cloudRes.resources
      .map((r) => {
        const username = r.public_id.replace("avatars/", "").toLowerCase();
        const profile = profileMap[username];
        if (!profile) return null;
        return {
          title: username,
          briefstory: profile.catchphrase,
          color: "#000",
          bgColor: "#000",
          backlinks: JSON.parse(profile.links || "[]"),
          profile: r.secure_url,
        };
      })
      .filter(Boolean);

    res.json(fileInfo);
  } catch (err) {
    console.error("Avatar fetch error:", err);
    res.status(500).json({ error: "Failed to fetch avatars" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
