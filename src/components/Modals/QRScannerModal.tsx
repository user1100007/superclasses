import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Student, ScoreMap, TeacherProfile } from "../../types";
import { getAvg, getRank, gradeOf, resultOf, fmtAvg } from "../../lib/constants";

interface QRScannerModalProps {
  isOpen: boolean;
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  selClass: string;
  schoolName: string;
  teacher?: TeacherProfile | null;
  onClose: () => void;
  onSelectStudent?: (student: Student) => void;
  onVerifyStudent?: (student: Student) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  students,
  scoresMap,
  selClass,
  schoolName,
  teacher,
  onClose,
  onSelectStudent,
  onVerifyStudent,
  toast,
}) => {
  const [scannedResult, setScannedResult] = useState<{
    text: string;
    student?: Student;
    parsedInfo?: Record<string, string>;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorchCapability, setHasTorchCapability] = useState<boolean>(false);
  const [autoOpenVerify, setAutoOpenVerify] = useState<boolean>(true);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader-camera-viewport";

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScannedResult(null);
      setCameraError(null);
      setIsTorchOn(false);
      return;
    }

    // Auto discover camera devices
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const mapped = devices.map((d) => ({
            id: d.id,
            label: d.label || `Camera ${d.id.substring(0, 4)}`,
          }));
          setAvailableCameras(mapped);
          
          // Prefer back/environment camera if available
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("environment") ||
              d.label.toLowerCase().includes("rear")
          );
          const chosenId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenId);
          
          // Automatically start scanning upon open
          setTimeout(() => {
            startScanner(chosenId);
          }, 150);
        } else {
          setCameraError("រកមិនឃើញកាមេរ៉ាលើឧបករណ៍នេះទេ (No camera detected)");
        }
      })
      .catch((err) => {
        console.warn("Camera permission error:", err);
        setCameraError("សូមអនុញ្ញាតសិទ្ធិប្រើប្រាស់កាមេរ៉ាក្នុង Browser (Please allow camera permission)");
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId?: string) => {
    stopScanner();
    setCameraError(null);
    setScannedResult(null);

    const targetCamId = cameraId || selectedCameraId;
    const config = {
      fps: 15,
      qrbox: { width: 260, height: 260 },
      aspectRatio: 1.0,
    };

    try {
      const html5Qrcode = new Html5Qrcode(scannerContainerId);
      html5QrcodeRef.current = html5Qrcode;

      const cameraParam = targetCamId
        ? { deviceId: { exact: targetCamId } }
        : { facingMode: "environment" };

      await html5Qrcode.start(
        cameraParam,
        config,
        (decodedText) => {
          handleDecodedResult(decodedText);
        },
        () => {
          // Frame scan error - ignore silent frame misses
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const track = (html5Qrcode as any)._localMediaStream?.getVideoTracks?.()[0];
        if (track) {
          const capabilities = track.getCapabilities?.();
          if (capabilities && "torch" in capabilities) {
            setHasTorchCapability(true);
          }
        }
      } catch {
        setHasTorchCapability(false);
      }
    } catch (err: any) {
      console.error("Failed to start QR scanner:", err);
      setCameraError(
        err?.message || "មិនអាចបើកកាមេរ៉ាបានទេ សូមពិនិត្យសិទ្ធិប្រើប្រាស់កាមេរ៉ា (Camera Access Error)"
      );
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current
        .stop()
        .then(() => {
          html5QrcodeRef.current?.clear();
          html5QrcodeRef.current = null;
          setIsScanning(false);
          setIsTorchOn(false);
        })
        .catch((e) => {
          console.warn("Stop scanner error:", e);
          setIsScanning(false);
          setIsTorchOn(false);
        });
    } else {
      setIsScanning(false);
      setIsTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrcodeRef.current) return;
    try {
      const track = (html5QrcodeRef.current as any)._localMediaStream?.getVideoTracks?.()[0];
      if (track) {
        const nxt = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nxt }],
        });
        setIsTorchOn(nxt);
      }
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  const handleDecodedResult = (text: string) => {
    // Play pleasant confirmation audio chime on successful scan
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio feedback fallback
    }

    stopScanner();

    // 1. Parse URL Parameters if available
    let urlParams: URLSearchParams | null = null;
    try {
      if (text.includes("?") || text.startsWith("http")) {
        const urlStr = text.startsWith("http")
          ? text
          : `https://school.khmer/${text.startsWith("?") ? text : "?" + text}`;
        urlParams = new URL(urlStr).searchParams;
      }
    } catch {
      // Not a standard URL
    }

    // Extract student ID or Code from multiple query parameter keys or string patterns
    const extractedId =
      urlParams?.get("verifyStudentId") ||
      urlParams?.get("code") ||
      urlParams?.get("studentId") ||
      urlParams?.get("id") ||
      urlParams?.get("stuId") ||
      text.match(/(?:ID|អត្តលេខ|code)\s*[:=]\s*([^\s&|\n,]+)/i)?.[1]?.trim() ||
      "";

    let matchedStudent: Student | undefined;

    // Search existing students list by ID or Code
    if (extractedId) {
      matchedStudent = students.find(
        (s) => s.id === extractedId || (s.code && s.code.toLowerCase() === extractedId.toLowerCase())
      );
    }

    // Search by student Name if ID lookup didn't match
    if (!matchedStudent) {
      matchedStudent = students.find((s) => {
        if (s.id && text.includes(s.id)) return true;
        if (s.code && text.includes(s.code)) return true;
        const nameKey = `${s.lastName || ""} ${s.firstName || ""}`.trim();
        if (nameKey && text.includes(nameKey)) return true;
        return false;
      });
    }

    // If student is not in currently selected class roster, construct full student record from QR metadata
    if (!matchedStudent && urlParams) {
      const vId = urlParams.get("verifyStudentId") || urlParams.get("code") || extractedId || "STU-VERIFIED";
      const lName = urlParams.get("lastName") || "សិស្ស";
      const fName = urlParams.get("firstName") || "";
      matchedStudent = {
        id: vId,
        code: urlParams.get("code") || vId,
        lastName: lName,
        firstName: fName,
        latinName: urlParams.get("latinName") || undefined,
        gender: (urlParams.get("gender") as any) || "—",
        dob: urlParams.get("dob") || "—",
        village: urlParams.get("village") || undefined,
        commune: urlParams.get("commune") || undefined,
        district: urlParams.get("district") || undefined,
        province: urlParams.get("province") || undefined,
        fatherName: urlParams.get("fatherName") || undefined,
        fatherJob: urlParams.get("fatherJob") || undefined,
        motherName: urlParams.get("motherName") || undefined,
        motherJob: urlParams.get("motherJob") || undefined,
        phone: urlParams.get("studentPhone") || undefined,
        _avgVal: urlParams.get("avg") || undefined,
        _grade: urlParams.get("grade") || undefined,
        _rank: urlParams.get("rank") || undefined,
        _resultText: urlParams.get("result") || undefined,
        _selClass: urlParams.get("selClass") || selClass || undefined,
        _schoolName: urlParams.get("school") || schoolName || undefined,
        _teacherName: urlParams.get("teacher") || undefined,
      };
    }

    // Parse lines into key-value pairs if text formatted QR
    const lines = text.split("\n");
    const parsedInfo: Record<string, string> = {};
    lines.forEach((line) => {
      if (line.includes(":")) {
        const [k, ...v] = line.split(":");
        parsedInfo[k.trim()] = v.join(":").trim();
      }
    });

    setScannedResult({
      text,
      student: matchedStudent,
      parsedInfo: Object.keys(parsedInfo).length > 0 ? parsedInfo : undefined,
    });

    if (matchedStudent) {
      const studentDisplayName = `${matchedStudent.lastName || ""} ${matchedStudent.firstName || ""}`.trim();
      toast(
        `✅ ស្កែន QR ជោគជ័យ! បានផ្ទៀងផ្ទាត់សិស្ស ៖ ${studentDisplayName} (${matchedStudent.code || matchedStudent.id})`,
        "success"
      );

      // Automatically display details using existing VerifyModal if enabled
      if (autoOpenVerify) {
        if (onVerifyStudent) {
          onVerifyStudent(matchedStudent);
          onClose();
          return;
        } else if (onSelectStudent) {
          onSelectStudent(matchedStudent);
          onClose();
          return;
        }
      }
    } else {
      toast("ℹ️ បានស្កែន QR Code! ពុំឃើញទិន្នន័យសិស្សត្រូវគ្នាទេ", "info");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5Qrcode = new Html5Qrcode("qr-file-temp-scanner");
    html5Qrcode
      .scanFile(file, true)
      .then((decodedText) => {
        handleDecodedResult(decodedText);
        html5Qrcode.clear();
      })
      .catch((err) => {
        toast("❌ ពុំអាចអាន QR Code ពីរូបភាពនេះបានទេ!", "error");
        console.error("Scan file error:", err);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 text-slate-100 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-700/80 relative flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl font-bold shadow-xs">
              📷
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>ស្កែន QR Code ផ្ទៀងផ្ទាត់សិស្ស</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Camera QR Code Verification Scanner & Overlay
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold transition cursor-pointer"
            title="បិទ (Close)"
          >
            ✕
          </button>
        </div>

        {/* Hidden temp container for file scanning */}
        <div id="qr-file-temp-scanner" className="hidden"></div>

        {/* Main Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {!scannedResult ? (
            <div className="space-y-3">
              {/* Live Viewfinder Camera Area with Overlay */}
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-slate-800 min-h-[300px] flex items-center justify-center shadow-inner">
                {/* HTML5 QR Code Video Target */}
                <div id={scannerContainerId} className="w-full h-full min-h-[300px]"></div>

                {/* Viewfinder Target Reticle Frame & Laser Scan Overlay (Only active during scanning) */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Viewfinder Box */}
                    <div className="relative w-64 h-64 border border-emerald-500/30 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-center overflow-hidden">
                      
                      {/* 4 Precision Corner Reticles */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-pulse">
                        <style>{`
                          @keyframes qrLaserScan {
                            0% { top: 4%; opacity: 0.8; }
                            50% { top: 94%; opacity: 1; }
                            100% { top: 4%; opacity: 0.8; }
                          }
                          .qr-laser-beam {
                            animation: qrLaserScan 2.4s ease-in-out infinite;
                          }
                        `}</style>
                      </div>
                      <div className="qr-laser-beam absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399]" />

                      {/* Subtle Center Crosshair */}
                      <div className="w-3 h-3 border-t border-b border-emerald-500/40 opacity-70"></div>
                      <div className="w-3 h-3 border-l border-r border-emerald-500/40 opacity-70 absolute"></div>
                    </div>

                    {/* Scan Prompt Tag */}
                    <div className="mt-3 bg-slate-950/80 border border-slate-700/80 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-300 shadow-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>តម្រង់ QR Code សិស្សឱ្យចំក្នុងប្រអប់</span>
                    </div>
                  </div>
                )}

                {/* Not Scanning / Idle Screen */}
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-white z-10 space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl animate-bounce">
                      📷
                    </div>
                    <h4 className="font-extrabold text-sm text-emerald-300">
                      បើកកាមេរ៉ាស្កែន QR Code ផ្ទៀងផ្ទាត់
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      ប្រព័ន្ធនឹងដកស្រង់អត្តលេខ ឬ ID សិស្សដោយស្វ័យប្រវត្តិ និងបង្ហាញព័ត៌មានផ្ទៀងផ្ទាត់ភ្លាមៗ
                    </p>
                    <button
                      onClick={() => startScanner()}
                      className="mt-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>▶️</span> បើកកាមេរ៉ាស្កែន
                    </button>
                  </div>
                )}

                {/* Camera Permission / Error Screen */}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-white z-10 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl">
                      ⚠️
                    </div>
                    <h4 className="font-bold text-sm text-amber-300">មិនអាចបើកកាមេរ៉ាបានទេ</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => startScanner()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>🔄</span> ព្យាយាមម្ដងទៀត
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Controls: Camera Selector, Torch, File Upload & Options */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Camera Selector Dropdown */}
                  {availableCameras.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
                      <span className="text-slate-400 font-bold">📷 កាមេរ៉ា:</span>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          setSelectedCameraId(e.target.value);
                          if (isScanning) startScanner(e.target.value);
                        }}
                        className="bg-transparent font-bold text-white focus:outline-none cursor-pointer max-w-[150px] truncate"
                      >
                        {availableCameras.map((cam) => (
                          <option key={cam.id} value={cam.id} className="bg-slate-900 text-white">
                            {cam.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Flash / Torch Toggle */}
                  {hasTorchCapability && isScanning && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isTorchOn
                          ? "bg-amber-400 text-slate-950 font-black shadow-xs shadow-amber-400/40"
                          : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      }`}
                      title="បើក/បិទ ពិល Flashlight"
                    >
                      <span>{isTorchOn ? "🔦" : "💡"}</span>
                      <span>{isTorchOn ? "បិទពិល" : "បើកពិល"}</span>
                    </button>
                  )}

                  {/* Scan from image file fallback */}
                  <label className="text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ml-auto">
                    <span>🖼️</span>
                    <span>ជ្រើសរូបភាព QR</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Auto Verify Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoOpenVerify}
                      onChange={(e) => setAutoOpenVerify(e.target.checked)}
                      className="rounded accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>បើកផ្ទាំងផ្ទៀងផ្ទាត់ (Verify Modal) ដោយស្វ័យប្រវត្តពេលស្កែនជាប់</span>
                  </label>

                  {isScanning && (
                    <button
                      onClick={stopScanner}
                      className="text-red-400 hover:text-red-300 font-bold underline cursor-pointer text-[11px]"
                    >
                      ⏹️ ផ្អាកកាមេរ៉ា
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Scanned Result Review Screen (if not auto-opened) */
            <div className="space-y-4 animate-fade-in">
              {scannedResult.student ? (
                /* Verified Student Details Card */
                <div className="bg-emerald-950/40 border-2 border-emerald-500/80 rounded-2xl p-4 text-slate-100 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                      <span className="text-xl">✅</span>
                      <span>បានផ្ទៀងផ្ទាត់ព័ត៌មានសិស្សត្រឹមត្រូវ</span>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                      VERIFIED
                    </span>
                  </div>

                  {(() => {
                    const s = scannedResult.student!;
                    const annualAvg = getAvg(s.id, students, scoresMap);
                    const avgVal =
                      annualAvg !== null
                        ? Number(fmtAvg(annualAvg))
                        : s._avgVal !== undefined && s._avgVal !== null
                        ? Number(s._avgVal)
                        : null;
                    const grade =
                      avgVal !== null
                        ? gradeOf(avgVal)
                        : s._grade
                        ? { l: s._grade, c: "#10b981" }
                        : { l: "—", c: "#6b7280" };
                    const rank = getRank(s.id, students, scoresMap) || s._rank || "—";
                    const resultText =
                      avgVal !== null ? resultOf(avgVal) : s._resultText || "—";

                    const village = s.village || "រោគ";
                    const commune = s.commune || "ស្ពានស្រែង";
                    const district = s.district || "ភ្នំស្រុក";
                    const province = s.province || "បន្ទាយមានជ័យ";
                    const address = `ភូមិ${village}, ឃុំ${commune}, ស្រុក${district}, ខេត្ត${province}`;

                    return (
                      <div className="bg-slate-900/90 rounded-xl p-3 text-xs space-y-1.5 border border-slate-800">
                        <div className="text-sm font-extrabold text-white">
                          👤 {s.lastName} {s.firstName}{" "}
                          <span className="text-emerald-400">({s.latinName || "STUDENT"})</span>
                        </div>
                        <div>
                          <strong>អត្តលេខ (ID) ៖</strong>{" "}
                          <span className="font-mono font-bold text-emerald-400">
                            {s.code || s.id}
                          </span>
                        </div>
                        <div>
                          <strong>ភេទ ៖</strong> {s.gender || "—"} &nbsp;|&nbsp;{" "}
                          <strong>ថ្ងៃកំណើត ៖</strong> {s.dob || "—"}
                        </div>
                        <div>
                          <strong>អាសយដ្ឋាន ៖</strong> {address}
                        </div>
                        <div>
                          <strong>ថ្នាក់ទី ៖</strong> {s._selClass || selClass} ·{" "}
                          {s._schoolName || schoolName}
                        </div>
                        <div className="border-t border-dashed border-slate-800 my-2 pt-2 flex flex-wrap gap-2 text-xs">
                          <span>
                            <strong>មធ្យមភាគ ៖</strong> {avgVal !== null ? avgVal : "—"}
                          </span>
                          <span>|</span>
                          <span>
                            <strong>និទ្ទេស ៖</strong>{" "}
                            <span className="font-black" style={{ color: grade.c }}>
                              {grade.l}
                            </span>
                          </span>
                          <span>|</span>
                          <span>
                            <strong>ចំណាត់ថ្នាក់ ៖</strong> #{rank}
                          </span>
                          <span>|</span>
                          <span>
                            <strong>លទ្ធផល ៖</strong>{" "}
                            <span
                              className={`font-black ${
                                resultText === "ជាប់" ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {resultText}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => {
                      if (onVerifyStudent) {
                        onVerifyStudent(scannedResult.student!);
                      } else if (onSelectStudent) {
                        onSelectStudent(scannedResult.student!);
                      }
                      onClose();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🔍</span>
                    <span>បើកផ្ទាំងផ្ទៀងផ្ទាត់ពេញលេញ (Open Verify Modal)</span>
                  </button>
                </div>
              ) : (
                /* Scanned Non-Student Raw Payload */
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <span>📄</span>
                    <span>ព័ត៌មាន QR Code ដែលបានស្កែន (Decoded Content)</span>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {scannedResult.text}
                  </div>
                </div>
              )}

              {/* Retry / Close Action Buttons */}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => {
                    setScannedResult(null);
                    startScanner();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  🔄 ស្កែនម្ដងទៀត (Scan Again)
                </button>
                <button
                  onClick={() => {
                    stopScanner();
                    onClose();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  បិទ (Close)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

