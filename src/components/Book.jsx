import { useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
  CanvasTexture,
} from "three";

import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom } from "./UI";
import { usePageData, createCustomPageTexture } from "./CustomPageContent";

const easingFactor = 0.5; // Controls the speed of the easing
const easingFactorFold = 0.3; // Controls the speed of the easing
const insideCurveStrength = 0.18; // Controls the strength of the curve
const outsideCurveStrength = 0.05; // Controls the strength of the curve
const turningCurveStrength = 0.09; // Controls the strength of the curve

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; // 4:3 aspect ratio
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;
const TEXTURE_SIZE = 1024; // Define texture size as a constant

// Define page geometry
const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2,
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
  // ALL VERTICES
  vertex.fromBufferAttribute(position, i); // get the vertex
  const x = vertex.x; // get the x position of the vertex

  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)); // calculate the skin index
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH; // calculate the skin weight

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0); // set the skin indexes
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0); // set the skin weights
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4),
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4),
);

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

// Base materials (without textures)
const pageMaterials = [
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: "#111",
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
];

// Simple fallback texture for loading state
const createFallbackTexture = (pageNumber) => {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");

  // Simple gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, TEXTURE_SIZE);
  gradient.addColorStop(0, "#333");
  gradient.addColorStop(1, "#111");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // Loading text
  ctx.fillStyle = "#00ff41";
  ctx.font = "bold 60px Courier New";
  ctx.textAlign = "center";
  ctx.fillText("Loading...", TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  ctx.font = "40px Courier New";
  ctx.fillText(`Page ${pageNumber}`, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 80);

  return new CanvasTexture(canvas);
};

const Page = ({
  number, // Physical position in book (for 3D)
  pageNumber, // Logical page number (for textures)
  nextPageNumber, // Next page number for back texture
  page,
  opened,
  bookClosed,
  onRequestTexture,
  frontTexture,
  backTexture,
  type, // 'cover', 'content', or 'backCover'
  ...props
}) => {
  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);
  const skinnedMeshRef = useRef();
  const [_, setPage] = useAtom(pageAtom);
  const [highlighted, setHighlighted] = useState(false);

  // Request textures when mounted
  useEffect(() => {
    if (onRequestTexture) {
      // Request front texture
      if (!frontTexture) {
        onRequestTexture(pageNumber);
      }

      // Request back texture if a next page is specified
      if (
        !backTexture &&
        nextPageNumber !== null &&
        nextPageNumber !== undefined
      ) {
        onRequestTexture(nextPageNumber);
      }
    }
  }, [pageNumber, nextPageNumber, onRequestTexture, frontTexture, backTexture]);

  // Create skinned mesh with textures or fallback textures
  const manualSkinnedMesh = useMemo(() => {
    // Use real textures or fallbacks

    const currentFrontTexture =
      frontTexture || createFallbackTexture(pageNumber);

    // For the back texture, handle special cases
    let currentBackTexture;

    if (nextPageNumber === null || nextPageNumber === undefined) {
      // If no next page is specified, use a blank texture
      currentBackTexture = createFallbackTexture("empty");
    } else {
      // Otherwise use the provided texture or a fallback

      currentBackTexture = backTexture || createFallbackTexture(nextPageNumber);
    }

    // Create bones for the page
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone); // attach the new bone to the previous bone
      }
    }
    const skeleton = new Skeleton(bones);

    // Create materials with the appropriate textures
    const materials = [
      ...pageMaterials,
      new MeshStandardMaterial({
        color: whiteColor,
        map: currentFrontTexture,
        roughness: 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshStandardMaterial({
        color: whiteColor,
        map: currentBackTexture,
        roughness: 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ];
    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [frontTexture, backTexture, pageNumber, nextPageNumber]);

  // Update textures when they change
  useEffect(() => {
    if (skinnedMeshRef.current) {
      // Update front texture if it changes
      if (
        frontTexture &&
        skinnedMeshRef.current.material[4].map !== frontTexture
      ) {
        skinnedMeshRef.current.material[4].map = frontTexture;
        skinnedMeshRef.current.material[4].needsUpdate = true;
      }

      if (
        backTexture &&
        skinnedMeshRef.current.material[5].map !== backTexture
      ) {
        skinnedMeshRef.current.material[5].map = backTexture;
        skinnedMeshRef.current.material[5].needsUpdate = true;
      }
    }
  }, [frontTexture, backTexture]);

  useCursor(highlighted);

  // Animation logic
  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return;
    }

    const emissiveIntensity = highlighted ? 0.22 : 0;
    skinnedMeshRef.current.material[4].emissiveIntensity =
      skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        skinnedMeshRef.current.material[4].emissiveIntensity,
        emissiveIntensity,
        0.1,
      );

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    if (!skinnedMeshRef.current.skeleton) return;

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];
      if (!target) continue;

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation;
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }
      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        easingFactor,
        delta,
      );

      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        easingFactorFold,
        delta,
      );
    }
  });

  return (
    <group
      {...props}
      ref={group}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHighlighted(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHighlighted(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setPage(opened ? pageNumber : pageNumber + 1);
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
      />
    </group>
  );
};

// Main Book component
export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);
  const { pages, PAGE_CONTENTS, isLoaded } = usePageData();
  const [textures, setTextures] = useState({});
  const [loadingTextures, setLoadingTextures] = useState({});

  // Calculate back cover index - this is the total number of pages
  const backCoverIndex = useMemo(() => {
    if (!isLoaded || !PAGE_CONTENTS || !Array.isArray(PAGE_CONTENTS)) {
      return 1;
    }
    // The back cover index is the total count of content pages + 1 for the front cover
    return PAGE_CONTENTS.length + 1;
  }, [isLoaded, PAGE_CONTENTS]);

  // Debug logging
  useEffect(() => {
    console.log("Book state:", {
      currentPage: page,
      delayedPage,
      contentPagesCount: PAGE_CONTENTS?.length,
      backCoverIndex,
      loadedTextureKeys: Object.keys(textures),
    });
  }, [page, delayedPage, PAGE_CONTENTS, backCoverIndex, textures]);

  // Handle smooth page transitions
  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) {
          return delayedPage;
        } else {
          timeout = setTimeout(
            () => {
              goToPage();
            },
            Math.abs(page - delayedPage) > 2 ? 50 : 150,
          );
          if (page > delayedPage) {
            return delayedPage + 1;
          }
          if (page < delayedPage) {
            return delayedPage - 1;
          }
        }
      });
    };
    goToPage();
    return () => {
      clearTimeout(timeout);
    };
  }, [page]);

  // Function to load a specific texture
  const loadTexture = async (pageNumber) => {
    // Skip if already loading or loaded
    if (textures[pageNumber] || loadingTextures[pageNumber]) return;

    // Mark as loading
    setLoadingTextures((prev) => ({ ...prev, [pageNumber]: true }));

    try {
      console.log(`Loading texture for page ${pageNumber}`);

      let texturePageNumber;

      // Map UI page number to texture page number
      if (pageNumber === 0) {
        texturePageNumber = 0; // Cover
      } else if (pageNumber === backCoverIndex) {
        texturePageNumber = "back"; // Back cover
      } else {
        texturePageNumber = pageNumber; // Content pages
      }

      // Create the canvas texture
      const canvas = await createCustomPageTexture(
        texturePageNumber,
        TEXTURE_SIZE,
      );

      // Convert to Three.js texture
      const texture = new CanvasTexture(canvas);
      texture.minFilter = MathUtils.LinearFilter;

      console.log(
        `Successfully created texture for page ${pageNumber} (texture: ${texturePageNumber})`,
      );

      // Store in state
      setTextures((prev) => {
        const updated = { ...prev, [pageNumber]: texture };
        console.log("Updated textures:", Object.keys(updated));
        return updated;
      });
    } catch (error) {
      console.error(`Error loading texture for page ${pageNumber}:`, error);
    } finally {
      // Mark as no longer loading
      setLoadingTextures((prev) => {
        const newState = { ...prev };
        delete newState[pageNumber];
        return newState;
      });
    }
  };

  // Start loading textures for visible pages
  useEffect(() => {
    if (!isLoaded || !Array.isArray(PAGE_CONTENTS)) return;

    // Load textures for current page and nearby pages
    const pagesToLoad = [
      0, // Cover
      backCoverIndex, // Back cover
      delayedPage, // Current page
      Math.max(0, delayedPage - 1), // Previous page
      Math.min(backCoverIndex, delayedPage + 1), // Next page
    ];

    // Filter out duplicates
    const uniquePages = [...new Set(pagesToLoad)];

    console.log("Loading textures for pages:", uniquePages);

    // Load each page
    uniquePages.forEach((pageNum) => {
      loadTexture(pageNum);
    });
  }, [delayedPage, isLoaded, PAGE_CONTENTS, backCoverIndex]);

  // Show loading state while pages are loading
  if (!isLoaded || !Array.isArray(PAGE_CONTENTS)) {
    return null; // Let UI component show loading state
  }

  // Create the book pages array - fixed approach with correct indices
  const createBookPages = () => {
    const bookPages = [];

    // Calculate the total number of physical pages (cover + content + back cover)
    const totalPhysicalPages = PAGE_CONTENTS.length + 2; // +2 for cover and back cover

    // 1. Create the cover page (always index 0)
    bookPages.push(
      <Page
        key="cover-page"
        number={0} // Physical position in book
        pageNumber={0} // Cover is page 0
        nextPageNumber={1} // First content page will be on back
        page={delayedPage}
        opened={delayedPage > 0}
        bookClosed={delayedPage === 0 || delayedPage === backCoverIndex}
        onRequestTexture={loadTexture}
        frontTexture={textures[0]} // Cover texture
        backTexture={textures[1]} // First content page texture
        type="cover"
      />,
    );

    // 2. Create content pages (indices 1 to N)
    for (let i = 0; i < PAGE_CONTENTS.length; i++) {
      const pageIndex = i + 1; // 1-based index for content pages (1, 2, 3, ...)
      const physicalIndex = i + 1; // Physical position in book (follows pageIndex)

      // Determine what should be on the back of this page
      let nextPageIndex;
      if (i === PAGE_CONTENTS.length - 1) {
        // Last content page - back is the back cover
        nextPageIndex = backCoverIndex;
      } else {
        // Regular content page - back is the next content page
        nextPageIndex = pageIndex + 1;
      }

      bookPages.push(
        <Page
          key={`content-page-${pageIndex}`}
          number={physicalIndex} // Physical position
          pageNumber={pageIndex} // Logical page number for front texture
          nextPageNumber={nextPageIndex} // Logical page number for back texture
          page={delayedPage}
          opened={delayedPage > pageIndex}
          bookClosed={delayedPage === 0 || delayedPage === backCoverIndex}
          onRequestTexture={loadTexture}
          frontTexture={textures[pageIndex]} // Front texture for this page
          backTexture={textures[nextPageIndex]} // Back texture (next page or back cover)
          type="content"
        />,
      );
    }

    return bookPages;
  };

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {createBookPages()}
    </group>
  );
};
