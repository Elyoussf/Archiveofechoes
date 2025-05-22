import { useEffect, useState } from "react";

// Create a promise-based approach to fetch and initialize page data
let pagesPromise;
let pageDataCache = { pages: [], PAGE_CONTENTS: [], isLoaded: false };

// Initialize the data fetching
function initializePages() {
  if (!pagesPromise) {
    pagesPromise = fetchPageData();
  }
  return pagesPromise;
}

// Fetch the page data and return a promise
async function fetchPageData() {
  try {
    const response = await fetch(
      "https://goldfish-app-bb4s2.ondigitalocean.app/names",
    );
    if (!response.ok) {
      throw new Error("Failed to fetch page contents");
    }

    const PAGE_CONTENTS = await response.json();
    console.log("page_contents: ", PAGE_CONTENTS);

    // Create pages array only after data is loaded
    const pages = Array(PAGE_CONTENTS.length)
      .fill(null)
      .map((_, i) => ({
        pageNumber: i,
      }));

    // Store in cache
    pageDataCache = {
      pages,
      PAGE_CONTENTS,
      isLoaded: true,
    };

    // Return both the pages array and the page contents
    return pageDataCache;
  } catch (error) {
    console.error("Error fetching page data:", error);
    // Set error state in cache
    pageDataCache = { pages: [], PAGE_CONTENTS: [], isLoaded: true, error };
    // Return empty arrays in case of error
    return pageDataCache;
  }
}

// Export a function to get pages that ensures data is loaded
export async function getPages() {
  const { pages } = await initializePages();
  return pages;
}

export async function createCustomPageTexture(pageNumber, size = 1024) {
  // Ensure page data is loaded before creating the texture
  if (!pageDataCache.isLoaded) {
    await initializePages();
  }

  const PAGE_CONTENTS = pageDataCache.PAGE_CONTENTS;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (pageNumber === 0) {
    // Cover page
    drawCoverPage(ctx, size, PAGE_CONTENTS.length);
  } else if (pageNumber === "back") {
    // Back cover
    drawBackCoverPage(ctx, size);
  } else if (pageNumber > 0 && pageNumber <= PAGE_CONTENTS.length) {
    // Content pages - ensure we use the correct array index
    // pageNumber starts from 1, but array index starts from 0
    const contentIndex = pageNumber - 1;
    const pageContent = PAGE_CONTENTS[contentIndex];
    await drawContentPage(ctx, size, pageNumber, pageContent);
  } else {
    // Default page if outside the defined content
    drawDefaultPage(ctx, size, pageNumber);
  }

  return canvas;
}
async function drawContentPage(
  ctx,
  size,
  pageNumber,
  pageContent,
  animationProgress = 1,
) {
  try {
    // Set default animation progress to 1 if not provided (shows everything)
    animationProgress = animationProgress || 1;

    // Check if we have valid page content
    if (!pageContent) {
      console.warn(`No page content for page ${pageNumber}, using default`);
      drawDefaultPage(ctx, size, pageNumber);
      return;
    }

    // Log the page content to help debug
    console.log(`Drawing page ${pageNumber} with content:`, pageContent);

    const { title, briefstory, profile, backlinks } = pageContent;

    // Terminal-like colors
    const terminalBg = "#0C0C0C"; // Near black background
    const terminalText = "#00FF41"; // Bright green text (classic terminal style)
    const terminalHeaderBg = "#1A1A1A"; // Slightly lighter header
    const terminalCursor = "#FFFFFF"; // White cursor

    // Background
    ctx.fillStyle = terminalBg;
    ctx.fillRect(0, 0, size, size);

    // Header background
    ctx.fillStyle = terminalHeaderBg;
    ctx.fillRect(0, 0, size, 200);

    // Add terminal details - scanlines effect
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < size; i += 4) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, i, size, 2);
    }
    ctx.globalAlpha = 1.0;

    // Add noise/static effect
    ctx.globalAlpha = 0.02;
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const pixelSize = Math.random() > 0.8 ? 2 : 1;
      ctx.fillStyle = Math.random() > 0.5 ? "#FFFFFF" : "#000000";
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
    ctx.globalAlpha = 1.0;

    // Terminal window border
    ctx.strokeStyle = terminalText;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, size - 20, size - 20);

    // Terminal header
    ctx.fillStyle = terminalHeaderBg;
    ctx.fillRect(10, 10, size - 20, 30);

    // Terminal controls (circles)
    let circleY = 25;

    // Close button
    ctx.beginPath();
    ctx.arc(30, circleY, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FF5F56";
    ctx.fill();

    // Minimize button
    ctx.beginPath();
    ctx.arc(55, circleY, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FFBD2E";
    ctx.fill();

    // Maximize button
    ctx.beginPath();
    ctx.arc(80, circleY, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#27C93F";
    ctx.fill();

    // Terminal title
    ctx.fillStyle = terminalText;
    ctx.font = "bold 18px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `user@archivechoes.com: ${title || "Unknown"}`,
      size / 2,
      circleY,
    );

    // Image dimensions and position
    const imageSize = 120;
    const imageX = 50;
    const imageY = 70;
    const circleX = imageX + imageSize / 2;
    circleY = imageY + imageSize / 2;
    const radius = imageSize / 2;

    // Fix image path if it doesn't start with http or /
    const fixedProfile = profile
      ? profile.startsWith("http") || profile.startsWith("/")
        ? profile
        : `/${profile}`
      : null;

    // Draw profile in a circle with terminal-style overlay
    if (fixedProfile) {
      // For URL images, we need to load them first
      const drawRest = () => {
        // After image loads (or fails), draw the rest of the content
        drawContentAfterImage();
      };

      // Use a promise to handle image loading
      const loadImage = () => {
        return new Promise((resolve, reject) => {
          const img = new Image();

          img.onload = () => {
            // Add glitch-like effect for profile image
            ctx.save();
            ctx.beginPath();
            ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
            ctx.clip();

            // Apply vintage terminal effect
            ctx.drawImage(img, imageX, imageY, imageSize, imageSize);

            // Add scanlines over the image
            ctx.globalAlpha = 0.2;
            for (let i = 0; i < imageSize; i += 2) {
              ctx.fillStyle = "#000000";
              ctx.fillRect(imageX, imageY + i, imageSize, 1);
            }
            ctx.globalAlpha = 1.0;

            // Add green tint
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = terminalText;
            ctx.fillRect(imageX, imageY, imageSize, imageSize);
            ctx.globalAlpha = 1.0;

            ctx.restore();

            // Draw glitch effect over the profile image
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 10; i++) {
              const glitchX = imageX + Math.random() * imageSize;
              const glitchHeight = 2 + Math.random() * 10;
              const glitchWidth = 20 + Math.random() * 60;
              ctx.fillStyle = terminalText;
              ctx.fillRect(
                glitchX,
                imageY + Math.random() * imageSize,
                glitchWidth,
                glitchHeight,
              );
            }
            ctx.globalAlpha = 1.0;

            // Draw circle border
            ctx.beginPath();
            ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = terminalText;
            ctx.lineWidth = 3;
            ctx.stroke();

            resolve();
          };

          img.onerror = (err) => {
            console.error(`Failed to load image: ${fixedProfile}`, err);

            // Draw a terminal-style placeholder
            ctx.save();
            ctx.beginPath();
            ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
            ctx.clip();

            // Draw placeholder background
            ctx.fillStyle = terminalHeaderBg;
            ctx.fillRect(imageX, imageY, imageSize, imageSize);

            // Draw error text
            ctx.fillStyle = terminalText;
            ctx.font = "16px Courier New";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("404_NOT_FOUND", circleX, circleY);
            ctx.restore();

            // Draw circle border
            ctx.beginPath();
            ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = terminalText;
            ctx.lineWidth = 3;
            ctx.stroke();

            reject(err);
          };

          // Set crossOrigin to anonymous for images from other domains
          if (fixedProfile.startsWith("http")) {
            img.crossOrigin = "anonymous";
          }

          // Start loading the image - log the URL for debugging
          console.log(`Loading image from: ${fixedProfile}`);
          img.src = fixedProfile;
        });
      };

      // Try to load the image, then draw the rest of the content
      try {
        await loadImage();
      } catch (err) {
        console.warn("Failed to load image, continuing with text content");
      }

      drawContentAfterImage();
    } else {
      // For emoji/text avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctx.clip();

      // Draw background for the profile
      ctx.fillStyle = terminalHeaderBg;
      ctx.fillRect(imageX, imageY, imageSize, imageSize);

      // Draw the text avatar
      ctx.fillStyle = terminalText;
      ctx.font = "80px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(profile || "?", circleX, circleY);

      // Add scanlines
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < imageSize; i += 2) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(imageX, imageY + i, imageSize, 1);
      }
      ctx.globalAlpha = 1.0;
      ctx.restore();

      // Draw circle border
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = terminalText;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw the rest of the content
      drawContentAfterImage();
    }

    // Function to draw the rest of the content after the image is handled
    function drawContentAfterImage() {
      // Title with path - terminal style
      ctx.fillStyle = terminalText;
      ctx.font = "bold 30px Courier New";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(
        `> ${title || "unknown"}`,
        imageX + imageSize + 30,
        imageY + 50,
      );

      // Add command line prefix and command text
      const commandText = "$ cat whome.txt";
      const commandY = 240;

      ctx.fillStyle = terminalText;
      ctx.font = "24px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(commandText, 50, commandY);

      // Main content area - display the story text
      const contentStartY = 280;
      const lineHeight = 36;

      // Determine what text to display for the story
      let storyText = briefstory;
      if (!storyText || storyText.trim() === "") {
        // Special message when no story exists
        const noStoryMessages = [
          "404: STORY NOT FOUND",
          "SUBJECT REQUIRES NO INTRODUCTION",
          "DATA CLASSIFIED: CLEARANCE LEVEL 5 REQUIRED",
          "PROFILE TOO LEGENDARY FOR TEXT DESCRIPTION",
          "DIGITAL FOOTPRINT DELIBERATELY MINIMIZED",
          "RECORDS REDACTED BY ADMINISTRATOR",
        ];

        // Pick a message based on page number for consistency
        const messageIndex = pageNumber % noStoryMessages.length;
        storyText = noStoryMessages[messageIndex];
      }

      // Draw content with text wrapping
      ctx.fillStyle = terminalText;
      ctx.font = "24px Courier New";

      // Simple text wrapping function
      const wrapText = (text, x, y, maxWidth, lineHeight) => {
        const words = text.split(" ");
        let line = "";
        let lineCount = 0;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;

          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y + lineCount * lineHeight);
            line = words[n] + " ";
            lineCount++;
          } else {
            line = testLine;
          }
        }

        ctx.fillText(line, x, y + lineCount * lineHeight);
        return lineCount + 1; // Return total lines including the last one
      };

      // Draw content with text wrapping
      const lineCount = wrapText(
        storyText,
        50,
        contentStartY,
        size - 100,
        lineHeight,
      );

      // Draw backlinks if they exist
      if (backlinks && backlinks.length > 0) {
        const backlinkY = contentStartY + lineCount * lineHeight + 20;

        // Command for backlinks
        ctx.fillStyle = terminalText;
        ctx.font = "24px Courier New";
        ctx.fillText("$ ls -la Backlinks", 50, backlinkY);

        // Draw each backlink
        for (let i = 0; i < backlinks.length; i++) {
          const link = backlinks[i].link;
          const linkY = backlinkY + 40 + i * 30;

          // Generate a terminal-style file listing
          const fileSize = Math.floor(Math.random() * 9999);
          const fileDay = Math.floor(Math.random() * 30) + 1;
          const fileMonth = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ][Math.floor(Math.random() * 12)];
          console.log("backlinks: ", backlinks);
          const linkLine = `-rw-r--r-- 1 user ${backlinks[i].label} ${fileSize} ${fileMonth} ${fileDay} ${link}`;

          ctx.fillStyle = terminalText;
          ctx.font = "20px Courier New";
          ctx.fillText(linkLine, 50, linkY);
        }
      } else {
        // If no backlinks, just show a command prompt
        const backlinkY = contentStartY + lineCount * lineHeight + 20;
        ctx.fillStyle = terminalText;
        ctx.font = "24px Courier New";
        ctx.fillText("$ _", 50, backlinkY);
      }

      // Add signature at the bottom
      ctx.fillStyle = terminalText;
      ctx.font = "italic 20px Courier New";
      ctx.textAlign = "right";
      ctx.fillText("archiveofechoes.com", size - 50, size - 50);
    }
  } catch (error) {
    console.error("Error in drawContentPage:", error);
    // Fallback to default page on error
    drawDefaultPage(ctx, size, pageNumber);
  }
}

// Helper functions for drawing different page types
function drawCoverPage(ctx, size, totalPages) {
  // Near black background with slight gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#0c0c0c");
  gradient.addColorStop(1, "#101820");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Green hacker style text color
  const hackerGreen = "#00ff41";

  // Add subtle scanline effect
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < size; i += 4) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, i, size, 2);
  }
  ctx.globalAlpha = 1.0;

  // Title
  ctx.fillStyle = hackerGreen;
  ctx.textAlign = "center";

  // Calculate appropriate font size based on canvas width
  const titleFontSize = Math.min(120, size * 0.15); // 15% of canvas width
  const subtitleFontSize = Math.min(60, size * 0.075); // 7.5% of canvas width

  // Main title in monospace font for hacker aesthetic with adjusted size
  ctx.font = `bold ${titleFontSize}px Courier New`;
  ctx.fillText("Archive", size / 2, size / 2 - 150);
  ctx.fillText("Echoes", size / 2, size / 2 - 30);

  // Subtitle in smaller monospace with adjusted size
  ctx.font = `${subtitleFontSize}px Courier New`;

  // Break long subtitle into multiple lines if needed
  const subtitle = "Created by a builder for builders";

  // Check if subtitle is too wide
  if (ctx.measureText(subtitle).width > size * 0.9) {
    // Split into two lines
    ctx.fillText("Created by a builder", size / 2, size / 2 + 70);
    ctx.fillText("for builders", size / 2, size / 2 + 130);
  } else {
    ctx.fillText(subtitle, size / 2, size / 2 + 100);
  }

  // Total pages in hacker style with verified position
  const pageText = `<TOTAL_PAGES: ${totalPages || 0}>`;
  const pagesFontSize = Math.min(30, size * 0.04); // 4% of canvas width
  ctx.font = `${pagesFontSize}px Courier New`;
  ctx.fillText(pageText, size / 2, size - 100);

  // Random binary decorations (minimalist)
  ctx.font = "14px Courier New";
  ctx.fillStyle = hackerGreen;
  ctx.globalAlpha = 0.3;

  // Generate a few columns of binary, stay away from edges
  const margin = size * 0.1; // 10% margin on each side
  for (let col = 0; col < 5; col++) {
    const x = margin + (col * (size - 2 * margin)) / 5;
    for (let i = 0; i < 20; i++) {
      const y = 50 + i * 20;
      const bit = Math.random() > 0.5 ? "1" : "0";
      ctx.fillText(bit, x, y);
    }
  }

  // Add a few more binary columns at the bottom, respecting margins
  for (let col = 0; col < 5; col++) {
    const x = margin + (col * (size - 2 * margin)) / 5;
    for (let i = 0; i < 10; i++) {
      const y = size - 200 + i * 20;
      const bit = Math.random() > 0.5 ? "1" : "0";
      ctx.fillText(bit, x, y);
    }
  }

  ctx.globalAlpha = 1.0;

  // Blinking cursor effect
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = hackerGreen;
    ctx.fillRect(
      size / 2 + ctx.measureText(pageText).width / 2 + 10,
      size - 115,
      15,
      30,
    );
  }
}

function drawBackCoverPage(ctx, size) {
  // Near black background with slight gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#0c0c0c");
  gradient.addColorStop(1, "#101820");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Green hacker style text color
  const hackerGreen = "#00ff41";

  // Add subtle scanline effect
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < size; i += 4) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, i, size, 2);
  }
  ctx.globalAlpha = 1.0;

  // Content
  ctx.fillStyle = hackerGreen;
  ctx.textAlign = "center";

  // Calculate appropriate font sizes based on canvas width
  const titleFontSize = Math.min(80, size * 0.1); // 10% of canvas width
  const infoFontSize = Math.min(50, size * 0.06); // 6% of canvas width
  const footerFontSize = Math.min(36, size * 0.045); // 4.5% of canvas width

  // Thank you text in monospace font
  ctx.font = `bold ${titleFontSize}px Courier New`;
  ctx.fillText("Thank You", size / 2, size / 2 - 100);

  // Additional info
  ctx.font = `${infoFontSize}px Courier New`;
  const infoText = "New stuff are coming";
  ctx.fillText(infoText, size / 2, size / 2 + 20);

  // Footer in monospace
  ctx.font = `${footerFontSize}px Courier New`;
  const footerText = "© 2025 - Built with Love of being in the community";
  // Check if footer text needs to be split
  if (ctx.measureText(footerText).width > size * 0.9) {
    ctx.fillText("© 2025", size / 2, size - 140);
    ctx.fillText(
      "Built with Love of being in the community",
      size / 2,
      size - 100,
    );
  } else {
    ctx.fillText(footerText, size / 2, size - 100);
  }

  // Draw a terminal-style decoration instead of circles
  const centerX = size / 2;
  const centerY = size / 2 + 150;
  const hexSize = Math.min(80, size * 0.1);

  // Draw terminal command-style decoration
  ctx.strokeStyle = hackerGreen;
  ctx.lineWidth = 2;

  // Draw a hexagon
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + hexSize * Math.cos(angle);
    const y = centerY + hexSize * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Inner hexagon
  ctx.beginPath();
  const innerSize = hexSize * 0.7;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + innerSize * Math.cos(angle);
    const y = centerY + innerSize * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Draw a binary symbol inside instead of star
  ctx.font = `${Math.min(70, size * 0.09)}px Courier New`;
  ctx.fillText("01", centerX, centerY + 10);

  // Add some minimal binary decorations
  ctx.font = "14px Courier New";
  ctx.globalAlpha = 0.3;

  // Binary columns on left side
  const margin = size * 0.1;
  for (let i = 0; i < 20; i++) {
    const y = margin + i * 20;
    const bit = Math.random() > 0.5 ? "1" : "0";
    ctx.fillText(bit, margin, y);
  }

  // Binary columns on right side
  for (let i = 0; i < 20; i++) {
    const y = margin + i * 20;
    const bit = Math.random() > 0.5 ? "1" : "0";
    ctx.fillText(bit, size - margin, y);
  }

  // System status text
  ctx.globalAlpha = 1.0;
  ctx.font = `${Math.min(16, size * 0.02)}px Courier New`;
  ctx.fillText("<SYSTEM STATUS: ONLINE>", size / 2, size - 50);

  // Add blinking cursor
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = hackerGreen;
    ctx.fillRect(size / 2 + 110, size - 60, 10, 20);
  }
}

function drawDefaultPage(ctx, size, pageNumber) {
  // Create a color based on page number
  const hue = (pageNumber * 40) % 360;
  const pageColor = `hsl(${hue}, 70%, 40%)`;
  const bgColor = `hsl(${hue}, 30%, 95%)`;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Header
  ctx.fillStyle = pageColor;
  ctx.font = "bold 100px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Page ${pageNumber}`, size / 2, 200);

  // Content
  ctx.font = "50px Arial";
  ctx.fillText("Custom Page Content", size / 2, size / 2 - 50);
  ctx.fillText("React Three Fiber", size / 2, size / 2 + 50);

  // Draw a box
  const boxWidth = 500;
  const boxHeight = 150;
  ctx.fillStyle = pageColor;
  ctx.fillRect(size / 2 - boxWidth / 2, size / 2 + 150, boxWidth, boxHeight);

  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.fillText(
    `Custom content for page ${pageNumber}`,
    size / 2,
    size / 2 + 225,
  );
}

// Fixed usePageData hook that works with React's rules of hooks
export function usePageData() {
  const [data, setData] = useState(() => ({
    ...pageDataCache,
    isLoaded: pageDataCache.isLoaded,
  }));

  useEffect(() => {
    if (!data.isLoaded) {
      // Only start a new fetch if not already loaded
      const fetchData = async () => {
        try {
          await initializePages();
          setData({
            pages: pageDataCache.pages,
            PAGE_CONTENTS: pageDataCache.PAGE_CONTENTS,
            isLoaded: true,
          });
        } catch (error) {
          console.error("Error in usePageData:", error);
          setData({
            pages: [],
            PAGE_CONTENTS: [],
            isLoaded: true,
            error,
          });
        }
      };

      fetchData();
    }
  }, [data.isLoaded]);

  return data;
}

// Initialize the pages data immediately
initializePages();

export default createCustomPageTexture;
