import { atom, useAtom } from "jotai";
import { useEffect, useMemo, useState, useCallback } from "react";
import { usePageData } from "./CustomPageContent";

// Create atom for current page state (0 = cover, pages.length+1 = back cover)
export const pageAtom = atom(0);
// Create atom for form visibility
export const profileFormVisibleAtom = atom(false);

export const UI = () => {
  // Always initialize all hooks at the top level
  const { pages, PAGE_CONTENTS, isLoaded } = usePageData();
  const [page, setPage] = useAtom(pageAtom);
  const [profileFormVisible, setProfileFormVisible] = useAtom(
    profileFormVisibleAtom,
  );

  // Calculate back cover index - should be EXACTLY content pages + 1
  const backCoverIndex = useMemo(() => {
    if (!isLoaded || !Array.isArray(PAGE_CONTENTS)) {
      return 1; // Default value if no content
    }
    return PAGE_CONTENTS.length + 1;
  }, [isLoaded, PAGE_CONTENTS]);

  // Debug logging
  useEffect(() => {
    console.log("UI State:", {
      currentPage: page,
      contentPagesCount: PAGE_CONTENTS?.length,
      backCoverIndex: backCoverIndex,
      isLoaded,
      profileFormVisible,
    });
  }, [page, PAGE_CONTENTS, backCoverIndex, isLoaded, profileFormVisible]);

  // Page turning sound effect
  useEffect(() => {
    // Only play sound when page changes and not on initial render
    if (page !== 0) {
      try {
        const audio = new Audio("/audios/page-flip-01a.mp3");
        audio.play().catch((err) => console.error("Audio play failed:", err));
      } catch (error) {
        console.error("Audio error:", error);
      }
    }
  }, [page]);

  // Loading screen - shown while data is loading
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
          <p className="text-lg text-white">Loading archive...</p>
        </div>
      </div>
    );
  }

  // Safety check - if pages couldn't be loaded
  if (!Array.isArray(PAGE_CONTENTS)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="max-w-md rounded bg-black/80 p-6 text-center text-white">
          <h2 className="mb-4 text-xl font-bold text-red-500">
            Error Loading Pages
          </h2>
          <p>
            Could not load the archive pages. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // Helper function to get current page title
  const getCurrentPageInfo = () => {
    if (page === 0) {
      return "Viewing: Cover Page";
    } else if (page === backCoverIndex) {
      return "Viewing: Back Cover";
    } else if (page > 0 && page <= PAGE_CONTENTS.length) {
      const pageContent = PAGE_CONTENTS[page - 1];
      const pageTitle = pageContent?.title || `Page ${page}`;
      return `Viewing: ${pageTitle}`;
    }
    return "";
  };

  // Main UI
  return (
    <main className="pointer-events-none select-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Hacker Mode Navigation bar */}
      <div className="w-full pointer-events-auto overflow-hidden flex justify-center">
        <div className="flex items-center p-6">
          <button
            className="relative px-6 py-4 font-mono text-lg bg-black border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-all duration-300 uppercase tracking-wider shadow-lg hover:shadow-green-400/50"
            onClick={() => setProfileFormVisible(!profileFormVisible)}
            style={{
              clipPath:
                "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
              fontFamily: "Courier New, monospace",
            }}
          >
            <span className="relative z-10">
              {profileFormVisible ? "[HIDE_PROFILE]" : "[Join_Hackers]"}
            </span>
            {/* Glitch effect overlay */}
            <div className="absolute inset-0 bg-green-400 opacity-0 hover:opacity-20 transition-opacity duration-200"></div>
            {/* Animated border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-transparent to-green-400 opacity-75 blur-sm"></div>
          </button>
        </div>
      </div>

      {/* Profile Form Modal - explicitly make this interactive */}
      {profileFormVisible && <ProfileForm />}

      {/* Page title display */}
      <div className="p-4 text-center text-white/70 text-sm">
        <p>{getCurrentPageInfo()}</p>
      </div>
    </main>
  );
};

// Profile Form Component
const ProfileForm = () => {
  const [username, setUsername] = useState("");
  const [catchphrase, setCatchphrase] = useState("");
  const [links, setLinks] = useState([{ label: "", link: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({
    success: false,
    message: "",
  });
  const [paymentStep, setPaymentStep] = useState("form"); // form, payment, success
  const [sessionId, setSessionId] = useState("");
  const [, setProfileFormVisible] = useAtom(profileFormVisibleAtom);

  // Function to validate URLs
  const isValidURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Handle form submission and redirect to Paddle checkout
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Filter out incomplete links
    const validLinks = links.filter(
      (link) => link.label && link.link && isValidURL(link.link),
    );

    try {
      const response = await fetch(
        "https://goldfish-app-bb4s2.ondigitalocean.app/create-checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            catchphrase,
            links: validLinks,
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        // Store session ID for status checking
        setSessionId(result.sessionId);
        // Redirect to Paddle checkout
        window.location.href = result.checkoutUrl;
      } else {
        setSubmitResult({
          success: false,
          message: result.message || "Failed to create checkout session",
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: "An error occurred. Please try again.",
      });
      console.error("Error creating checkout:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check payment status (useful if you want to handle return from Paddle)
  const checkPaymentStatus = useCallback(async (sessionId) => {
    try {
      const response = await fetch(
        `https://goldfish-app-bb4s2.ondigitalocean.app/check-payment/${sessionId}`,
      );
      const result = await response.json();

      if (result.success && result.status === "completed") {
        setPaymentStep("success");
        setSubmitResult({
          success: true,
          message: "Profile created successfully!",
        });
      } else if (result.status === "pending") {
        // Still processing
        setTimeout(() => checkPaymentStatus(sessionId), 2000);
      } else {
        setSubmitResult({
          success: false,
          message: "Payment was not completed or session expired.",
        });
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  }, []);

  // Handle URL parameters on component mount (for return from Paddle)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("sessionId");
    const status = urlParams.get("status");

    if (sessionIdFromUrl && status === "success") {
      setSessionId(sessionIdFromUrl);
      setPaymentStep("processing");
      checkPaymentStatus(sessionIdFromUrl);
    } else if (status === "cancelled") {
      setSubmitResult({
        success: false,
        message: "Payment was cancelled. You can try again.",
      });
    }
  }, [checkPaymentStatus]);

  // Handle adding a new link
  const addLink = () => {
    setLinks([...links, { label: "", link: "" }]);
  };

  // Handle removing a link
  const removeLink = (index) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    setLinks(newLinks);
  };

  // Handle link input changes
  const handleLinkChange = (index, field, value) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 pointer-events-auto select-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {paymentStep === "form" && "Edit Your Profile"}
            {paymentStep === "processing" && "Processing Payment..."}
            {paymentStep === "success" && "Profile Updated!"}
          </h2>

          {submitResult.message && (
            <div
              className={`p-3 mb-4 rounded ${submitResult.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {submitResult.message}
            </div>
          )}

          {paymentStep === "form" && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="username"
                >
                  Username on X (Twitter)
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="@username"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="catchphrase"
                >
                  Brief Story or Catchphrase
                </label>
                <textarea
                  id="catchphrase"
                  value={catchphrase}
                  onChange={(e) => setCatchphrase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Tell us about yourself or add a catchphrase"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Side Projects
                </label>

                {links.map((link, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row mb-3 gap-2"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) =>
                          handleLinkChange(index, "label", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Project name"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="url"
                        value={link.link}
                        onChange={(e) =>
                          handleLinkChange(index, "link", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          link.link && !isValidURL(link.link)
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="https://..."
                      />
                      {link.link && !isValidURL(link.link) && (
                        <p className="text-red-500 text-xs mt-1">
                          Please enter a valid URL
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="mt-2 sm:mt-0 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addLink}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add Project
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Payment Information
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  A one-time fee of $2.00 will be charged to create your
                  profile.
                </p>
                <p className="text-xs text-gray-500">
                  You'll be redirected to Paddle's secure checkout page.
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setProfileFormVisible(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {isSubmitting
                    ? "Creating Checkout..."
                    : "Continue to Payment"}
                </button>
              </div>
            </form>
          )}

          {paymentStep === "processing" && (
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mt-4">
                  Processing Payment
                </h3>
                <p className="text-gray-600 mt-2">
                  Please wait while we process your payment and create your
                  profile...
                </p>
              </div>
            </div>
          )}

          {paymentStep === "success" && (
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto bg-green-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mt-4">
                  Payment Successful!
                </h3>
                <p className="text-gray-600 mt-2">
                  Your profile has been created successfully.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProfileFormVisible(false)}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UI;
