import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize or get Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Provider with Gmail Scopes
const provider = new GoogleAuthProvider();
provider.addScope("https://mail.google.com/");
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.compose");
provider.addScope("https://www.googleapis.com/auth/gmail.modify");

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

/**
 * Listener for auth state changes. Memory caches the user and token.
 */
export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in via standard Firebase but missing Gmail access token, trigger callback
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

declare const google: any;

/**
 * Direct Google OAuth 2.0 Token Client via GIS JS SDK (fallback for restricted Firebase Auth popups)
 */
export const requestGmailTokenViaGIS = (): Promise<{ accessToken: string; email?: string }> => {
  return new Promise((resolve, reject) => {
    const scriptId = "google-gis-script";
    const clientId = (firebaseConfig as any).oAuthClientId;

    const runGIS = () => {
      try {
        if (!clientId) {
          reject(new Error("ពុំទាន់មាន OAuth Client ID ក្នុង config ទេ"));
          return;
        }

        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope:
            "https://mail.google.com/ https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify",
          callback: async (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              try {
                const profileRes = await fetch(
                  "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                  {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                  }
                );
                const profile = profileRes.ok ? await profileRes.json() : {};
                const email = profile.emailAddress || "user@gmail.com";
                cachedAccessToken = response.access_token;
                cachedUser = { email, displayName: email } as any;
                resolve({ accessToken: response.access_token, email });
              } catch {
                cachedAccessToken = response.access_token;
                resolve({ accessToken: response.access_token });
              }
            } else {
              reject(new Error("ពុំទទួលបាន Access Token ទេ"));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || "ការភ្ជាប់ Google OAuth បរាជ័យ"));
          },
        });
        client.requestAccessToken();
      } catch (e: any) {
        reject(e);
      }
    };

    if (typeof google !== "undefined" && google?.accounts?.oauth2) {
      runGIS();
    } else {
      const existing = document.getElementById(scriptId);
      if (existing) {
        existing.addEventListener("load", runGIS);
      } else {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = runGIS;
        script.onerror = () => reject(new Error("មិនអាចទាញយក Google Identity Script បានទេ"));
        document.body.appendChild(script);
      }
    }
  });
};

/**
 * Triggers Google Sign In popup requesting Gmail OAuth scopes with GIS fallback
 */
export const signInWithGoogleForGmail = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("ពុំទទួលបាន OAuth Access Token ពី Google ទេ");
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.warn("Firebase Auth Popup restricted or failed, falling back to GIS OAuth:", error);
    // Fallback to Google Identity Services Token Client if Firebase popup restricted or prohibited
    try {
      const gisRes = await requestGmailTokenViaGIS();
      if (gisRes.accessToken) {
        return {
          user: cachedUser || ({ email: gisRes.email, displayName: gisRes.email } as any),
          accessToken: gisRes.accessToken,
        };
      }
    } catch (fallbackError: any) {
      console.error("GIS Fallback Error:", fallbackError);
    }

    if (error?.code === "auth/admin-restricted-operation" || error?.message?.includes("admin-restricted-operation")) {
      throw new Error("ការចូលប្រើ Firebase ត្រូវបានកំណត់កម្រិត (admin-restricted)។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។");
    }
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("សេវាកម្ម Google Sign-In មិនទាន់បើកដំណើរការក្នុង Firebase Console ទេ។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់។");
    }
    if (error?.code === "auth/popup-blocked" || error?.message?.includes("popup") || error?.message?.includes("Popup")) {
      throw new Error("ផ្ទាំង Popup ត្រូវទប់ស្កាត់ដោយកម្មវិធីរុករក (Browser)។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។");
    }
    throw new Error(error?.message || "ការភ្ជាប់ Google Sign-In បរាជ័យ។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។");
  } finally {
    isSigningIn = false;
  }
};

/**
 * Manually set OAuth Access Token (Fallback when Firebase auth popup is restricted)
 */
export const setGmailManualToken = async (token: string): Promise<{ email: string; accessToken: string }> => {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error("សូមបញ្ជូល Access Token");
  }

  // Validate token with Gmail Profile API
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${cleanToken}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Access Token មិនត្រឹមត្រូវ ឬផុតកំណត់");
  }

  const profile = await res.json();
  const userEmail = profile.emailAddress || "user@gmail.com";

  cachedAccessToken = cleanToken;
  cachedUser = {
    email: userEmail,
    displayName: userEmail,
  } as any;

  return { email: userEmail, accessToken: cleanToken };
};

/**
 * Logout from Gmail
 */
export const logoutGmail = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Sign out error:", e);
  } finally {
    cachedAccessToken = null;
    cachedUser = null;
  }
};

/**
 * Gets cached token in memory
 */
export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getGmailUser = (): User | null => {
  return cachedUser;
};

/**
 * Utility to encode RFC 2822 email message in base64url for Gmail API
 */
function createRawEmail(to: string, from: string, subject: string, htmlContent: string): string {
  const str = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlContent,
  ].join("\r\n");

  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
}

/**
 * Sends email via Gmail API REST
 */
export const sendGmailEmail = async ({ to, subject, htmlBody }: SendEmailParams) => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error("មិនទាន់បានចូលប្រើប្រាស់ Gmail ទេ (No Access Token)");
  }

  const senderEmail = cachedUser?.email || "me";
  const raw = createRawEmail(to, senderEmail, subject, htmlBody);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `មិនអាចផ្ញើអ៊ីមែលបានទេ (${res.status})`);
  }

  return await res.json();
};

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

/**
 * Fetches recent list of Gmail messages for the user
 */
export const listGmailMessages = async (maxResults = 10): Promise<GmailMessageSummary[]> => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error("មិនទាន់បានចូលប្រើប្រាស់ Gmail ទេ");
  }

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || "បរាជ័យក្នុងការទាញយកបញ្ជីអ៊ីមែល");
  }

  const listData = await listRes.json();
  if (!listData.messages || !Array.isArray(listData.messages)) {
    return [];
  }

  // Fetch details for each message snippet
  const details = await Promise.all(
    listData.messages.slice(0, maxResults).map(async (m: { id: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!detailRes.ok) return { id: m.id, snippet: "" };
        const d = await detailRes.json();
        const headers: GmailMessageHeader[] = d.payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(គ្មានចំណងជើង)";
        const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
        const date = headers.find((h) => h.name.toLowerCase() === "date")?.value || "";
        return {
          id: m.id,
          snippet: d.snippet || "",
          subject,
          from,
          date,
        };
      } catch {
        return { id: m.id, snippet: "" };
      }
    })
  );

  return details;
};
