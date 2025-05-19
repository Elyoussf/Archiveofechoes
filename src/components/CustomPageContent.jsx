import React from 'react';

// Custom page content definition
const PAGE_CONTENTS = [
  // Page 1
  {
    title: "Introduction",
    content: "This interactive book demonstrates the power of React Three Fiber and Three.js for creating digital experiences.",
    color: "#000",
    bgColor: "#f0f5ff",
    image: "📚"
  },
  // Page 2
  {
    title: "Chapter 1: The Basics",
    content: "Learn the fundamentals of 3D rendering and animation with React Three Fiber.",
    color: "#000",
    bgColor: "#fff0f0",
    image: "🧩"
  },
  // Page 3
  {
    title: "Chapter 2: Advanced Techniques",
    content: "Explore advanced techniques for creating interactive 3D experiences with React.",
    color: "#000",
    bgColor: "#f0fff0",
    image: "⚙️"
  },
  // Page 4
  {
    title: "Chapter 3: Performance",
    content: "Optimize your 3D applications for maximum performance across devices.",
    color: "#000",
    bgColor: "#fff8f0",
    image: "🚀"
  },
  // Page 5
  {
    title: "Chapter 4: Physics",
    content: "Add realistic physics to your 3D scenes for more immersive experiences.",
    color: "#000",
    bgColor: "#f8f0ff",
    image: "🔮"
  },
  // Page 6
  {
    title: "Chapter 5: Animation",
    content: "Create fluid animations and transitions in your 3D React applications.",
    color: "#000",
    bgColor: "#f0ffff",
    image: "💫"
  },
  // Page 7
  {
    title: "Resources",
    content: "Find additional resources, libraries, and tutorials to continue your 3D journey.",
    color: "#000",
    bgColor: "#fff",
    image: "📝"
  },
];

// Function to create custom page texture
export function createCustomPageTexture(pageNumber, size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (pageNumber === 0) {
    // Cover page
    drawCoverPage(ctx, size);
  } else if (pageNumber === 'back') {
    // Back cover
    drawBackCoverPage(ctx, size);
  } else if (pageNumber > 0 && pageNumber <= PAGE_CONTENTS.length) {
    // Content pages
    const pageContent = PAGE_CONTENTS[pageNumber - 1];
    drawContentPage(ctx, size, pageNumber, pageContent);
  } else {
    // Default page if outside the defined content
    drawDefaultPage(ctx, size, pageNumber);
  }
  
  return canvas;
}

// Helper functions for drawing different page types
function drawCoverPage(ctx, size) {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#2c3e50');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Title
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  
  // Main title
  ctx.font = 'bold 120px Arial';
  ctx.fillText('Interactive', size/2, size/2 - 150);
  ctx.fillText('Book', size/2, size/2 - 30);
  
  // Subtitle
  ctx.font = '60px Arial';
  ctx.fillText('Created with React Three Fiber', size/2, size/2 + 100);
  
  // Decorative elements
  drawDecorations(ctx, size);
}

function drawBackCoverPage(ctx, size) {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#2c3e50');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Content
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  
  // Thank you text
  ctx.font = 'bold 80px Arial';
  ctx.fillText('Thank You', size/2, size/2 - 100);
  
  // Additional info
  ctx.font = '50px Arial';
  ctx.fillText('Built with React Three Fiber', size/2, size/2 + 20);
  
  // Footer
  ctx.font = '36px Arial';
  ctx.fillText('© 2025 - Interactive Book Demo', size/2, size - 100);
  
  // Draw a circular decoration
  ctx.beginPath();
  ctx.arc(size/2, size/2 + 150, 80, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 5;
  ctx.stroke();
  
  // Inner circle
  ctx.beginPath();
  ctx.arc(size/2, size/2 + 150, 60, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw a star
  ctx.font = '70px Arial';
  ctx.fillText('★', size/2, size/2 + 170);
}

function drawContentPage(ctx, size, pageNumber, pageContent) {
  const { title, content, color, bgColor, image } = pageContent;
  console.log(pageContent)////////
  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  
  // Header background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, 200);
  
  // Page number in a circle
  ctx.beginPath();
  ctx.arc(size - 80, 80, 50, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  
  ctx.fillStyle = color;
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(pageNumber, size - 80, 100);
  
  // Title
  ctx.fillStyle = 'white';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(title, 50, 120);
  
  // Main content
  ctx.fillStyle = '#000';
  ctx.font = '40px Arial';
  
  // Wrap text function
  const wrapText = (text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let testLine = '';
    let lineCount = 0;
    
    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y + (lineCount * lineHeight));
        line = words[n] + ' ';
        lineCount++;
      } else {
        line = testLine;
      }
    }
    
    ctx.fillText(line, x, y + (lineCount * lineHeight));
    return lineCount;
  };
  
  // Draw content with text wrapping
  const lineCount = wrapText(content, 50, 300, size - 100, 60);
  
  // Draw image/emoji
  ctx.font = '200px Arial';
  ctx.fillText(image, size/2, 500 + lineCount * 60);
  
  // Footer box
  ctx.fillStyle = color;
  const footerHeight = 100;
  ctx.fillRect(0, size - footerHeight, size, footerHeight);
  
  // Footer text
  ctx.fillStyle = 'white';
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Interactive Book Demo', size/2, size - footerHeight/2 + 10);
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
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Page ${pageNumber}`, size/2, 200);
  
  // Content
  ctx.font = '50px Arial';
  ctx.fillText('Custom Page Content', size/2, size/2 - 50);
  ctx.fillText('React Three Fiber', size/2, size/2 + 50);
  
  // Draw a box
  const boxWidth = 500;
  const boxHeight = 150;
  ctx.fillStyle = pageColor;
  ctx.fillRect(size/2 - boxWidth/2, size/2 + 150, boxWidth, boxHeight);
  
  ctx.fillStyle = 'white';
  ctx.font = '40px Arial';
  ctx.fillText(`Custom content for page ${pageNumber}`, size/2, size/2 + 225);
}

function drawDecorations(ctx, size) {
  // Draw a decorative border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, size - 60, size - 60);
  
  // Draw corner decorations
  const cornerSize = 80;
  
  // Top left
  ctx.beginPath();
  ctx.moveTo(30, 30 + cornerSize);
  ctx.lineTo(30, 30);
  ctx.lineTo(30 + cornerSize, 30);
  ctx.stroke();
  
  // Top right
  ctx.beginPath();
  ctx.moveTo(size - 30 - cornerSize, 30);
  ctx.lineTo(size - 30, 30);
  ctx.lineTo(size - 30, 30 + cornerSize);
  ctx.stroke();
  
  // Bottom left
  ctx.beginPath();
  ctx.moveTo(30, size - 30 - cornerSize);
  ctx.lineTo(30, size - 30);
  ctx.lineTo(30 + cornerSize, size - 30);
  ctx.stroke();
  
  // Bottom right
  ctx.beginPath();
  ctx.moveTo(size - 30 - cornerSize, size - 30);
  ctx.lineTo(size - 30, size - 30);
  ctx.lineTo(size - 30, size - 30 - cornerSize);
  ctx.stroke();
  
  // Draw a circular decoration
  ctx.beginPath();
  ctx.arc(size/2, size/2 + 200, 80, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 5;
  ctx.stroke();
  
  // Draw a star
  ctx.fillStyle = 'white';
  ctx.font = '70px Arial';
  ctx.fillText('★', size/2, size/2 + 220);
}

export default createCustomPageTexture;