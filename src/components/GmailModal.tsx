import React, { useState, useEffect } from "react";
import {
  signInWithGoogleForGmail,
  setGmailManualToken,
  logoutGmail,
  getGmailAccessToken,
  getGmailUser,
  sendGmailEmail,
  listGmailMessages,
  GmailMessageSummary,
} from "../lib/gmailService";
import { User } from "firebase/auth";

interface GmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: string;
  defaultSubject?: string;
  defaultHtmlBody?: string;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const GmailModal: React.FC<GmailModalProps> = ({
  isOpen,
  onClose,
  defaultRecipient = "",
  defaultSubject = "",
  defaultHtmlBody = "",
  toast,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Manual Token State
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [isSettingToken, setIsSettingToken] = useState(false);

  // Email form state
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(defaultSubject || "របាយការណ៍លទ្ធផលសិក្សាសិស្ស - សាលាបឋមសិក្សា");
  const [emailBody, setEmailBody] = useState(defaultHtmlBody || "");
  const [templateType, setTemplateType] = useState<"report" | "attendance" | "custom">("report");

  // Tabs
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Confirm Dialog Modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // History state
  const [messagesList, setMessagesList] = useState<GmailMessageSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const user = getGmailUser();
      const token = getGmailAccessToken();
      setCurrentUser(user);
      setAccessToken(token);

      if (defaultRecipient) setRecipient(defaultRecipient);
      if (defaultSubject) setSubject(defaultSubject);
      if (defaultHtmlBody) setEmailBody(defaultHtmlBody);
    }
  }, [isOpen, defaultRecipient, defaultSubject, defaultHtmlBody]);

  useEffect(() => {
    if (isOpen && activeTab === "history" && accessToken) {
      fetchHistory();
    }
  }, [isOpen, activeTab, accessToken]);

  const fetchHistory = async () => {
    setIsLoadingList(true);
    try {
      const msgs = await listGmailMessages(10);
      setMessagesList(msgs);
    } catch (err: any) {
      toast(err.message || "មិនអាចទាញយកបញ្ជីសារបានទេ", "error");
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const res = await signInWithGoogleForGmail();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        toast(`បានភ្ជាប់ Gmail ដោយជោគជ័យ៖ ${res.user.email}`, "success");
      }
    } catch (err: any) {
      toast(err.message || "ការភ្ជាប់ទៅ Google បរាជ័យ", "error");
      setShowManualInput(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleConnectManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      toast("សូមបញ្ជូល Access Token", "error");
      return;
    }
    setIsSettingToken(true);
    try {
      const res = await setGmailManualToken(manualToken);
      setAccessToken(res.accessToken);
      setCurrentUser({ email: res.email, displayName: res.email } as any);
      toast(`បានភ្ជាប់ Gmail រួចរាល់សំរាប់ ${res.email}`, "success");
      setShowManualInput(false);
    } catch (err: any) {
      toast(err.message || "Access Token មិនត្រឹមត្រូវ", "error");
    } finally {
      setIsSettingToken(false);
    }
  };

  const handleLogout = async () => {
    await logoutGmail();
    setCurrentUser(null);
    setAccessToken(null);
    toast("បានចាកចេញពី Gmail", "info");
  };

  const handleTemplateChange = (type: "report" | "attendance" | "custom") => {
    setTemplateType(type);
    if (type === "attendance") {
      setSubject("លិខិតជូនដំណឹងអំពីអវត្តមានសិស្ស");
      setEmailBody(
        `<div style="font-family: 'Hanuman', 'Battambang', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">លិខិតជូនដំណឹងអំពីអវត្តមាន</h2>
          <p>ជម្រាបសួរ លោក/លោកស្រី អាណាព្យាបាលសិស្ស,</p>
          <p>សាលាបឋមសិក្សាសូមជូនដំណឹងអំពីការវត្តមាន និងការសិក្សារបស់កូនលោកលោកស្រី។</p>
          <p>សូមមេត្តាទំនាក់ទំនងមកកាន់គ្រូបន្ទុកថ្នាក់ ដើម្បីសាកសួរព័ត៌មានបន្ថែម។</p>
          <br/>
          <p style="color: #64748b; font-size: 13px;">ដោយគោរពស្រឡាញ់,<br/><strong>គណៈគ្រប់គ្រងសាលារៀន</strong></p>
        </div>`
      );
    } else if (type === "custom") {
      setSubject("សេចក្តីជូនដំណឹងពីសាលារៀន");
      setEmailBody(
        `<div style="font-family: 'Hanuman', 'Battambang', Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
          <p>ជម្រាបសួរ លោក/លោកស្រី,</p>
          <p>សរសេរខ្លឹមសារសារនៅទីនេះ...</p>
        </div>`
      );
    }
  };

  const handleTriggerSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      toast("សូមបញ្ជូលអាសយដ្ឋានអ៊ីមែលរបស់អ្នកទទួល (To)", "error");
      return;
    }
    if (!subject.trim()) {
      toast("សូមបញ្ជូលប្រធានបទសារ (Subject)", "error");
      return;
    }
    if (!accessToken) {
      toast("សូមចូលប្រើប្រាស់ Gmail ជាមុនសិន", "error");
      return;
    }
    // Show user confirmation modal before sending
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setIsSending(true);
    try {
      await sendGmailEmail({
        to: recipient.trim(),
        subject: subject.trim(),
        htmlBody: emailBody,
      });
      toast(`បានផ្ញើអ៊ីមែលទៅកាន់ ${recipient} រួចរាល់!`, "success");
      onClose();
    } catch (err: any) {
      toast(err.message || "ការផ្ញើអ៊ីមែលបរាជ័យ", "error");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xl border border-red-500/30">
              ✉️
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                ប្រព័ន្ធផ្ញើអ៊ីមែល Gmail (Gmail Integration)
              </h3>
              <p className="text-xs text-slate-300">
                ផ្ញើរបាយការណ៍លទ្ធផលសិក្សា និងលិខិតជូនដំណឹងទៅអាណាព្យាបាល
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Account Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          {accessToken && currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-blue-400"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {currentUser.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{currentUser.displayName || currentUser.email}</span>
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ភ្ជាប់ Gmail រួចរាល់
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">{currentUser.email}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <span>⚠️ មិនទាន់ភ្ជាប់ Google Account ដើម្បីផ្ញើអ៊ីមែលទេ</span>
            </div>
          )}

          <div>
            {accessToken && currentUser ? (
              <button
                onClick={handleLogout}
                className="text-xs text-red-600 hover:text-red-800 font-semibold underline px-2 py-1"
              >
                ចាកចេញ
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isAuthenticating ? "កំពុងភ្ជាប់..." : "🔑 ចូលប្រើប្រាស់ជាមួយ Google"}
              </button>
            )}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab("compose")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === "compose"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            ✏️ រៀបចំអ៊ីមែល (Compose)
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📥 ប្រវត្តិសារដែលបានផ្ញើ / ទទួលបាន (Messages)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {!accessToken ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 max-w-lg mx-auto">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                ✉️
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                សូមភ្ជាប់ Google Account ដើម្បីប្រើប្រាស់សេវាកម្ម Gmail
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                អ្នកអាចផ្ញើរបាយការណ៍លទ្ធផលសិក្សាសិស្ស លិខិតអវត្តមាន ឬការជូនដំណឹងផ្សេងៗទៅកាន់អាណាព្យាបាលសិស្សដោយផ្ទាល់។
              </p>

              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition inline-flex items-center gap-2"
                >
                  {isAuthenticating ? "កំពុងភ្ជាប់..." : "🔑 ចូលប្រើប្រាស់ជាមួយ Google Gmail"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline mt-1"
                >
                  {showManualInput ? "លាក់ជម្រើស Access Token" : "🔑 ឬភ្ជាប់ដោយប្រើ Google OAuth Access Token ដោយផ្ទាល់"}
                </button>
              </div>

              {showManualInput && (
                <form onSubmit={handleConnectManualToken} className="mt-5 pt-4 border-t border-slate-200 text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google OAuth Access Token:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      required
                      placeholder="ya29.a0A..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSettingToken}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      {isSettingToken ? "កំពុងត្រួតពិនិត្យ..." : "ភ្ជាប់"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    * ប្រើប្រាស់នៅពេល Google Firebase Auth ត្រូវបានកំណត់កម្រិត (admin-restricted-operation)។
                  </p>
                </form>
              )}
            </div>
          ) : activeTab === "compose" ? (
            <form onSubmit={handleTriggerSend} className="space-y-4 text-xs">
              {/* Template selection */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">គំរូសារ (Template):</span>
                <button
                  type="button"
                  onClick={() => handleTemplateChange("report")}
                  className={`px-3 py-1 rounded-lg border font-semibold transition ${
                    templateType === "report"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  📊 របាយការណ៍លទ្ធផលសិក្សា
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange("attendance")}
                  className={`px-3 py-1 rounded-lg border font-semibold transition ${
                    templateType === "attendance"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ⚠️ ជូនដំណឹងអវត្តមាន
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange("custom")}
                  className={`px-3 py-1 rounded-lg border font-semibold transition ${
                    templateType === "custom"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ✍️ សារទូទៅ
                </button>
              </div>

              {/* Recipient */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  អាសយដ្ឋានអ៊ីមែលអ្នកទទួល (To Email) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ឧ. parent@gmail.com, admin@school.edu.kh"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ប្រធានបទសារ (Subject) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="បញ្ជូលប្រធានបទអ៊ីមែល..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-800"
                />
              </div>

              {/* Email Content HTML Preview */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-700">
                    ខ្លឹមសារសារ (Email Content - HTML)
                  </label>
                  <span className="text-[11px] text-slate-400">គាំទ្រទម្រង់ HTML & តារាងពិន្ទុ</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50 max-h-56 overflow-y-auto text-xs border-b border-slate-200">
                    <div dangerouslySetInnerHTML={{ __html: emailBody }} />
                  </div>
                  <textarea
                    rows={4}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="កែប្រែ HTML Code ឬ ខ្លឹមសារសារនៅទីនេះ..."
                    className="w-full p-2.5 text-[11px] font-mono text-slate-700 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
                >
                  {isSending ? "កំពុងផ្ញើ..." : "✉️ ផ្ញើអ៊ីមែល (Send Email)"}
                </button>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800">
                  សារអ៊ីមែលថ្មីៗពីប្រអប់សារ (Gmail Inbox / Sent)
                </h4>
                <button
                  onClick={fetchHistory}
                  disabled={isLoadingList}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  {isLoadingList ? "កំពុងទាញយក..." : "🔄 ធ្វើបច្ចុប្បន្នភាព"}
                </button>
              </div>

              {isLoadingList ? (
                <div className="py-8 text-center text-slate-400 text-xs">កំពុងទាញយកទិន្នន័យអ៊ីមែល...</div>
              ) : messagesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">មិនមានសារនៅក្នុងបញ្ជីទេ</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                  {messagesList.map((m) => (
                    <div key={m.id} className="p-3 hover:bg-slate-50 transition text-xs">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-bold text-slate-800 line-clamp-1">{m.subject}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{m.date}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        <span className="font-semibold text-slate-600">{m.from}: </span>
                        {m.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog Modal (User Safety Requirement) */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-3">
              ❓
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              បញ្ជាក់ការផ្ញើអ៊ីមែល (Confirm Send)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              តើអ្នកពិតជាចង់ផ្ញើអ៊ីមែលនេះទៅកាន់អាសយដ្ឋាន <strong className="text-slate-900">{recipient}</strong> មែនឬទេ?
              <br />
              <span className="text-slate-500 font-medium">ប្រធានបទ៖ "{subject}"</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition text-xs"
              >
                បោះបង់ (Cancel)
              </button>
              <button
                onClick={handleConfirmSend}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md transition text-xs"
              >
                យល់ព្រមផ្ញើ (Confirm Send)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
