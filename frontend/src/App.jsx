import { useState, useEffect, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────
const API_BASE = import.meta.env.DEV
  ? `http://${window.location.hostname}:3001`
  : (import.meta.env.VITE_API_BASE_URL || "https://fleet-booking.onrender.com");
const HUB_URL = import.meta.env.VITE_HUB_URL || "https://polyfoampfs-hub.vercel.app";

// ─── Helpers ─────────────────────────────────────────────────
const STATUS_MAP = {
  pending: { label: "รออนุมัติ", bg: "#FBF0C4", text: "#8A7520", dot: "#F5E08A" },
  approved: { label: "อนุมัติ", bg: "#D4F0E7", text: "#3D7A5F", dot: "#A8DCC8" },
  rejected: { label: "ไม่อนุมัติ", bg: "#F8D7E0", text: "#9C4462", dot: "#F0B0C4" },
  completed: { label: "เสร็จสิ้น", bg: "#E8E0F0", text: "#6B5B7B", dot: "#C9B8DB" },
  cancelled: { label: "ยกเลิกแล้ว", bg: "#F0ECE8", text: "#8E847A", dot: "#B8AFA6" },
  available: { label: "ว่าง", bg: "#D4F0E7", text: "#3D7A5F", dot: "#A8DCC8" },
  booked: { label: "ใช้งาน", bg: "#D0E8F7", text: "#3A6B8C", dot: "#A7D1ED" },
  maintenance: { label: "ซ่อมบำรุง", bg: "#F8D7E0", text: "#9C4462", dot: "#F0B0C4" },
};

const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status, bg: "#F0ECE8", text: "#6B6158", dot: "#B8AFA6" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 100, background: s.bg, color: s.text, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
};

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

async function parseApiResponse(res, fallbackMessage) {
  const rawText = await res.text();
  const contentType = res.headers.get("content-type") || "";
  let payload = null;

  if (rawText) {
    try {
      payload = contentType.includes("application/json")
        ? JSON.parse(rawText)
        : JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    if (payload?.error) {
      throw new Error(payload.error);
    }

    if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
      throw new Error(
        "Car Booking backend is not ready for SSO yet. Please redeploy the backend service on Render."
      );
    }

    throw new Error(fallbackMessage);
  }

  return payload || {};
}

const font = `'Noto Sans Thai', 'DM Sans', system-ui, sans-serif`;
const C = { bg: "#F1F5F9", card: "#FFFFFF", sidebar: "#1E293B", accent: "#3B82F6", accentLight: "#DBEAFE", border: "#E2E8F0", t1: "#1E293B", t2: "#64748B", t3: "#94A3B8", danger: "#EF4444", success: "#22C55E", warn: "#F59E0B" };

// ─── Confirm Dialog ──────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, confirmColor, onConfirm, onCancel, icon }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, animation: "fadeIn 0.15s", backdropFilter: "blur(3px)" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 16, padding: "28px 28px 24px", width: 380, maxWidth: "90vw", animation: "scaleIn 0.2s ease", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{icon || "⚠️"}</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{message}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10, background: "transparent", color: C.t2, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>ยกเลิก</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: confirmColor || C.danger, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>{confirmLabel || "ยืนยัน"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle Switch ───────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "10px 0" }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <div onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? C.accent : "#CBD5E1", padding: 2, transition: "background 0.2s", cursor: "pointer", position: "relative" }}>
        <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.2s", transform: checked ? "translateX(20px)" : "translateX(0)" }} />
      </div>
    </label>
  );
}

// ─── Car Form Modal ───────────────────────────────────────────
function CarFormModal({ initialData, onClose, onSubmit }) {
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState(initialData?.id ? { ...initialData } : { name: "", licensePlate: "", type: "Sedan", color: "#059669", image: "🚗" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(3px)", animation: "fadeIn 0.2s" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, width: 400, maxWidth: "90vw", borderRadius: 16, padding: "28px 28px 24px", animation: "scaleIn 0.2s ease", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>{isEdit ? "แก้ไขข้อมูลรถ" : "เพิ่มรถใหม่"}</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>ชื่อรถ / รุ่น</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Toyota Camry" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: font, fontSize: 13 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>ทะเบียนรถ</label>
          <input value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} placeholder="กท 1234 กรุงเทพมหานคร" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: font, fontSize: 13 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>ประเภท</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: font, fontSize: 13, background: "#fff", cursor: "pointer" }}>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="Pickup">กระบะ</option>
              <option value="Van">ตู้</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>อิโมจิรถ</label>
            <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="🚗" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: font, fontSize: 13 }} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>สีป้าย (Hex Code)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: 44, height: 44, padding: 0, border: "none", borderRadius: 10, cursor: "pointer", background: "transparent" }} />
            <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: font, fontSize: 13, background: "#F5F5F7", color: C.t1 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff", color: C.t2, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>ยกเลิก</button>
          <button onClick={() => onSubmit(form)} disabled={!form.name || !form.licensePlate} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: form.name && form.licensePlate ? C.t1 : "#E5E5EA", color: form.name && form.licensePlate ? "#fff" : C.t3, fontWeight: 700, fontSize: 13, cursor: form.name && form.licensePlate ? "pointer" : "not-allowed", fontFamily: font }}>{isEdit ? "บันทึกการแก้ไข" : "เพิ่มรถคันใหม่"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [blackoutDates, setBlackoutDates] = useState([]);

  const getInitialPage = () => {
    const hash = window.location.hash.replace("#", "");
    return hash || "dashboard"; // Will be overridden by login logic if needed
  };
  const [page, setPage] = useState(getInitialPage);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) setPage(hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  const [bookingModal, setBookingModal] = useState(null);
  const [carFormModal, setCarFormModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const width = useWindowWidth();
  const isMobile = width < 768;

  const showToast = (msg, icon = "✅") => { setToast({ msg, icon }); setTimeout(() => setToast(null), 3000); };
  const addNotif = (n) => setNotifications(prev => [{ ...n, id: Date.now(), read: false, createdAt: new Date().toISOString() }, ...prev]);
  const clearSsoParams = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("sso_token");
    url.searchParams.delete("hub_origin");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const getHubLoginUrl = () => `${HUB_URL}/login?redirect=${encodeURIComponent(window.location.origin)}`;

  const myNotifs = notifications.filter(n => {
    if (!currentUser) return false;
    if (currentUser.role === "admin" && n.forRole === "admin") return true;
    if (n.forRole === "user" && n.forUserId === currentUser.id) return true;
    return false;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unread = myNotifs.filter(n => !n.read).length;

  const markRead = (id) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    const token = localStorage.getItem('fleetbook_token');
    fetch(`${API_BASE}/api/notifications/${id}/read`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } }).catch(console.error);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => {
      if (currentUser.role === "admin" && n.forRole === "admin") return { ...n, read: true };
      if (n.forRole === "user" && n.forUserId === currentUser.id) return { ...n, read: true };
      return n;
    }));
    const token = localStorage.getItem('fleetbook_token');
    fetch(`${API_BASE}/api/notifications/read-all`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } }).catch(console.error);
    showToast("อ่านทั้งหมดแล้ว", "📭");
  };

  // Initial Resource Load
  useEffect(() => {
    if (!currentUser) return; // Only fetch data when logged in
    setDataLoaded(false);
    const token = localStorage.getItem('fleetbook_token');
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    Promise.all([
      fetch(`${API_BASE}/api/cars`, { headers }).then(res => res.json()),
      fetch(`${API_BASE}/api/users`, { headers }).then(res => res.json()),
      fetch(`${API_BASE}/api/bookings`, { headers }).then(res => res.json())
    ]).then(([carsData, usersData, bookingsData]) => {
      setCars(Array.isArray(carsData) ? carsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setDataLoaded(true);
    }).catch(err => {
      console.error(err);
      setDataLoaded(true); // Ensure it unblocks even on error
    });
  }, [currentUser]);

  // Auto Logout on Idle (15 minutes)
  useEffect(() => {
    if (!currentUser) return; // Only track when logged in

    let logoutTimer;
    const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        // Perform logout actions
        localStorage.removeItem('fleetbook_token');
        setCurrentUser(null);
        setLoginForm({ email: "", password: "" });
        setMobileMenu(false);
        showToast("ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน", "😴");
      }, IDLE_TIMEOUT);
    };

    // Events to track user activity
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];

    const attachEvents = () => {
      events.forEach(e => window.addEventListener(e, resetTimer));
      resetTimer(); // Start the timer immediately
    };

    const detachEvents = () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (logoutTimer) clearTimeout(logoutTimer);
    };

    attachEvents();
    return () => detachEvents();
  }, [currentUser]);

  // Notifications Load & SSE
  useEffect(() => {
    const token = localStorage.getItem('fleetbook_token');
    if (!currentUser || !token) return;

    fetch(`${API_BASE}/api/notifications?unread=false`, { headers: { "Authorization": `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map(n => ({
            id: n.id, type: n.type, title: n.title, message: n.message, read: n.read, createdAt: n.createdAt,
            bookingId: n.bookingId, icon: n.type === "new_booking" ? "🔔" : n.type === "booking_approved" ? "✅" : "❌",
            forRole: currentUser.role, forUserId: currentUser.id
          }));
          setNotifications(prev => [...mapped, ...prev.filter(p => !mapped.find(m => m.id === p.id))]);
        }
      })
      .catch(console.error);

    const eventSource = new EventSource(`${API_BASE}/api/notifications/stream?token=${token}`);
    eventSource.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        if (notif.type === "ping") return;
        const mapped = {
          id: notif.id, type: notif.type, title: notif.title, message: notif.message, read: notif.read, createdAt: notif.createdAt,
          bookingId: notif.bookingId, icon: notif.type === "new_booking" ? "🔔" : notif.type === "booking_approved" ? "✅" : "❌",
          forRole: currentUser.role, forUserId: currentUser.id
        };
        addNotif(mapped);
        showToast(`มีการแจ้งเตือนใหม่: ${notif.title}`, mapped.icon);
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };
    return () => eventSource.close();
  }, [currentUser]);

  // Session Restore
  useEffect(() => {
    const token = localStorage.getItem('fleetbook_token');
    if (token && !currentUser) {
      fetch(`${API_BASE}/api/users/me`, { headers: { "Authorization": `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : Promise.reject("Invalid Token"))
        .then(u => {
          setCurrentUser(u);
          setPage(u.role === "admin" ? "dashboard" : "cars");
        })
        .catch(() => localStorage.removeItem('fleetbook_token'));
    }
  }, []);

  // SSO handoff from Portal Hub
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const ssoToken = searchParams.get("sso_token");
    const hubOrigin = searchParams.get("hub_origin");

    if (!ssoToken || currentUser) return undefined;

    let cancelled = false;
    setLoginError("");
    setSsoLoading(true);

    fetch(`${API_BASE}/api/users/sso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sso_token: ssoToken,
        hub_origin: hubOrigin,
      }),
    })
      .then(res => parseApiResponse(res, "SSO login failed"))
      .then(data => {
        if (cancelled) return;
        localStorage.setItem("fleetbook_token", data.token);
        setLoginSuccess(true);
        setTimeout(() => {
          if (cancelled) return;
          setCurrentUser(data.user);
          const defaultPage = data.user.role === "admin" ? "dashboard" : "cars";
          if (!window.location.hash || window.location.hash === "#") {
            window.location.hash = defaultPage;
          } else {
            setPage(window.location.hash.replace("#", ""));
          }
          clearSsoParams();
          setLoginSuccess(false);
          setSsoLoading(false);
        }, 400);
      })
      .catch(err => {
        if (cancelled) return;
        clearSsoParams();
        setSsoLoading(false);
        setLoginError(typeof err === "string" ? err : err?.message || "SSO login failed");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (!currentUser) {
    return <LoginPage form={loginForm} setForm={setLoginForm} error={loginError} isMobile={isMobile} isSuccess={loginSuccess} isSsoLoading={ssoLoading} hubLoginUrl={getHubLoginUrl()} onLogin={() => {
      fetch(`${API_BASE}/api/users/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm)
      })
        .then(res => parseApiResponse(res, "Invalid email or password"))
        .then(data => {
          localStorage.setItem('fleetbook_token', data.token);
          setLoginSuccess(true);
          setLoginError("");
          setTimeout(() => {
            setCurrentUser(data.user);
            const defaultPage = data.user.role === "admin" ? "dashboard" : "cars";
            if (!window.location.hash || window.location.hash === "#") {
              window.location.hash = defaultPage;
            } else {
              setPage(window.location.hash.replace("#", ""));
            }
            setLoginSuccess(false);
          }, 400);
        })
        .catch(err => setLoginError(typeof err === 'string' ? err : err?.message || err?.error || "Connection error"));
    }} />;
  }

  const isAdmin = currentUser.role === "admin";
  const myBookings = bookings.filter(b => b.userId === currentUser.id);

  const handleBook = (carId, data) => {
    const start = new Date(data.startDate); const end = new Date(data.endDate);
    const blocked = blackoutDates.find(bd => { const d = new Date(bd.date); return d >= start && d <= end; });
    if (blocked) { showToast(`ไม่สามารถจองได้ — ${blocked.reason}`, "🚫"); setBookingModal(null); return; }

    const token = localStorage.getItem('fleetbook_token');
    return fetch(`${API_BASE}/api/bookings`, {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ carId, startDate: data.startDate, endDate: data.endDate, purpose: data.purpose })
    })
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error || "เกิดข้อผิดพลาดในการจอง")))
      .then(newBooking => {
        setBookings(prev => [newBooking, ...prev]);
        setBookingModal(null);
        showToast("จองรถสำเร็จ! รอการอนุมัติ");
      })
      .catch(err => {
        showToast(typeof err === "string" ? err : "การจองล้มเหลว", "❌");
      });
  };

  const handleApprove = (id) => {
    fetch(`${API_BASE}/api/bookings/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
      body: JSON.stringify({ status: "approved" })
    }).then(() => {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "approved" } : b));
      showToast("อนุมัติการจองแล้ว");
    }).catch(console.error);
  };

  const handleReject = (id) => {
    fetch(`${API_BASE}/api/bookings/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
      body: JSON.stringify({ status: "rejected" })
    }).then(() => {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "rejected" } : b));
      showToast("ปฏิเสธการจองแล้ว");
    }).catch(console.error);
  };

  const handleCancel = (id) => {
    const b = bookings.find(x => x.id === id); const car = cars.find(c => c.id === b?.carId);
    setConfirm({
      title: "ยกเลิกการจอง", message: `คุณต้องการยกเลิกการจอง ${car?.name}\nวันที่ ${b?.startDate?.substring(0, 10)} ใช่หรือไม่?`,
      icon: "🚫", confirmLabel: "ยืนยันยกเลิก", confirmColor: C.danger,
      onConfirm: () => {
        fetch(`${API_BASE}/api/bookings/${id}/status`, {
          method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
          body: JSON.stringify({ status: "cancelled" }) // Need backend support for cancelled, else acts local
        }).then(() => {
          setBookings(bookings.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
          showToast("ยกเลิกการจองแล้ว", "🚫");
          setConfirm(null);
        }).catch(err => {
          // If api fails (e.g. backend doesn't support 'cancelled'), at least mock locally
          setBookings(bookings.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
          showToast("ยกเลิกการจองแล้ว (Local)", "🚫");
          setConfirm(null);
        });
      },
    });
  };

  const handleToggleCarStatus = (id, currentStatus) => {
    const newStatus = currentStatus === "available" ? "inactive" : "available";
    fetch(`${API_BASE}/api/cars/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
      body: JSON.stringify({ status: newStatus })
    }).then(res => res.json())
      .then(updatedCar => {
        setCars(prev => prev.map(c => c.id === id ? { ...c, status: updatedCar.status } : c));
        showToast(updatedCar.status === "available" ? "เปิดใช้งานรถปกติแล้ว" : "ปิดการใช้งานรถแล้ว", "🚘");
      }).catch(console.error);
  };

  const handleSaveCar = (carData) => {
    const isEdit = !!carData.id;
    const url = isEdit ? `${API_BASE}/api/cars/${carData.id}` : `${API_BASE}/api/cars`;
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
      method, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
      body: JSON.stringify(carData)
    }).then(res => res.json())
      .then(savedCar => {
        if (isEdit) {
          setCars(prev => prev.map(c => c.id === savedCar.id ? savedCar : c));
          showToast("แก้ไขข้อมูลรถสำเร็จ", "🚗");
        } else {
          setCars(prev => [...prev, savedCar]);
          showToast("เพิ่มรถคันใหม่สำเร็จ", "✨");
        }
        setCarFormModal(null);
      }).catch(err => {
        console.error(err);
        showToast(isEdit ? "เกิดข้อผิดพลาดในการแก้ไขรถ" : "เกิดข้อผิดพลาดในการเพิ่มรถ", "❌");
      });
  };

  const handleUpdateUser = (updates) => {
    // API mock since there's no update endpoint in backend
    setCurrentUser(prev => ({ ...prev, ...updates }));
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updates } : u));
    showToast("บันทึกข้อมูลเรียบร้อย", "💾");
  };

  const handleChangePassword = (oldPw, newPw) => {
    // Mock for now
    showToast("เปลี่ยนรหัสผ่านสำเร็จ (Mock)", "🔒");
    return true;
  };

  const handleAddBlackout = (date, reason) => {
    if (blackoutDates.find(b => b.date === date)) { showToast("วันนี้ถูกกำหนดไว้แล้ว", "❌"); return; }
    setBlackoutDates(prev => [...prev, { id: Date.now(), date, reason, createdBy: currentUser.id }]);
    showToast("เพิ่มวันห้ามจองแล้ว", "🚧");
  };

  const handleRemoveBlackout = (id) => {
    setConfirm({
      title: "ลบวันห้ามจอง", message: "ต้องการลบวันห้ามจองนี้ใช่หรือไม่?", icon: "🗑️", confirmLabel: "ลบ", confirmColor: C.danger,
      onConfirm: () => { setBlackoutDates(prev => prev.filter(b => b.id !== id)); showToast("ลบวันห้ามจองแล้ว", "🗑️"); setConfirm(null); },
    });
  };

  const mainMenuItems = isAdmin
    ? [{ key: "dashboard", icon: "📊", label: "แดชบอร์ด" }, { key: "cars", icon: "➕", label: "จองรถ" }, { key: "calendar", icon: "📅", label: "ปฏิทิน" }, { key: "mybookings", icon: "📋", label: "การจองของฉัน" }]
    : [{ key: "cars", icon: "🚗", label: "จองรถ" }, { key: "calendar", icon: "📅", label: "ปฏิทิน" }, { key: "mybookings", icon: "📋", label: "การจองของฉัน" }];
  const adminMenuItems = isAdmin
    ? [{ key: "bookings", icon: "📋", label: "คำขอจอง" }, { key: "users", icon: "👥", label: "ผู้ใช้งาน" }, { key: "reports", icon: "📊", label: "รายงาน" }, { key: "settings", icon: "⚙️", label: "ตั้งค่า" }]
    : [{ key: "settings", icon: "⚙️", label: "ตั้งค่า" }];
  const allNavItems = [...mainMenuItems, ...adminMenuItems];

  const nav = (p) => { window.location.hash = p; setMobileMenu(false); };
  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const handleLogout = () => { localStorage.removeItem('fleetbook_token'); setCurrentUser(null); setLoginForm({ email: "", password: "" }); setShowNotif(false); setMobileMenu(false); };

  return (
    <div style={{ fontFamily: font, display: "flex", flexDirection: "column", height: "100dvh", background: C.bg, color: C.t1, overflow: "hidden" }}>
      {/* Top Navbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "10px 16px" : "0 32px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, height: isMobile ? "auto" : 64, position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 36 }}>
          {isMobile && <button onClick={() => setMobileMenu(true)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 24, color: C.t1 }}>☰</button>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, #C9B8DB, #A7D1ED)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 16px rgba(201,184,219,0.35)", transition: "transform 0.2s" }}>
              <img src="/logo.png" alt="logo" style={{ width: 26, height: 26, objectFit: "contain" }} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = '🚗'; }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, background: "linear-gradient(135deg, #4A3D5C, #3A6B8C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{isMobile ? "" : "Polyfoam"}</span>
          </div>
          {!isMobile && (
            <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {allNavItems.map(n => (
                <button key={n.key} onClick={() => nav(n.key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none", borderRadius: 10, background: page === n.key ? "#F4F0F8" : "transparent", color: page === n.key ? "#4A3D5C" : "#8E847A", cursor: "pointer", fontSize: 14, fontWeight: page === n.key ? 600 : 500, fontFamily: font, transition: "all 0.2s", position: "relative" }} onMouseEnter={e => page !== n.key && (e.currentTarget.style.background = "#F4F0F8", e.currentTarget.style.color = "#4A3D5C")} onMouseLeave={e => page !== n.key && (e.currentTarget.style.background = "transparent", e.currentTarget.style.color = "#8E847A")}>
                  <span style={{ fontSize: 16 }}>{n.icon}</span> {n.label}
                  {n.key === "bookings" && isAdmin && pendingCount > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, background: "linear-gradient(135deg, #F0B0C4, #F5C4AB)", borderRadius: "50%", border: "2px solid white" }} />}
                </button>
              ))}
            </nav>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotifBell unread={unread} showPanel={showNotif} toggle={() => setShowNotif(!showNotif)} notifs={myNotifs} markRead={markRead} markAllRead={markAllRead} close={() => setShowNotif(false)} isMobile={isMobile} />
          {!isMobile && (
            <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 6px", borderRadius: 100, border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#C9B8DB"; e.currentTarget.style.background = "#F4F0F8"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #F5C4AB, #F0B0C4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{currentUser.name?.substring(0, 2)}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#4A433C" }}>{currentUser.name}</span>
              <span style={{ fontSize: 10, color: "#B8AFA6", marginLeft: 2 }}>▼</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowX: "hidden", overflowY: "auto", minWidth: 0 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "24px 16px 80px" : "28px 32px 60px" }}>
          {!dataLoaded ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', color: C.t3, animation: "fadeIn 0.3s" }}>
              <div style={{ width: 40, height: 40, border: `4px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>กำลังอัปเดตข้อมูล...</div>
            </div>
          ) : (<>
            {page === "dashboard" && isAdmin && <Dashboard bookings={bookings} cars={cars} users={users} m={isMobile} />}
            {page === "calendar" && <Calendar bookings={bookings} cars={cars} users={users} m={isMobile} blackouts={blackoutDates} isAdmin={isAdmin} onAddBlackout={handleAddBlackout} onRemoveBlackout={handleRemoveBlackout} />}
            {page === "cars" && <Cars cars={cars} isAdmin={isAdmin} onBook={c => setBookingModal(c)} bookings={bookings} m={isMobile} blackouts={blackoutDates} currentUser={currentUser} onToggleCarStatus={handleToggleCarStatus} onAddCarClick={() => setCarFormModal({})} onEditCarClick={c => setCarFormModal(c)} />}
            {page === "bookings" && isAdmin && <Bookings bookings={bookings} cars={cars} users={users} onApprove={handleApprove} onReject={handleReject} onCancel={handleCancel} m={isMobile} />}
            {page === "mybookings" && <MyBookings bookings={myBookings} cars={cars} onCancel={handleCancel} m={isMobile} />}
            {page === "users" && isAdmin && <UsersManage users={users} setUsers={setUsers} m={isMobile} />}
            {page === "reports" && isAdmin && <Reports bookings={bookings} cars={cars} users={users} m={isMobile} />}
            {page === "settings" && <Settings currentUser={currentUser} onUpdate={handleUpdateUser} onChangePassword={handleChangePassword} m={isMobile} isAdmin={isAdmin} blackouts={blackoutDates} onAddBlackout={handleAddBlackout} onRemoveBlackout={handleRemoveBlackout} />}
          </>)}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, animation: "fadeIn 0.15s" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setMobileMenu(false)} />
          <div style={{ position: "relative", width: 280, height: "100%", background: "#fff", display: "flex", flexDirection: "column", animation: "slideRight 0.2s", boxShadow: "0 8px 32px rgba(107,91,123,0.15)" }}>
            <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg, #4A3D5C, #3A6B8C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Polyfoam</span>
              <button onClick={() => setMobileMenu(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.t3 }}>✕</button>
            </div>
            <nav style={{ flex: 1, padding: "16px 12px" }}>
              {allNavItems.map(n => (
                <button key={n.key} onClick={() => nav(n.key)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", marginBottom: 4, border: "none", borderRadius: 12, background: page === n.key ? "#F4F0F8" : "transparent", color: page === n.key ? "#4A3D5C" : "#8E847A", cursor: "pointer", fontSize: 15, fontWeight: page === n.key ? 600 : 500, fontFamily: font, transition: "all 0.15s" }}>
                  <span style={{ fontSize: 20 }}>{n.icon}</span> {n.label}
                  {n.key === "bookings" && isAdmin && pendingCount > 0 && <span style={{ marginLeft: "auto", background: "#F0B0C4", color: "#fff", fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 10 }}>{pendingCount}</span>}
                </button>
              ))}
            </nav>
            <div style={{ padding: "20px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #F5C4AB, #F0B0C4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>{currentUser.name?.substring(0, 2)}</div>
                <div><div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{currentUser.name}</div><div style={{ fontSize: 13, color: C.t3 }}>{currentUser.department}</div></div>
              </div>
              <button onClick={handleLogout} style={{ width: "100%", padding: "14px", border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 12, background: "#FCF0F3", color: "#9C4462", cursor: "pointer", fontSize: 15, fontFamily: font, fontWeight: 700 }}>ออกจากระบบ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Overlays */}
      {carFormModal && <CarFormModal initialData={Object.keys(carFormModal).length > 0 ? carFormModal : null} onClose={() => setCarFormModal(null)} onSubmit={handleSaveCar} />}
      {bookingModal && <BookingModal car={bookingModal} onClose={() => setBookingModal(null)} onSubmit={handleBook} m={isMobile} blackouts={blackoutDates} />}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {toast && <div style={{ position: "fixed", bottom: isMobile ? 16 : 28, left: isMobile ? 16 : "auto", right: isMobile ? 16 : 28, background: "#332E29", color: "#fff", padding: "12px 20px", borderRadius: 14, fontSize: 13, fontWeight: 500, fontFamily: font, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", animation: "slideUp 0.3s", zIndex: 999, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>{toast.icon}</span> {toast.msg}</div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap');
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUpFade{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes float{0%{transform:translateY(0px)}50%{transform:translateY(-12px)}100%{transform:translateY(0px)}}
        @keyframes slideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes bellShake{0%{transform:rotate(0)}15%{transform:rotate(12deg)}30%{transform:rotate(-10deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(3deg)}100%{transform:rotate(0)}}
        @keyframes panelSlide{from{opacity:0;transform:translateY(-8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pulseRing{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.2);opacity:0}}
        input:focus,select:focus,textarea:focus{outline:none;border-color:#C9B8DB!important;box-shadow:0 0 0 3px #F4F0F8}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#E0DAD4;border-radius:3px}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}

// \u2500\u2500\u2500 Notification Bell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function NotifBell({ unread, showPanel, toggle, notifs, markRead, markAllRead, close, isMobile }) {
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) close(); }; if (showPanel) document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [showPanel, close]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${showPanel ? "#C9B8DB" : C.border}`, background: showPanel ? "#F4F0F8" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all 0.2s", position: "relative", animation: unread > 0 && !showPanel ? "bellShake 0.6s" : "none" }}>🔔
        {unread > 0 && <><span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: "#F0B0C4", borderRadius: "50%", border: "2px solid white" }} /><span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#F0B0C4", animation: "pulseRing 1.5s ease-out infinite", opacity: 0.4 }} /></>}
      </button>
      {showPanel && (
        <div style={{ position: "absolute", top: "100%", right: isMobile ? -60 : -10, marginTop: 12, width: 340, maxWidth: "90vw", background: C.card, borderRadius: 18, boxShadow: "0 8px 32px rgba(107,91,123,0.12)", border: `1px solid ${C.border}`, overflow: "hidden", zIndex: 60, animation: "panelSlide 0.2s" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 15, fontWeight: 800 }}>การแจ้งเตือน</div>{unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: "#6B5B7B", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>ทำเครื่องหมายทั้งหมด</button>}</div>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {notifs.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.t3, fontSize: 14, display: "flex", flexDirection: "column", gap: 12, fontWeight: 500 }}><span style={{ fontSize: 36 }}>📭</span>ไม่มีการแจ้งเตือนใหม่</div> :
              notifs.map(n => (<div key={n.id} onClick={() => { if (!n.read) markRead(n.id); close(); }} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 12, cursor: "pointer", background: n.read ? "transparent" : "#F4F0F8", transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.background = n.read ? "#FAF8F6" : "#E8E0F0"} onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "#F4F0F8"}>
                <div style={{ fontSize: 22, width: 44, height: 44, borderRadius: 14, background: n.read ? "#F0ECE8" : "#E8E0F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n.icon}</div>
                <div><div style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: C.t1, marginBottom: 4 }}>{n.title}</div><div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{n.message}</div><div style={{ fontSize: 11, color: C.t3, marginTop: 6, fontWeight: 500 }}>{new Date(n.createdAt).toLocaleString('th-TH')}</div></div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: "#C9B8DB", marginTop: 6, flexShrink: 0 }} />}
              </div>))}
          </div>
        </div>
      )}
    </div>
  );
}




// ─── Login (Landing Page Style) ──────────────────────────────
function LoginPage({ form, setForm, error, onLogin, isMobile, isSuccess, isSsoLoading, hubLoginUrl }) {
  return (
    <div style={{ fontFamily: font, minHeight: "100dvh", display: "flex", flexDirection: isMobile ? "column" : "row", background: "linear-gradient(135deg, #F4FAFA 0%, #E0F2F1 100%)", overflow: "hidden" }}>

      {/* Left Side: Hero Section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: isMobile ? "40px 24px" : "80px 100px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isMobile ? 30 : 60, animation: "fadeIn 0.5s" }}>
          <img src="/logo.png" alt="logo" style={{ height: isMobile ? 36 : 48, objectFit: "contain" }} onError={(e) => { e.target.style.display = 'none'; }} />
          <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: C.accent, letterSpacing: "-0.5px" }}>Polyfoam</div>
        </div>

        <div>
          <div style={{ display: "inline-block", padding: "6px 16px", background: `${C.accent}15`, color: C.accent, borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 24, border: `1px solid ${C.accent}30`, animation: "slideUpFade 0.6s ease-out both", animationDelay: "0.1s" }}>
            ✨ Smart Fleet Management
          </div>
          <h1 style={{ fontSize: isMobile ? 36 : 64, fontWeight: 800, color: C.t1, lineHeight: 1.15, margin: "0 0 24px", letterSpacing: "-1.5px", animation: "slideUpFade 0.6s ease-out both", animationDelay: "0.2s" }}>
            Corporate Car Booking<br />
            <span style={{ color: C.accent, background: `linear-gradient(90deg, ${C.accent}, #00D3B9)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Made Simple</span> & Fast
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 18, color: C.t2, lineHeight: 1.6, margin: "0 0 50px", maxWidth: 500, fontWeight: 500, animation: "slideUpFade 0.6s ease-out both", animationDelay: "0.3s" }}>
            Elevate your corporate fleet management with a system designed for ease of use, speed, and real-time transparency.
          </p>

          {!isMobile && (
            <div style={{ display: "flex", gap: 24, animation: "slideUpFade 0.6s ease-out both", animationDelay: "0.4s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "rgba(255,255,255,0.6)", borderRadius: 16, backdropFilter: "blur(10px)", border: `1px solid rgba(255,255,255,0.8)`, animation: "float 6s ease-in-out infinite" }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(0,180,159,0.1)", color: C.accent }}>🚗</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>Wide Selection</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "rgba(255,255,255,0.6)", borderRadius: 16, backdropFilter: "blur(10px)", border: `1px solid rgba(255,255,255,0.8)`, animation: "float 6s ease-in-out infinite", animationDelay: "1s" }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(0,180,159,0.1)", color: C.accent }}>⚡</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>Fast Approval</span>
              </div>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        {!isMobile && (
          <div style={{ position: "absolute", top: "20%", left: "60%", width: 500, height: 500, background: "radial-gradient(circle, rgba(0,180,159,0.08) 0%, rgba(255,255,255,0) 70%)", borderRadius: "50%", zIndex: -1, animation: "float 10s ease-in-out infinite alternate" }} />
        )}
      </div>

      {/* Right Side: Login Box */}
      <div style={{ flex: isMobile ? "none" : "0 0 45%", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "0 20px 40px" : "40px 60px 40px 0", position: "relative", zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: 440, padding: isMobile ? "32px 24px" : "50px 44px", background: "#FFFFFF", border: `1px solid rgba(255,255,255,0.9)`, borderRadius: 32, boxShadow: "0 30px 80px rgba(0,180,159,0.12), 0 0 0 1px rgba(0,180,159,0.02)", animation: "slideUpFade 0.6s ease-out both", animationDelay: "0.2s", position: "relative", overflow: "hidden" }}>

          {isSuccess || isSsoLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, animation: "fadeIn 0.3s" }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, marginBottom: 24, animation: "scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both" }}>
                {isSsoLoading ? "🔐" : "✓"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.t1, animation: "slideUpFade 0.5s ease-out both", animationDelay: "0.2s" }}>
                {isSsoLoading ? "Connecting with Hub..." : "Welcome back!"}
              </div>
              <div style={{ fontSize: 14, color: C.t2, marginTop: 8, fontWeight: 500, animation: "slideUpFade 0.5s ease-out both", animationDelay: "0.3s" }}>
                {isSsoLoading ? "Verifying your Portal access for Car Booking" : "Redirecting..."}
              </div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 36, transition: "opacity 0.3s" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: C.t1, marginBottom: 10, letterSpacing: "-0.5px" }}>Sign In</div>
                <div style={{ fontSize: 14, color: C.t2, fontWeight: 500 }}>Enter your email and password to continue</div>
              </div>
              {error && <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 14, padding: "12px 16px", marginBottom: 20, color: C.danger, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>⚠️</span> {error}</div>}
              <a
                href={hubLoginUrl}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "14px",
                  marginBottom: 16,
                  background: "#0f172a",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 800,
                  boxShadow: "0 10px 24px rgba(15,23,42,0.18)"
                }}
              >
                <span>🔐</span>
                <span>Sign in with PFS Portal Hub</span>
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 12, color: C.t3, fontWeight: 700 }}>or use local account</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 8 }}>Email Address</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" style={{ width: "100%", padding: "14px 16px", background: "#F4FAFA", border: `2px solid transparent`, borderRadius: 14, color: C.t1, fontSize: 14, fontFamily: font, transition: "0.2s" }} onFocus={e => { e.target.style.background = "#fff"; e.target.style.borderColor = C.accent; }} onBlur={e => { e.target.style.background = "#F4FAFA"; e.target.style.borderColor = "transparent"; }} />
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 8 }}>Password</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && onLogin()} style={{ width: "100%", padding: "14px 16px", background: "#F4FAFA", border: `2px solid transparent`, borderRadius: 14, color: C.t1, fontSize: 14, fontFamily: font, transition: "0.2s", letterSpacing: 2 }} onFocus={e => { e.target.style.background = "#fff"; e.target.style.borderColor = C.accent; }} onBlur={e => { e.target.style.background = "#F4FAFA"; e.target.style.borderColor = "transparent"; }} />
              </div>
              <button onClick={onLogin} style={{ width: "100%", padding: "14px", background: C.accent, color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: font, transition: "0.2s", boxShadow: `0 8px 20px ${C.accent}40` }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 24px ${C.accent}50`; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 8px 20px ${C.accent}40`; }}>Sign In</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────────────
function Settings({ currentUser, onUpdate, onChangePassword, m, isAdmin, blackouts, onAddBlackout, onRemoveBlackout }) {
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  // Preferences API state
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifLine, setNotifLine] = useState(false);

  const [bdDate, setBdDate] = useState("");
  const [bdReason, setBdReason] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/preferences`, { headers: { "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` } })
      .then(res => res.json())
      .then(pref => {
        setNotifInApp(pref.inapp ?? true);
        setNotifEmail(pref.email ?? true);
        setNotifLine(pref.line ?? false);
      }).catch(console.error);
  }, []);

  const savePreferences = (update) => {
    fetch(`${API_BASE}/api/preferences`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
      body: JSON.stringify(update)
    }).catch(console.error);
  };

  const tabs = isAdmin
    ? [{ key: "profile", label: "โปรไฟล์", icon: "👤" }, { key: "password", label: "รหัสผ่าน", icon: "🔒" }, { key: "notifications", label: "การแจ้งเตือน", icon: "🔔" }, { key: "blackouts", label: "วันห้ามจอง", icon: "🚧" }]
    : [{ key: "profile", label: "โปรไฟล์", icon: "👤" }, { key: "password", label: "รหัสผ่าน", icon: "🔒" }, { key: "notifications", label: "การแจ้งเตือน", icon: "🔔" }];

  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: font, background: "#fff" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 };

  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: m ? 20 : 26, fontWeight: 800, margin: 0 }}>⚙️ ตั้งค่า</h1><p style={{ color: C.t2, fontSize: 13, margin: "4px 0 0" }}>จัดการบัญชีและค่าส่วนตัว</p></div>

      <div style={{ display: "flex", gap: m ? 0 : 20, flexDirection: m ? "column" : "row" }}>
        <div style={{ display: "flex", flexDirection: m ? "row" : "column", gap: 4, ...(m ? { marginBottom: 16, overflowX: "auto", background: C.card, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` } : { width: 200, flexShrink: 0 }) }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: m ? "8px 14px" : "10px 14px", border: "none", borderRadius: 8,
              background: tab === t.key ? (m ? C.accent : C.accentLight) : "transparent", color: tab === t.key ? (m ? "#fff" : C.accent) : C.t2,
              fontWeight: tab === t.key ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap", transition: "all 0.15s",
            }}><span>{t.icon}</span> {t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: m ? 20 : 28, animation: "fadeIn 0.2s" }}>
          {tab === "profile" && (<>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>ข้อมูลส่วนตัว</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: 16, background: "#F8FAFC", borderRadius: 12 }}>
              <span style={{ fontSize: 48 }}>{currentUser.avatar}</span>
              <div><div style={{ fontSize: 16, fontWeight: 700 }}>{currentUser.name}</div><div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>{currentUser.email}</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div><label style={labelStyle}>ชื่อ-นามสกุล</label><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>เบอร์โทรศัพท์ (Mock)</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" style={inputStyle} /></div>
              <div><label style={labelStyle}>อีเมล</label><input value={currentUser.email} disabled style={{ ...inputStyle, background: "#F1F5F9", color: C.t3, cursor: "not-allowed" }} /></div>
              <div><label style={labelStyle}>แผนก</label><input value={currentUser.department} disabled style={{ ...inputStyle, background: "#F1F5F9", color: C.t3, cursor: "not-allowed" }} /></div>
            </div>
            <button onClick={() => onUpdate({ name, phone })} style={{ padding: "10px 28px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: font }}>💾 บันทึกข้อมูล</button>
          </>)}

          {tab === "password" && (<>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>เปลี่ยนรหัสผ่าน (Mock)</h3>
            {pwError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "8px 14px", marginBottom: 14, color: "#991B1B", fontSize: 12 }}>{pwError}</div>}
            <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelStyle}>รหัสผ่านเดิม</label><input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>รหัสผ่านใหม่</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>ยืนยันรหัสผ่านใหม่</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle} /></div>
              <button onClick={() => {
                setPwError("");
                if (!oldPw || !newPw || !confirmPw) { setPwError("กรุณากรอกข้อมูลให้ครบ"); return; }
                if (newPw.length < 4) { setPwError("รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร"); return; }
                if (newPw !== confirmPw) { setPwError("รหัสผ่านใหม่ไม่ตรงกัน"); return; }
                if (onChangePassword(oldPw, newPw)) { setOldPw(""); setNewPw(""); setConfirmPw(""); }
              }} style={{ padding: "10px 28px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", fontFamily: font }}>🔒 เปลี่ยนรหัสผ่าน</button>
            </div>
          </>)}

          {tab === "notifications" && (<>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>ตั้งค่าการแจ้งเตือน</h3>
            <p style={{ fontSize: 12, color: C.t2, margin: "0 0 20px" }}>เลือกช่องทางที่ต้องการรับการแจ้งเตือน</p>
            <div style={{ maxWidth: 400, borderTop: `1px solid ${C.border}` }}>
              <Toggle checked={notifInApp} onChange={v => { setNotifInApp(v); savePreferences({ inapp: v, email: notifEmail, line: notifLine }); }} label="🔔 แจ้งเตือนในแอป (In-App)" />
              <div style={{ borderTop: `1px solid ${C.border}` }}><Toggle checked={notifEmail} onChange={v => { setNotifEmail(v); savePreferences({ inapp: notifInApp, email: v, line: notifLine }); }} label="📧 แจ้งเตือนทางอีเมล" /></div>
              <div style={{ borderTop: `1px solid ${C.border}` }}><Toggle checked={notifLine} onChange={v => { setNotifLine(v); savePreferences({ inapp: notifInApp, email: notifEmail, line: v }); }} label="💬 แจ้งเตือนทาง LINE" /></div>
            </div>
          </>)}

          {tab === "blackouts" && isAdmin && (<>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>วันห้ามจอง (Blackout Dates) - Mock</h3>
            <p style={{ fontSize: 12, color: C.t2, margin: "0 0 20px" }}>กำหนดวันที่ไม่อนุญาตให้จองรถ เช่น วันหยุดบริษัท, วันตรวจสภาพรถ</p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 16, background: "#F8FAFC", borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ flex: "1 1 140px" }}><label style={labelStyle}>วันที่</label><input type="date" value={bdDate} onChange={e => setBdDate(e.target.value)} style={inputStyle} /></div>
              <div style={{ flex: "2 1 200px" }}><label style={labelStyle}>เหตุผล</label><input value={bdReason} onChange={e => setBdReason(e.target.value)} placeholder="เช่น วันหยุดบริษัท" style={inputStyle} /></div>
              <div style={{ alignSelf: "flex-end" }}>
                <button onClick={() => { if (bdDate && bdReason) { onAddBlackout(bdDate, bdReason); setBdDate(""); setBdReason(""); } }} disabled={!bdDate || !bdReason} style={{ padding: "10px 20px", background: bdDate && bdReason ? C.accent : "#E2E8F0", color: bdDate && bdReason ? "#fff" : C.t3, border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: bdDate && bdReason ? "pointer" : "not-allowed", fontFamily: font }}>🚧 เพิ่มวันห้ามจอง</button>
              </div>
            </div>

            {blackouts.length === 0 ? <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 13 }}>ยังไม่มีวันห้ามจอง</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {blackouts.sort((a, b) => a.date.localeCompare(b.date)).map(bd => (
                  <div key={bd.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <span style={{ fontSize: 18 }}>🚧</span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B" }}>{bd.date}</div><div style={{ fontSize: 11, color: "#B91C1C", marginTop: 1 }}>{bd.reason}</div></div>
                    <button onClick={() => onRemoveBlackout(bd.id)} style={{ background: "none", border: `1px solid #FECACA`, borderRadius: 8, padding: "5px 12px", color: "#991B1B", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>ลบ</button>
                  </div>
                ))}
              </div>
            )}
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar ────────────────────────────────────────────────
function Calendar({ bookings, cars, users, m, blackouts, isAdmin, onAddBlackout, onRemoveBlackout }) {
  const [cur, setCur] = useState(new Date(2026, 2, 1));
  const y = cur.getFullYear(), mo = cur.getMonth();
  const dim = new Date(y, mo + 1, 0).getDate(), fdow = new Date(y, mo, 1).getDay();
  const TM = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const DL = m ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] : ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const [sel, setSel] = useState(null);
  const active = bookings.filter(b => b.status === "approved" || b.status === "pending");
  const dateStr = (d) => `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const bksFor = (d) => active.filter(b => b.startDate?.substring(0, 10) <= dateStr(d) && b.endDate?.substring(0, 10) >= dateStr(d));
  const isBlackout = (d) => blackouts.some(b => b.date === dateStr(d));
  const getBlackout = (d) => blackouts.find(b => b.date === dateStr(d));
  const cells = []; for (let i = 0; i < fdow; i++) cells.push(null); for (let d = 1; d <= dim; d++) cells.push(d);
  const dayBks = sel ? bksFor(sel) : [];

  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: m ? 20 : 26, fontWeight: 800, margin: 0 }}>📅 ปฏิทินจองรถ</h1><p style={{ color: C.t2, fontSize: 13, margin: "4px 0 0" }}>กดวันที่เพื่อดูรายละเอียด · <span style={{ color: C.danger }}>🚧 = วันห้ามจอง</span></p></div>
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: m ? "14px 16px" : "16px 24px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setCur(new Date(y, mo - 1, 1))} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
          <span style={{ fontSize: m ? 16 : 18, fontWeight: 800 }}>{TM[mo]} {y + 543}</span>
          <button onClick={() => setCur(new Date(y, mo + 1, 1))} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${C.border}` }}>
          {DL.map((d, i) => <div key={i} style={{ textAlign: "center", padding: m ? "8px 2px" : "10px", fontSize: 11, fontWeight: 600, color: i === 0 || i === 6 ? C.danger : C.t2 }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} style={{ minHeight: m ? 50 : 78, background: "#FAFBFC", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }} />;
            const bks = bksFor(day), bo = isBlackout(day), today = day === new Date().getDate() && mo === new Date().getMonth() && y === new Date().getFullYear(), selected = sel === day;
            return (
              <div key={i} onClick={() => setSel(day === sel ? null : day)} style={{ minHeight: m ? 50 : 78, padding: m ? "4px 3px" : "6px 8px", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, cursor: "pointer", background: bo ? "#FEF2F2" : selected ? C.accentLight : today ? "#FFFBEB" : "#fff", transition: "background 0.15s" }}>
                <div style={{ fontSize: m ? 11 : 13, fontWeight: today ? 800 : 500, color: bo ? C.danger : today ? C.accent : C.t1, marginBottom: 2, display: "flex", gap: 3, alignItems: "center" }}>
                  {today && <span style={{ width: 5, height: 5, borderRadius: 3, background: C.accent }} />}{day} {bo && <span style={{ fontSize: 10 }}>🚧</span>}
                </div>
                {!bo && bks.slice(0, m ? 1 : 2).map(b => {
                  const car = cars.find(c => c.id === b.carId);
                  return <div key={b.id} style={{ fontSize: m ? 8 : 10, padding: m ? "1px 3px" : "2px 6px", borderRadius: 4, marginBottom: 2, background: b.status === "pending" ? "#FEF3C7" : `${car?.color}18`, color: b.status === "pending" ? "#92400E" : car?.color, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{car?.image} {m ? "" : car?.name}</div>;
                })}
              </div>
            );
          })}
        </div>
      </div>
      {sel && (
        <div style={{ marginTop: 14, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: m ? 14 : 20, animation: "scaleIn 0.2s" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{sel} {TM[mo]} {y + 543}</h3>
          {isBlackout(sel) && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 18 }}>🚧</span><div><div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B" }}>วันห้ามจอง</div><div style={{ fontSize: 11, color: "#B91C1C" }}>{getBlackout(sel)?.reason}</div></div></div>}
          {dayBks.length === 0 && !isBlackout(sel) && <div style={{ textAlign: "center", padding: 20, color: C.t3, fontSize: 13 }}>ไม่มีการจอง ✨</div>}
          {dayBks.map(b => {
            const car = cars.find(c => c.id === b.carId); const u = users.find(x => x.id === b.userId);
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#F5F5F7", border: `1px solid ${C.border}`, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{car?.image}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", color: C.t1 }}>{car?.name} <Badge status={b.status} /></div><div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>{u?.avatar} {u?.name} · {b.purpose}</div></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── My Bookings (with Cancel) ───────────────────────────────
function MyBookings({ bookings, cars, onCancel, m }) {
  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: m ? 20 : 26, fontWeight: 800, margin: 0 }}>การจองของฉัน</h1><p style={{ color: C.t2, fontSize: 13, margin: "4px 0 0" }}>ประวัติการจองรถทั้งหมด</p></div>
      {bookings.length === 0 ? <div style={{ textAlign: "center", padding: 48, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}><div style={{ fontSize: 44, marginBottom: 10 }}>🚗</div><div style={{ fontSize: 15, fontWeight: 600 }}>ยังไม่มีการจอง</div></div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bookings.map(b => {
            const car = cars.find(c => c.id === b.carId);
            const canCancel = b.status === "pending" || b.status === "approved";
            const startStr = b.startDate ? b.startDate.substring(0, 10) : "";
            const endStr = b.endDate ? b.endDate.substring(0, 10) : "";
            return (
              <div key={b.id} style={{ background: C.card, borderRadius: 12, padding: m ? "14px 16px" : "16px 20px", border: `1px solid ${C.border}`, display: "flex", flexDirection: m ? "column" : "row", gap: m ? 10 : 12, alignItems: m ? "flex-start" : "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <span style={{ fontSize: 30 }}>{car?.image}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}><span style={{ fontWeight: 700, fontSize: 14, color: C.t1 }}>{car?.name}</span><Badge status={b.status} /></div>
                    <div style={{ fontSize: 11, color: C.t2 }}>📅 {startStr}{startStr !== endStr && endStr ? ` → ${endStr}` : ""} · 📝 {b.purpose}</div>
                  </div>
                </div>
                {canCancel && <button onClick={() => onCancel(b.id)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.danger, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font, ...(m ? { width: "100%" } : {}) }}>ยกเลิกการจอง</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Admin Bookings ──────────────────────────────────────────
function Bookings({ bookings, cars, users, onApprove, onReject, onCancel, m }) {
  const [tab, setTab] = useState("pending");
  const tabs = [{ key: "pending", label: "รอดำเนินการ", count: bookings.filter(b => b.status === "pending").length }, { key: "approved", label: "อนุมัติแล้ว", count: bookings.filter(b => b.status === "approved").length }, { key: "all", label: "ทั้งหมด", count: bookings.length }];
  const filtered = tab === "all" ? bookings : bookings.filter(b => b.status === tab);
  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: m ? 20 : 26, fontWeight: 800, margin: 0 }}>คำขอจองรถ</h1><p style={{ color: C.t2, fontSize: 13, margin: "4px 0 0" }}>อนุมัติ ปฏิเสธ หรือยกเลิกคำขอจอง</p></div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.card, borderRadius: 9, padding: 3, border: `1px solid ${C.border}`, width: "fit-content" }}>
        {tabs.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", fontFamily: font, display: "flex", alignItems: "center", gap: 6, background: tab === t.key ? C.accent : "transparent", color: tab === t.key ? "#fff" : C.t2, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}<span style={{ background: tab === t.key ? "rgba(255,255,255,0.2)" : "#F1F5F9", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: tab === t.key ? "#fff" : C.t3 }}>{t.count}</span></button>))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.t3, fontSize: 13 }}>ไม่มีรายการ</div>}
        {filtered.map(b => {
          const u = users.find(x => x.id === b.userId); const car = cars.find(c => c.id === b.carId);
          const canCancel = b.status === "pending" || b.status === "approved";
          return (
            <div key={b.id} style={{ background: C.card, borderRadius: 12, padding: m ? "14px 16px" : "16px 20px", border: `1px solid ${C.border}`, display: "flex", flexDirection: m ? "column" : "row", gap: m ? 10 : 14, alignItems: m ? "flex-start" : "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <span style={{ fontSize: 28 }}>{car?.image}</span>
                <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}><span style={{ fontWeight: 700, fontSize: 14 }}>{car?.name}</span><Badge status={b.status} /></div><div style={{ fontSize: 11, color: C.t2 }}>{u?.avatar} {u?.name} · 📅 {b.startDate?.substring(0, 10)} → {b.endDate?.substring(0, 10)} · 📝 {b.purpose}</div></div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", ...(m ? { width: "100%" } : {}) }}>
                {b.status === "pending" && <>
                  <button onClick={() => onApprove(b.id)} style={{ flex: m ? 1 : "none", padding: "7px 16px", borderRadius: 7, border: "none", background: C.success, color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font }}>อนุมัติ</button>
                  <button onClick={() => onReject(b.id)} style={{ flex: m ? 1 : "none", padding: "7px 16px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.t2, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font }}>ปฏิเสธ</button>
                </>}
                {canCancel && <button onClick={() => onCancel(b.id)} style={{ flex: m ? 1 : "none", padding: "7px 16px", borderRadius: 7, border: `1px solid ${C.border}`, background: "#fff", color: C.danger, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font }}>ยกเลิก</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cars Page ───────────────────────────────────────────────
function Cars({ cars, isAdmin, onBook, bookings, m, blackouts, currentUser, onToggleCarStatus, onAddCarClick, onEditCarClick }) {
  const [filter, setFilter] = useState("all");
  const [hideUnavailable, setHideUnavailable] = useState(false);

  // เอารถคันที่ปิดไว้ไม่ใช้ออกไป (สถานะ inactive ไม่แสดงเลย)
  // ซ่อนรถที่ "ไม่พร้อมใช้งาน" (สถานะไม่ใช่ available) จากผู้ใช้ทั่วไป หรือแอดมินที่เลือกซ่อน
  const visibleCars = cars.filter(c => c.status !== "inactive" && (!isAdmin || hideUnavailable ? c.status === "available" : true));

  const filtered = filter === "all" ? visibleCars : visibleCars.filter(c => c.type === filter);
  const types = ["all", ...new Set(visibleCars.map(c => c.type))];
  const tl = { all: "ทั้งหมด", Sedan: "Sedan", SUV: "SUV", Pickup: "กระบะ", Van: "ตู้" };

  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: m ? "flex-start" : "flex-end", marginBottom: 20, flexDirection: m ? "column" : "row", gap: 10 }}>
        <div><h1 style={{ fontSize: m ? 20 : 26, fontWeight: 800, margin: 0 }}>{isAdmin ? "จัดการรถ" : "จองรถ"}</h1><p style={{ color: C.t2, fontSize: 13, margin: "4px 0 0" }}>{isAdmin ? "รายการรถทั้งหมด" : "เลือกรถที่ต้องการจอง"}</p></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 9, padding: 3, border: `1px solid ${C.border}`, overflowX: "auto" }}>
            {types.map(t => (<button key={t} onClick={() => setFilter(t)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: filter === t ? C.accent : "transparent", color: filter === t ? "#fff" : C.t2, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>{tl[t] || t}</button>))}
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.t2, cursor: "pointer", background: C.card, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                <input type="checkbox" checked={hideUnavailable} onChange={e => setHideUnavailable(e.target.checked)} style={{ cursor: "pointer", accentColor: C.t1 }} />
                ซ่อนรถที่ไม่พร้อมใช้งาน
              </label>
              <button onClick={onAddCarClick} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t1, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: font }}>+ เพิ่มรถใหม่</button>
            </div>
          )}
        </div>
      </div>
      {blackouts.length > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 16, fontSize: 12, color: "#991B1B", display: "flex", gap: 6, alignItems: "center" }}>🚧 มีวันห้ามจอง: {blackouts.map(b => b.date).join(", ")}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
        {filtered.map(car => {
          const avail = car.status === "available";
          const activeBookings = bookings.filter(b => b.carId === car.id && b.status === "approved" && new Date(b.endDate) >= new Date()).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          const nextBooking = activeBookings[0];

          const isDisabled = !avail;

          return (
            <div key={car.id} style={{ background: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, position: "relative" }}>
              <div style={{ height: m ? 90 : 110, background: "#F5F5F7", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: m ? 42 : 52, position: "relative" }}>{car.image}<div style={{ position: "absolute", top: 10, right: 10 }}><Badge status={car.status} /></div></div>
              <div style={{ padding: "14px 16px 16px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>{car.name}</div>
                <div style={{ display: "flex", gap: 14, margin: "6px 0 14px" }}><span style={{ fontSize: 11, color: C.t2 }}>🔖 {car.licensePlate}</span><span style={{ fontSize: 11, color: C.t2 }}>🏷️ {car.type}</span></div>
                {nextBooking && (
                  <div style={{ marginBottom: 14, padding: "8px 10px", background: "#F4F0F8", border: `1px solid #E8E0F0`, borderRadius: 8, fontSize: 11, color: C.t2 }}>
                    <div style={{ fontWeight: 700, color: C.t1, marginBottom: 4 }}>👤 {nextBooking.user?.name || "ผู้ใช้งาน"} จองไว้</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🗓️ {new Date(nextBooking.startDate).toLocaleDateString('th-TH')}</span>
                      <span>⏰ {new Date(nextBooking.startDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(nextBooking.endDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <button onClick={() => onEditCarClick(car)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t2, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font, transition: "0.2s" }}>
                      ✏️ แก้ไขข้อมูลรถ
                    </button>
                    <button onClick={() => onToggleCarStatus(car.id, car.status)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: car.status === "available" ? C.danger : C.t1, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font, transition: "0.2s" }}>
                      {car.status === "available" ? "ปิดใช้งานรถคันนี้" : "เปิดใช้งานปกติ"}
                    </button>
                  </div>
                )}
                <button onClick={() => !isDisabled && onBook(car)} disabled={isDisabled} style={{ width: "100%", padding: "9px", borderRadius: 9, border: "none", fontFamily: font, background: !isDisabled ? C.accent : "#F5F5F7", color: !isDisabled ? "#fff" : C.t3, fontWeight: 700, fontSize: 12, cursor: !isDisabled ? "pointer" : "not-allowed" }}>{!avail ? "ไม่พร้อมใช้งาน" : "จองรถคันนี้"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Booking Modal ─────────────────────────────────────────────
function BookingModal({ car, onClose, onSubmit, blackouts, m }) {
  const [f, setF] = useState({ startDate: "", endDate: "", purpose: "" });
  const [loading, setLoading] = useState(false);

  // Split datetime for better cross-platform input support (Windows vs Mac)
  const sd = (f.startDate || "").split("T")[0] || "";
  const st = (f.startDate || "").split("T")[1] || "";
  const ed = (f.endDate || "").split("T")[0] || "";
  const et = (f.endDate || "").split("T")[1] || "";

  const blocked = blackouts.find(bd => {
    if (!f.startDate || !f.endDate) return false;
    const start = new Date(f.startDate); const end = new Date(f.endDate);
    const d = new Date(bd.date); return d >= start && d <= end;
  });

  const handleSubmit = async () => {
    if (f.startDate && f.endDate && f.purpose && !blocked) {
      setLoading(true);
      try {
        await onSubmit(car.id, f);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: m ? "flex-end" : "center", justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: m ? "18px 18px 0 0" : 18, padding: m ? "28px 20px 32px" : "28px 32px", width: m ? "100%" : 420, maxHeight: "90vh", overflow: "auto", animation: m ? "slideUp 0.25s" : "scaleIn 0.25s", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>จองรถ</h2><button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.t3 }}>✕</button></div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "#F5F5F7", borderRadius: 10, marginBottom: 20, border: `1px solid ${C.border}` }}><span style={{ fontSize: 36 }}>{car.image}</span><div><div style={{ fontWeight: 700, fontSize: 15, color: C.t1 }}>{car.name}</div><div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>🔖 {car.licensePlate} · 🏷️ {car.type}</div></div></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>วันที่เริ่ม <span style={{ color: C.danger }}>*</span></label>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" value={sd} onChange={e => setF({ ...f, startDate: e.target.value ? `${e.target.value}T${st || "08:00"}` : "" })} style={{ flex: 3, padding: "9px 10px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font, background: "#F5F5F7", color: C.t1 }} />
              <input type="time" value={st} onChange={e => setF({ ...f, startDate: sd ? `${sd}T${e.target.value || "08:00"}` : "" })} style={{ flex: 2, padding: "9px 8px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font, background: "#F5F5F7", color: C.t1 }} disabled={!sd} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>วันที่สิ้นสุด <span style={{ color: C.danger }}>*</span></label>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" value={ed} min={sd || undefined} onChange={e => setF({ ...f, endDate: e.target.value ? `${e.target.value}T${et || "18:00"}` : "" })} style={{ flex: 3, padding: "9px 10px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font, background: "#F5F5F7", color: C.t1 }} />
              <input type="time" value={et} onChange={e => setF({ ...f, endDate: ed ? `${ed}T${e.target.value || "18:00"}` : "" })} style={{ flex: 2, padding: "9px 8px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font, background: "#F5F5F7", color: C.t1 }} disabled={!ed} />
            </div>
          </div>
        </div>

        {blocked && <div style={{ padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 14, fontSize: 12, color: "#991B1B" }}>🚧 ช่วงวันที่เลือกตรงกับวันห้ามจอง: {blocked.date} — {blocked.reason}</div>}
        <div style={{ marginBottom: 20 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>วัตถุประสงค์ <span style={{ color: C.danger }}>*</span></label><textarea value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} rows={3} placeholder="เช่น พบลูกค้า, ขนส่งสินค้า..." style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font, resize: "vertical", background: "#F5F5F7", color: C.t1 }} /></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 9, background: "#fff", color: C.t2, fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", fontFamily: font }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={!f.startDate || !f.endDate || !f.purpose || !!blocked || loading} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 9, fontFamily: font, background: f.startDate && f.endDate && f.purpose && !blocked && !loading ? C.accent : "#E5E5EA", color: f.startDate && f.endDate && f.purpose && !blocked && !loading ? "#fff" : C.t3, fontWeight: 700, fontSize: 13, cursor: f.startDate && f.endDate && f.purpose && !blocked && !loading ? "pointer" : "not-allowed" }}>{loading ? "กำลังส่งคำขอ..." : "ส่งคำขอจอง"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Users Manage ────────────────────────────────────────────
function UsersManage({ users, setUsers, m }) {
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toast, setToast] = useState(null);

  const handleAddUser = (userData) => {
    fetch(`${API_BASE}/api/users`, {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
      body: JSON.stringify(userData)
    })
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error || "ไม่สามารถเพิ่มผู้ใช้งานได้")))
      .then(newUser => {
        setUsers(prev => [...prev, newUser]);
        setModal(false);
        setToast({ msg: "เพิ่มผู้ใช้งานสำเร็จ", icon: "✅" });
        setTimeout(() => setToast(null), 3000);
      })
      .catch(err => {
        setToast({ msg: err, icon: "❌" });
        setTimeout(() => setToast(null), 3000);
      });
  };

  const handleUpdateUser = (userData) => {
    fetch(`${API_BASE}/api/users/${userData.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('fleetbook_token')}` },
      body: JSON.stringify(userData)
    })
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error || "ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้")))
      .then(updatedUser => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setEditUser(null);
        setToast({ msg: "แก้ไขข้อมูลผู้ใช้งานสำเร็จ", icon: "✅" });
        setTimeout(() => setToast(null), 3000);
      })
      .catch(err => {
        setToast({ msg: err, icon: "❌" });
        setTimeout(() => setToast(null), 3000);
      });
  };

  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: m ? "flex-start" : "flex-end", marginBottom: 20, flexDirection: m ? "column" : "row", gap: 12 }}>
        <div><h1 style={{ fontSize: m ? 20 : 26, fontWeight: 800, margin: 0 }}>👥 จัดการผู้ใช้งาน</h1><p style={{ color: C.t2, fontSize: 13, margin: "4px 0 0" }}>เพิ่มและจัดการข้อมูลผู้ใช้งานในระบบ</p></div>
        <button onClick={() => setModal(true)} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>+ เพิ่มผู้ใช้งาน</button>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: m ? 12 : 20, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
            <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}>{["ชื่อ-นามสกุล", "อีเมล / ชื่อผู้ใช้", "แผนก", "สิทธิ์", "จัดการ"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 600, fontSize: 11 }}>{h}</th>)}</tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24, background: "#F1F5F9", width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{u.avatar || "👤"}</span>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: "12px", color: C.t2 }}>
                  <div>{u.email || "-"}</div>
                  {u.username && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>👤 {u.username}</div>}
                </td>
                <td style={{ padding: "12px", color: C.t2 }}>{u.department || "-"}</td>
                <td style={{ padding: "12px" }}><span style={{ background: u.role === "admin" ? C.t1 : "#F5F5F7", color: u.role === "admin" ? "#fff" : C.t2, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: u.role !== "admin" ? `1px solid ${C.border}` : "none" }}>{u.role === "admin" ? "Admin" : "User"}</span></td>
                <td style={{ padding: "12px" }}>
                  <button onClick={() => setEditUser(u)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14 }}>✏️</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {modal && <AddUserModal onClose={() => setModal(false)} onSubmit={handleAddUser} m={m} />}
      {editUser && <AddUserModal user={editUser} onClose={() => setEditUser(null)} onSubmit={handleUpdateUser} m={m} />}
      {toast && <div style={{ position: "fixed", bottom: m ? 16 : 28, left: m ? 16 : "auto", right: m ? 16 : 28, background: C.sidebar, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500, fontFamily: font, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "slideUp 0.3s", zIndex: 999, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>{toast.icon}</span> {toast.msg}</div>}
    </div>
  );
}

// ─── Add/Edit User Modal ───────────────────────────────────────
function AddUserModal({ user, onClose, onSubmit, m }) {
  const isEdit = !!user;
  const [f, setF] = useState(user || { name: "", username: "", email: "", password: "", department: "", role: "user" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: m ? "flex-end" : "center", justifyContent: "center", zIndex: 300, animation: "fadeIn 0.2s", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: m ? "18px 18px 0 0" : 18, padding: m ? "28px 20px 32px" : "28px 32px", width: m ? "100%" : 400, maxHeight: "90vh", overflow: "auto", animation: m ? "slideUp 0.25s" : "scaleIn 0.25s", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{isEdit ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}</h2><button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.t3 }}>✕</button></div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>ชื่อ-นามสกุล <span style={{ color: C.danger }}>*</span></label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="ชื่อ นามสกุล" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: font, background: "#F5F5F7", color: C.t1 }} /></div>
          <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>ชื่อผู้ใช้งาน (Username) <span style={{ color: C.danger }}>*</span></label><input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="somchai_admin" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: font, background: "#F5F5F7", color: C.t1 }} /></div>
          <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>อีเมล (ไม่บังคับ)</label><input type="email" value={f.email || ""} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email@company.com" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: font, background: "#F5F5F7", color: C.t1 }} /></div>
          <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>รหัสผ่าน {isEdit ? "(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)" : <span style={{ color: C.danger }}>*</span>}</label><input type="password" value={f.password || ""} onChange={e => setF({ ...f, password: e.target.value })} placeholder="••••••••" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: font, background: "#F5F5F7", color: C.t1 }} /></div>
          <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>แผนก</label><input value={f.department || ""} onChange={e => setF({ ...f, department: e.target.value })} placeholder="เช่น IT, HR, Sales" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: font, background: "#F5F5F7", color: C.t1 }} /></div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.t2, marginBottom: 5 }}>สิทธิ์การใช้งาน</label>
            <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: font, background: "#F5F5F7", color: C.t1, cursor: "pointer" }}>
              <option value="user">ผู้ใช้งานทั่วไป (User)</option>
              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff", color: C.t2, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>ยกเลิก</button>
          <button onClick={() => { if (f.name && (f.email || f.username) && (isEdit || f.password)) onSubmit(f); }} disabled={!f.name || (!f.email && !f.username) || (!isEdit && !f.password)} style={{ flex: 1, padding: "12px", border: "none", borderRadius: 10, fontFamily: font, background: f.name && (f.email || f.username) && (isEdit || f.password) ? C.t1 : "#E5E5EA", color: f.name && (f.email || f.username) && (isEdit || f.password) ? "#fff" : C.t3, fontWeight: 700, fontSize: 13, cursor: f.name && (f.email || f.username) && (isEdit || f.password) ? "pointer" : "not-allowed" }}>{isEdit ? "บันทึกการแก้ไข" : "ยืนยันเพิ่มผู้ใช้งาน"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────
function Dashboard({ bookings, cars, users, m }) {
  const pastelStats = [
    { label: "รถทั้งหมด", value: cars.length, icon: "🚗", iconBg: "#F4F0F8", borderGrad: "linear-gradient(90deg, #C9B8DB, #A7D1ED)" },
    { label: "รถว่างวันนี้", value: cars.filter(c => c.status === "available").length, icon: "✅", iconBg: "#EDF8F3", borderGrad: "linear-gradient(90deg, #A8DCC8, #8BD4B8)" },
    { label: "รอการอนุมัติ", value: bookings.filter(b => b.status === "pending").length, icon: "⏳", iconBg: "#FEFAEB", borderGrad: "linear-gradient(90deg, #F5E08A, #F5C4AB)" },
    { label: "จองเดือนนี้", value: bookings.filter(b => b.status === "approved" || b.status === "completed").length, icon: "📊", iconBg: "#FCF0F3", borderGrad: "linear-gradient(90deg, #F0B0C4, #F5C4AB)" },
  ];
  const avatarGrads = ["linear-gradient(135deg,#C9B8DB,#A7D1ED)", "linear-gradient(135deg,#A8DCC8,#8BD4B8)", "linear-gradient(135deg,#F5C4AB,#F0B0C4)", "linear-gradient(135deg,#A7D1ED,#C9B8DB)"];

  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: m ? "flex-start" : "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ fontSize: m ? 22 : 28, fontWeight: 700, margin: 0, color: "#1F1B18" }}>แดชบอร์ด</h1><p style={{ color: "#8E847A", fontSize: 14, margin: "4px 0 0" }}>ภาพรวมการจองรถวันนี้ · {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: m ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 18, marginBottom: 28 }}>
        {pastelStats.map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 18, padding: 24, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden", transition: "all 0.25s", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(107,91,123,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, borderRadius: "4px 4px 0 0", background: s.borderGrad }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "#8E847A", fontWeight: 500 }}>{s.label}</span>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#1F1B18", letterSpacing: "-1px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Content Grid: Bookings Table + Car Status */}
      <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 380px", gap: 22 }}>
        {/* Today's Bookings */}
        <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #F9F7F5" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1F1B18" }}>การจองวันนี้</span>
            <span style={{ fontSize: 13, color: "#6B5B7B", fontWeight: 600, cursor: "pointer" }}>ดูทั้งหมด →</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 500 }}>
              <thead><tr>
                {["ผู้จอง", "รถ", "วันที่", "สถานะ"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 24px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8AFA6", background: "#FDFCFB", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
              </tr></thead>
              <tbody>{bookings.slice(0, 5).map((b, idx) => {
                const u = users.find(x => x.id === b.userId);
                const car = cars.find(c => c.id === b.carId);
                return (
                  <tr key={b.id} style={{ borderBottom: `1px solid #F9F7F5`, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#F4F0F8"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: avatarGrads[idx % 4], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{u?.name?.substring(0, 2)}</div>
                        <div><div style={{ fontWeight: 600, color: "#332E29" }}>{u?.name}</div><div style={{ fontSize: 12, color: "#B8AFA6" }}>{u?.department}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 24px" }}><span style={{ fontWeight: 500 }}>{car?.name}</span><br /><span style={{ fontSize: 12, color: "#B8AFA6" }}>{car?.licensePlate}</span></td>
                    <td style={{ padding: "14px 24px", color: "#6B6158", whiteSpace: "nowrap" }}>{b.startDate?.substring(0, 10)}</td>
                    <td style={{ padding: "14px 24px" }}><Badge status={b.status} /></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>

        {/* Car Status Panel */}
        <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #F9F7F5" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1F1B18" }}>สถานะรถ</span>
            <span style={{ fontSize: 13, color: "#6B5B7B", fontWeight: 600, cursor: "pointer" }}>จัดการ →</span>
          </div>
          <div style={{ padding: 14 }}>
            {cars.slice(0, 5).map((car, idx) => {
              const iconBgs = ["#F4F0F8", "#EDF8F3", "#FEF2EC", "#EBF4FB", "#FCF0F3"];
              const barColors = ["linear-gradient(90deg, #A8DCC8, #8BD4B8)", "linear-gradient(90deg, #F5E08A, #F5C4AB)", "linear-gradient(90deg, #A7D1ED, #C9B8DB)", "linear-gradient(90deg, #F0B0C4, #E08BA0)", "linear-gradient(90deg, #A8DCC8, #8BD4B8)"];
              const isAvailable = car.status === "available";
              return (
                <div key={car.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, marginBottom: 6, transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "#FAF8F6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: iconBgs[idx % 5], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{car.image}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#332E29" }}>{car.name}</div>
                    <div style={{ fontSize: 12, color: "#B8AFA6", marginTop: 2 }}>{car.licensePlate} · {STATUS_MAP[car.status]?.label || car.status}</div>
                    <div style={{ width: "100%", height: 5, background: "#F0ECE8", borderRadius: 100, marginTop: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 100, width: isAvailable ? "100%" : car.status === "booked" ? "60%" : "30%", background: barColors[idx % 5], transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                  <Badge status={car.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}



// ─── Reports ─────────────────────────────────────────────────
function Reports({ bookings, cars, users, m }) {
  const exportCSV = () => {
    const h = "ID,ผู้จอง,แผนก,รถ,ทะเบียน,วันเริ่ม,วันสิ้นสุด,วัตถุประสงค์,สถานะ\\n";
    const r = bookings.map(b => { const u = users.find(x => x.id === b.userId); const c = cars.find(x => x.id === b.carId); return `${b.id},"${u?.name}","${u?.department}","${c?.name}","${c?.licensePlate}",${b.startDate},${b.endDate},"${b.purpose}","${STATUS_MAP[b.status]?.label}"`; }).join("\\n");
    const blob = new Blob(["\uFEFF" + h + r], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `PolyfoamBooking_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const carStats = cars.map(c => { const cb = bookings.filter(b => b.carId === c.id && (b.status === "approved" || b.status === "completed")); let d = 0; cb.forEach(b => { d += Math.max(1, Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / 86400000) + 1); }); return { ...c, days: d, pct: Math.round((d / 31) * 100) }; });

  return (
    <div style={{ animation: "fadeIn 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: m ? "flex-start" : "flex-end", marginBottom: 20, flexDirection: m ? "column" : "row", gap: 12 }}>
        <div><h1 style={{ fontSize: m ? 20 : 26, fontWeight: 800, margin: 0 }}>📑 รายงาน</h1><p style={{ color: C.t2, fontSize: 13, margin: "4px 0 0" }}>สรุปข้อมูลและส่งออกรายงาน</p></div>
        <button onClick={exportCSV} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: font }}>📥 Export CSV</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: m ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
        {[{ l: "ทั้งหมด", v: bookings.length, c: C.t1 }, { l: "อนุมัติ", v: bookings.filter(b => b.status === "approved").length, c: C.t1 }, { l: "รอดำเนินการ", v: bookings.filter(b => b.status === "pending").length, c: C.t1 }, { l: "ปฏิเสธ", v: bookings.filter(b => b.status === "rejected").length, c: C.t1 }, { l: "ยกเลิก/เสร็จสิ้น", v: bookings.filter(b => b.status === "cancelled" || b.status === "completed").length, c: C.t1 }].map((s, i) => (
          <div key={i} style={{ background: "#F5F5F7", borderRadius: 12, padding: "14px 12px", border: `1px solid ${C.border}` }}><div style={{ fontSize: 11, color: C.t2, marginBottom: 5 }}>{s.l}</div><div style={{ fontSize: 26, fontWeight: 800, color: s.c }}>{s.v}</div></div>
        ))}
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: m ? 14 : 20, border: `1px solid ${C.border}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>อัตราการใช้งานรถ</h3>
        {carStats.sort((a, b) => b.pct - a.pct).map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 16, width: 24 }}>{c.image}</span>
            <div style={{ width: m ? 70 : 110, fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
            <div style={{ flex: 1, height: 10, background: "#F1F5F9", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(c.pct, 100)}%`, background: `linear-gradient(90deg,${c.color}90,${c.color})`, borderRadius: 5, transition: "width 0.6s" }} /></div>
            <div style={{ width: 45, textAlign: "right", fontSize: 12, fontWeight: 700, color: c.color }}>{c.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
