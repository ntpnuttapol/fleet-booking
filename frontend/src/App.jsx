import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────
const API_BASE = "http://localhost:3001";

// ─── Helpers ─────────────────────────────────────────────────
const STATUS_MAP = {
  pending: { label: "รอดำเนินการ", bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  approved: { label: "อนุมัติแล้ว", bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  rejected: { label: "ไม่อนุมัติ", bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  completed: { label: "เสร็จสิ้น", bg: "#E0E7FF", text: "#3730A3", dot: "#6366F1" },
  available: { label: "ว่าง", bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  booked: { label: "ถูกจอง", bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  maintenance: { label: "ซ่อมบำรุง", bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
};

const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status, bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.text, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
};

function timeAgo(dateStr) {
  const now = new Date("2026-03-07T18:00:00");
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

const formatDT = (dt) => dt ? dt.replace('T', ' ') : '';

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ─── Styles ──────────────────────────────────────────────────
const font = `'Noto Sans Thai', 'DM Sans', system-ui, sans-serif`;
const C = {
  bg: "#F8FAFC", card: "#FFFFFF", sidebar: "#0F172A", accent: "#2563EB", accentLight: "#DBEAFE",
  border: "#E2E8F0", textPrimary: "#0F172A", textSecondary: "#64748B", textMuted: "#94A3B8",
  danger: "#EF4444", success: "#10B981", warning: "#F59E0B",
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [bookingModal, setBookingModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 768;

  const showToast = (msg, icon = "✅") => { setToast({ msg, icon }); setTimeout(() => setToast(null), 3000); };

  const myNotifications = notifications.filter(n => {
    if (!currentUser) return false;
    if (currentUser.role === "admin" && n.forRole === "admin") return true;
    if (n.forRole === "user" && n.forUserId === currentUser.id) return true;
    return false;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = myNotifications.filter(n => !n.read).length;
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const token = localStorage.getItem('fleetbook_token');
    fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    }).catch(console.error);
  };
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => {
      if (currentUser.role === "admin" && n.forRole === "admin") return { ...n, read: true };
      if (n.forRole === "user" && n.forUserId === currentUser.id) return { ...n, read: true };
      return n;
    }));
    const token = localStorage.getItem('fleetbook_token');
    fetch(`${API_BASE}/api/notifications/read-all`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    }).catch(console.error);
    showToast("อ่านทั้งหมดแล้ว", "📭");
  };
  const addNotification = (notif) => setNotifications(prev => [{ ...notif, id: Date.now(), read: false, createdAt: new Date().toISOString() }, ...prev]);

  // Initial Resource Load
  useEffect(() => {
    const token = localStorage.getItem('fleetbook_token');
    // If not logged in, we shouldn't fail to load basic cars list
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    Promise.all([
      fetch(`${API_BASE}/api/cars`, { headers }).then(res => res.json()),
      fetch(`${API_BASE}/api/users`, { headers }).then(res => res.json()),
      fetch(`${API_BASE}/api/bookings`, { headers }).then(res => res.json())
    ]).then(([carsData, usersData, bookingsData]) => {
      setCars(Array.isArray(carsData) ? carsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    }).catch(console.error);
  }, []);

  // Set up Notifications
  useEffect(() => {
    const token = localStorage.getItem('fleetbook_token');
    if (!currentUser || !token) return;

    fetch(`${API_BASE}/api/notifications?unread=false`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Map backend format to frontend format
          const mapped = data.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read,
            createdAt: n.createdAt,
            bookingId: n.bookingId,
            icon: n.type === "new_booking" ? "🔔" : n.type === "booking_approved" ? "✅" : "❌",
            forRole: currentUser.role, // Simple mock fit for prototype
            forUserId: currentUser.id
          }));
          // Combine or replace mock with real notifications
          setNotifications(prev => [...mapped, ...prev.filter(p => !mapped.find(m => m.id === p.id))]);
        }
      })
      .catch(console.error);

    // SSE connection with token
    const eventSource = new EventSource(`${API_BASE}/api/notifications/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        if (notif.type === "ping") return;

        console.log("New SSE Notification:", notif);
        const mapped = {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          read: notif.read,
          createdAt: notif.createdAt,
          bookingId: notif.bookingId,
          icon: notif.type === "new_booking" ? "🔔" : notif.type === "booking_approved" ? "✅" : "❌",
          forRole: currentUser.role,
          forUserId: currentUser.id
        };
        addNotification(mapped);
        showToast(`มีการแจ้งเตือนใหม่: ${notif.title}`, mapped.icon);
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser]);

  // Session Restore
  useEffect(() => {
    const token = localStorage.getItem('fleetbook_token');
    if (token && !currentUser) {
      fetch(`${API_BASE}/api/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject("Invalid Token"))
        .then(u => {
          setCurrentUser(u);
          setPage(u.role === "admin" ? "dashboard" : "cars");
        })
        .catch(() => {
          localStorage.removeItem('fleetbook_token');
        });
    }
  }, []);

  if (!currentUser) {
    return <LoginPage form={loginForm} setForm={setLoginForm} error={loginError} isMobile={isMobile} onLogin={() => {
      fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      })
        .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง")))
        .then(data => {
          localStorage.setItem('fleetbook_token', data.token);
          setCurrentUser(data.user);
          setPage(data.user.role === "admin" ? "dashboard" : "cars");
          setLoginError("");
        })
        .catch(err => setLoginError(err));
    }} />;
  }

  const isAdmin = currentUser.role === "admin";
  const myBookings = bookings.filter(b => b.userId === currentUser.id);

  const handleBook = (carId, data) => {
    const token = localStorage.getItem('fleetbook_token');
    fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ carId, startDate: data.startDate, endDate: data.endDate, purpose: data.purpose })
    })
      .then(res => res.json())
      .then(newB => {
        setBookings(prev => [newB, ...prev]);
        setBookingModal(null);
        showToast("จองรถสำเร็จ! รอการอนุมัติ");
      })
      .catch(console.error);
  };

  const handleApprove = (id) => {
    const token = localStorage.getItem('fleetbook_token');
    fetch(`${API_BASE}/api/bookings/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ status: "approved" })
    })
      .then(() => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "approved" } : b));
        showToast("อนุมัติการจองแล้ว");
      })
      .catch(console.error);
  };

  const handleReject = (id) => {
    const token = localStorage.getItem('fleetbook_token');
    fetch(`${API_BASE}/api/bookings/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ status: "rejected" })
    })
      .then(() => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "rejected" } : b));
        showToast("ปฏิเสธการจองแล้ว");
      })
      .catch(console.error);
  };

  const navItems = isAdmin
    ? [{ key: "dashboard", icon: "📊", label: "แดชบอร์ด" }, { key: "calendar", icon: "📅", label: "ปฏิทิน" }, { key: "cars", icon: "🚗", label: "จัดการรถ" }, { key: "bookings", icon: "📋", label: "คำขอจอง" }, { key: "reports", icon: "📑", label: "รายงาน" }]
    : [{ key: "cars", icon: "🚗", label: "จองรถ" }, { key: "calendar", icon: "📅", label: "ปฏิทิน" }, { key: "mybookings", icon: "📋", label: "การจองของฉัน" }];

  const navigateTo = (p) => { setPage(p); setMobileMenuOpen(false); };

  return (
    <div style={{ fontFamily: font, display: "flex", height: "100vh", background: C.bg, color: C.textPrimary, overflow: "hidden", position: "relative" }}>
      {!isMobile && (
        <div style={{ width: 220, background: C.sidebar, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <SidebarContent navItems={navItems} page={page} onNav={navigateTo} currentUser={currentUser} bookings={bookings} isAdmin={isAdmin} onLogout={() => { localStorage.removeItem('fleetbook_token'); setCurrentUser(null); setLoginForm({ email: "", password: "" }); setShowNotifPanel(false); }} />
        </div>
      )}

      {isMobile && mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, animation: "fadeIn 0.15s ease" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileMenuOpen(false)} />
          <div style={{ position: "relative", width: 260, height: "100%", background: C.sidebar, color: "#fff", animation: "slideRight 0.2s ease", display: "flex", flexDirection: "column" }}>
            <SidebarContent navItems={navItems} page={page} onNav={navigateTo} currentUser={currentUser} bookings={bookings} isAdmin={isAdmin} onLogout={() => { localStorage.removeItem('fleetbook_token'); setCurrentUser(null); setLoginForm({ email: "", password: "" }); setMobileMenuOpen(false); }} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <TopBar unreadCount={unreadCount} showPanel={showNotifPanel} onTogglePanel={() => setShowNotifPanel(!showNotifPanel)} notifications={myNotifications} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} onClose={() => setShowNotifPanel(false)} isMobile={isMobile} onMenuToggle={() => setMobileMenuOpen(true)}
          onNavigate={(notif) => { if (isAdmin && notif.type === "new_booking") setPage("bookings"); else setPage("mybookings"); markAsRead(notif.id); setShowNotifPanel(false); }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "12px 16px 80px" : "12px 36px 32px" }}>
          {page === "dashboard" && isAdmin && <AdminDashboard bookings={bookings} cars={cars} users={users} isMobile={isMobile} />}
          {page === "calendar" && <CalendarPage bookings={bookings} cars={cars} users={users} isMobile={isMobile} />}
          {page === "cars" && <CarsPage cars={cars} isAdmin={isAdmin} onBook={c => setBookingModal(c)} bookings={bookings} isMobile={isMobile} />}
          {page === "bookings" && isAdmin && <BookingsPage bookings={bookings} cars={cars} users={users} onApprove={handleApprove} onReject={handleReject} isMobile={isMobile} />}
          {page === "mybookings" && !isAdmin && <MyBookings bookings={myBookings} cars={cars} isMobile={isMobile} />}
          {page === "reports" && isAdmin && <ReportsPage bookings={bookings} cars={cars} users={users} isMobile={isMobile} />}
        </div>

        {bookingModal && <BookingModal car={bookingModal} onClose={() => setBookingModal(null)} onSubmit={handleBook} isMobile={isMobile} />}
        {toast && (
          <div style={{ position: "fixed", bottom: isMobile ? 16 : 28, left: isMobile ? 16 : "auto", right: isMobile ? 16 : 28, background: C.sidebar, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500, fontFamily: font, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease", zIndex: 999, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{toast.icon}</span> {toast.msg}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes slideRight { from { transform:translateX(-100%); } to { transform:translateX(0); } }
        @keyframes bellShake { 0%{transform:rotate(0)} 15%{transform:rotate(12deg)} 30%{transform:rotate(-10deg)} 45%{transform:rotate(8deg)} 60%{transform:rotate(-6deg)} 75%{transform:rotate(3deg)} 100%{transform:rotate(0)} }
        @keyframes notifSlideIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }
        @keyframes panelSlide { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pulseRing { 0% { transform:scale(0.8); opacity:1; } 100% { transform:scale(2.2); opacity:0; } }
        input:focus, select:focus, textarea:focus { outline: none; border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentLight}; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ─── Sidebar Content ─────────────────────────────────────────
function SidebarContent({ navItems, page, onNav, currentUser, bookings, isAdmin, onLogout }) {
  return (
    <>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🏢</span> FleetBook
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3, letterSpacing: 1, textTransform: "uppercase" }}>ระบบจองรถบริษัท</div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => onNav(n.key)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", marginBottom: 3, border: "none", borderRadius: 9,
            background: page === n.key ? "rgba(255,255,255,0.1)" : "transparent", color: page === n.key ? "#fff" : C.textMuted,
            cursor: "pointer", fontSize: 13, fontWeight: page === n.key ? 600 : 400, fontFamily: font, transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span> {n.label}
            {n.key === "bookings" && isAdmin && bookings.filter(b => b.status === "pending").length > 0 && (
              <span style={{ marginLeft: "auto", background: C.danger, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>
                {bookings.filter(b => b.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px" }}>
          <span style={{ fontSize: 24 }}>{currentUser.avatar}</span>
          <div><div style={{ fontSize: 12, fontWeight: 600 }}>{currentUser.name}</div><div style={{ fontSize: 10, color: C.textMuted }}>{currentUser.department}</div></div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", marginTop: 8, padding: "7px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 11, fontFamily: font }}>ออกจากระบบ</button>
      </div>
    </>
  );
}

// ─── Top Bar ─────────────────────────────────────────────────
function TopBar({ unreadCount, showPanel, onTogglePanel, notifications, onMarkAsRead, onMarkAllAsRead, onClose, onNavigate, isMobile, onMenuToggle }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    if (showPanel) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPanel, onClose]);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "12px 16px 0" : "14px 36px 0", position: "sticky", top: 0, zIndex: 50 }}>
      {isMobile ? (
        <button onClick={onMenuToggle} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>☰</button>
      ) : <div />}
      <div ref={panelRef} style={{ position: "relative" }}>
        <button onClick={onTogglePanel} style={{
          position: "relative", background: showPanel ? C.accentLight : C.card, border: `1px solid ${showPanel ? C.accent + "40" : C.border}`,
          borderRadius: 10, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          transition: "all 0.2s", boxShadow: showPanel ? `0 0 0 3px ${C.accentLight}` : "0 1px 3px rgba(0,0,0,0.06)",
          animation: unreadCount > 0 && !showPanel ? "bellShake 0.6s ease" : "none",
        }}>
          🔔
          {unreadCount > 0 && (
            <>
              <span style={{ position: "absolute", top: -4, right: -4, background: C.danger, color: "#fff", fontSize: 9, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>{unreadCount}</span>
              <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, background: C.danger, animation: "pulseRing 1.5s ease-out infinite", opacity: 0.4 }} />
            </>
          )}
        </button>
        {showPanel && (
          <div style={{ position: "absolute", top: 48, right: 0, width: isMobile ? "calc(100vw - 32px)" : 380, maxHeight: 480, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", animation: "panelSlide 0.2s ease", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>การแจ้งเตือน</span>
                {unreadCount > 0 && <span style={{ background: C.accentLight, color: C.accent, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{unreadCount} ใหม่</span>}
              </div>
              {unreadCount > 0 && <button onClick={onMarkAllAsRead} style={{ background: "none", border: "none", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>อ่านทั้งหมด</button>}
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: C.textMuted }}><div style={{ fontSize: 32 }}>📭</div><div style={{ fontSize: 12, marginTop: 6 }}>ไม่มีการแจ้งเตือน</div></div>
              ) : notifications.map((n, i) => (
                <div key={n.id} onClick={() => onNavigate(n)} style={{
                  display: "flex", gap: 12, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s",
                  background: n.read ? "transparent" : `${C.accent}05`, borderBottom: `1px solid ${C.border}`,
                  borderLeft: n.read ? "3px solid transparent" : `3px solid ${C.accent}`, animation: `notifSlideIn 0.2s ease ${i * 0.03}s both`,
                }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : `${C.accent}05`}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: n.type === "new_booking" ? "#FEF3C7" : n.type === "booking_approved" ? "#D1FAE5" : "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: n.read ? 500 : 700 }}>{n.title}</span>
                      <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0, marginLeft: 6 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</div>
                  </div>
                  {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, flexShrink: 0, marginTop: 5 }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Login ───────────────────────────────────────────────────
function LoginPage({ form, setForm, error, onLogin, isMobile }) {
  return (
    <div style={{ fontFamily: font, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)`, padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, padding: isMobile ? "36px 24px" : "44px 36px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, backdropFilter: "blur(20px)", animation: "scaleIn 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🏢</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>FleetBook</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5 }}>ระบบจองรถบริษัท</div>
        </div>
        {error && <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 14, color: "#FCA5A5", fontSize: 12 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>อีเมล</label>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: font }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 5 }}>รหัสผ่าน</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••" onKeyDown={e => e.key === "Enter" && onLogin()} style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: font }} />
        </div>
        <button onClick={onLogin} style={{ width: "100%", padding: "12px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font }}>เข้าสู่ระบบ</button>
        <div style={{ marginTop: 24, padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>ทดลองใช้งาน:</div>
          <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.8 }}>👤 somchai@company.com / 1234<br />👩‍💼 somying@company.com / 1234</div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Page ───────────────────────────────────────────
function CalendarPage({ bookings, cars, users, isMobile }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const DAY_LABELS = isMobile ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] : ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const [selectedDay, setSelectedDay] = useState(null);

  const activeBookings = bookings.filter(b => b.status === "approved" || b.status === "pending");

  function getBookingsForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return activeBookings.filter(b => b.startDate.substring(0, 10) <= dateStr && b.endDate.substring(0, 10) >= dateStr);
  }

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: 0 }}>📅 ปฏิทินจองรถ</h1>
        <p style={{ color: C.textSecondary, fontSize: 13, margin: "4px 0 0" }}>ดูตารางการจองรถทั้งเดือน — กดวันที่เพื่อดูรายละเอียด</p>
      </div>

      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "14px 16px" : "16px 24px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
          <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800 }}>{THAI_MONTHS[month]} {year + 543}</span>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${C.border}` }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ textAlign: "center", padding: isMobile ? "8px 2px" : "10px", fontSize: 11, fontWeight: 600, color: i === 0 || i === 6 ? C.danger : C.textSecondary }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} style={{ minHeight: isMobile ? 50 : 78, background: "#FAFBFC", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }} />;
            const dayBks = getBookingsForDay(day);
            const isToday = day === 7 && month === 2 && year === 2026;
            const isSelected = selectedDay === day;
            return (
              <div key={i} onClick={() => setSelectedDay(day === selectedDay ? null : day)} style={{
                minHeight: isMobile ? 50 : 78, padding: isMobile ? "4px 3px" : "6px 8px", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
                cursor: "pointer", background: isSelected ? C.accentLight : isToday ? "#FFFBEB" : "#fff", transition: "background 0.15s",
              }}>
                <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: isToday ? 800 : 500, color: isToday ? C.accent : C.textPrimary, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
                  {isToday && <span style={{ width: 5, height: 5, borderRadius: 3, background: C.accent }} />}
                  {day}
                </div>
                {dayBks.slice(0, isMobile ? 1 : 2).map(b => {
                  const car = cars.find(c => c.id === b.carId);
                  return (
                    <div key={b.id} style={{
                      fontSize: isMobile ? 8 : 10, padding: isMobile ? "1px 3px" : "2px 6px", borderRadius: 4, marginBottom: 2,
                      background: b.status === "pending" ? "#FEF3C7" : `${car?.color}18`,
                      color: b.status === "pending" ? "#92400E" : car?.color,
                      fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {car?.image} {isMobile ? "" : car?.name}
                    </div>
                  );
                })}
                {dayBks.length > (isMobile ? 1 : 2) && <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600 }}>+{dayBks.length - (isMobile ? 1 : 2)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div style={{ marginTop: 14, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: isMobile ? 14 : 20, animation: "scaleIn 0.2s ease" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
            {selectedDay} {THAI_MONTHS[month]} — {dayBookings.length === 0 ? "ว่าง" : `${dayBookings.length} การจอง`}
          </h3>
          {dayBookings.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: C.textMuted, fontSize: 13 }}>ไม่มีการจองในวันนี้ ✨</div>
          ) : dayBookings.map(b => {
            const car = cars.find(c => c.id === b.carId);
            const user = users.find(u => u.id === b.userId);
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: `${car?.color}06`, border: `1px solid ${car?.color}15`, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{car?.image}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{car?.name} <Badge status={b.status} /></div>
                  <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{user?.avatar} {user?.name} · {b.purpose}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        {[{ label: "อนุมัติแล้ว", color: C.accentLight }, { label: "รอดำเนินการ", color: "#FEF3C7" }, { label: "วันนี้", color: "#FFFBEB" }].map((l, i) => (
          <span key={i} style={{ fontSize: 11, color: C.textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, border: `1px solid ${C.border}` }} /> {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Reports / Export ────────────────────────────────────────
function ReportsPage({ bookings, cars, users, isMobile }) {
  const [exporting, setExporting] = useState(false);

  const stats = {
    total: bookings.length,
    approved: bookings.filter(b => b.status === "approved").length,
    pending: bookings.filter(b => b.status === "pending").length,
    rejected: bookings.filter(b => b.status === "rejected").length,
    completed: bookings.filter(b => b.status === "completed").length,
  };

  const carStats = cars.map(car => {
    const cb = bookings.filter(b => b.carId === car.id && (b.status === "approved" || b.status === "completed"));
    let totalDays = 0;
    cb.forEach(b => { const s = new Date(b.startDate); const e = new Date(b.endDate); totalDays += Math.max(1, Math.ceil((e - s) / 86400000) + 1); });
    return { ...car, bookingCount: cb.length, totalDays, utilization: Math.round((totalDays / 31) * 100) };
  });

  const deptMap = {};
  bookings.forEach(b => {
    const user = users.find(u => u.id === b.userId);
    const dept = user?.department || "อื่นๆ";
    if (!deptMap[dept]) deptMap[dept] = { count: 0, days: 0 };
    deptMap[dept].count++;
    const s = new Date(b.startDate); const e = new Date(b.endDate);
    deptMap[dept].days += Math.max(1, Math.ceil((e - s) / 86400000) + 1);
  });

  const exportCSV = () => {
    setExporting(true);
    const header = "ID,ผู้จอง,แผนก,รถ,ทะเบียน,วันเริ่ม,วันสิ้นสุด,วัตถุประสงค์,สถานะ\n";
    const rows = bookings.map(b => {
      const user = users.find(u => u.id === b.userId);
      const car = cars.find(c => c.id === b.carId);
      return `${b.id},"${user?.name}","${user?.department}","${car?.name}","${car?.licensePlate}",${b.startDate},${b.endDate},"${b.purpose}","${STATUS_MAP[b.status]?.label || b.status}"`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `FleetBook_Report_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 1000);
  };

  const exportJSON = () => {
    const data = bookings.map(b => {
      const user = users.find(u => u.id === b.userId);
      const car = cars.find(c => c.id === b.carId);
      return { id: b.id, user: user?.name, department: user?.department, car: car?.name, licensePlate: car?.licensePlate, startDate: b.startDate, endDate: b.endDate, purpose: b.purpose, status: STATUS_MAP[b.status]?.label || b.status };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `FleetBook_Report_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", marginBottom: 20, flexDirection: isMobile ? "column" : "row", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: 0 }}>📑 รายงาน</h1>
          <p style={{ color: C.textSecondary, fontSize: 13, margin: "4px 0 0" }}>สรุปข้อมูลและส่งออกรายงาน</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportCSV} disabled={exporting} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6, opacity: exporting ? 0.7 : 1 }}>
            📥 Export CSV
          </button>
          <button onClick={exportJSON} style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6 }}>
            📄 Export JSON
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {[{ label: "ทั้งหมด", value: stats.total, color: "#3B82F6" }, { label: "อนุมัติ", value: stats.approved, color: "#10B981" }, { label: "รอดำเนินการ", value: stats.pending, color: "#F59E0B" }, { label: "ปฏิเสธ", value: stats.rejected, color: "#EF4444" }, { label: "เสร็จสิ้น", value: stats.completed, color: "#6366F1" }].map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 12, padding: "14px 12px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: isMobile ? 14 : 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>อัตราการใช้งานรถ (เดือนนี้)</h3>
        {carStats.sort((a, b) => b.utilization - a.utilization).map(car => (
          <div key={car.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 16, width: 24 }}>{car.image}</span>
            <div style={{ width: isMobile ? 70 : 110, fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{car.name}</div>
            <div style={{ flex: 1, height: 10, background: "#F1F5F9", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${car.utilization}%`, background: `linear-gradient(90deg, ${car.color}90, ${car.color})`, borderRadius: 5, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ width: 45, textAlign: "right", fontSize: 12, fontWeight: 700, color: car.color }}>{car.utilization}%</div>
            <div style={{ width: 55, textAlign: "right", fontSize: 11, color: C.textSecondary }}>{car.totalDays} วัน</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: isMobile ? 14 : 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>การใช้งานแยกตามแผนก</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          {Object.entries(deptMap).map(([dept, data]) => (
            <div key={dept} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#F8FAFC", border: `1px solid ${C.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏢</div>
              <div><div style={{ fontSize: 13, fontWeight: 700 }}>{dept}</div><div style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }}>{data.count} ครั้ง · {data.days} วัน</div></div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>รายการจองทั้งหมด</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {["#", "ผู้จอง", "แผนก", "รถ", "วันที่", "วัตถุประสงค์", "สถานะ"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.textSecondary, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const user = users.find(u => u.id === b.userId);
                const car = cars.find(c => c.id === b.carId);
                return (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px", color: C.textMuted }}>{b.id}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{user?.avatar} {user?.name}</td>
                    <td style={{ padding: "10px 12px", color: C.textSecondary }}>{user?.department}</td>
                    <td style={{ padding: "10px 12px" }}>{car?.image} {car?.name}</td>
                    <td style={{ padding: "10px 12px", color: C.textSecondary, whiteSpace: "nowrap" }}>{formatDT(b.startDate)}{b.startDate !== b.endDate ? ` → ${formatDT(b.endDate)}` : ""}</td>
                    <td style={{ padding: "10px 12px", color: C.textSecondary, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.purpose}</td>
                    <td style={{ padding: "10px 12px" }}><Badge status={b.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────
function AdminDashboard({ bookings, cars, users, isMobile }) {
  const stats = [
    { label: "รถทั้งหมด", value: cars.length, icon: "🚗", color: "#3B82F6", bg: "#EFF6FF" },
    { label: "รถว่าง", value: cars.filter(c => c.status === "available").length, icon: "✅", color: "#10B981", bg: "#ECFDF5" },
    { label: "รอดำเนินการ", value: bookings.filter(b => b.status === "pending").length, icon: "⏳", color: "#F59E0B", bg: "#FFFBEB" },
    { label: "จองเดือนนี้", value: bookings.filter(b => b.status === "approved" || b.status === "completed").length, icon: "📈", color: "#8B5CF6", bg: "#F5F3FF" },
  ];
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: 0 }}>แดชบอร์ด</h1><p style={{ color: C.textSecondary, fontSize: 13, margin: "4px 0 0" }}>ภาพรวมระบบจองรถบริษัท</p></div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 12, padding: isMobile ? "16px 12px" : "20px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500, marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div></div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: isMobile ? 14 : 20, border: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>สถานะรถ</h3>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {[{ label: "ว่าง", count: cars.filter(c => c.status === "available").length, color: "#10B981" }, { label: "ถูกจอง", count: cars.filter(c => c.status === "booked").length, color: "#F59E0B" }, { label: "ซ่อมบำรุง", count: cars.filter(c => c.status === "maintenance").length, color: "#EF4444" }].map((item, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", border: `3px solid ${item.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: item.color, marginBottom: 6, background: `${item.color}10` }}>{item.count}</div>
                <div style={{ fontSize: 11, color: C.textSecondary }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 14, padding: isMobile ? 14 : 20, border: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>สถิติการจอง</h3>
          {[{ label: "อนุมัติ", count: bookings.filter(b => b.status === "approved").length, color: "#10B981" }, { label: "รอดำเนินการ", count: bookings.filter(b => b.status === "pending").length, color: "#F59E0B" }, { label: "ปฏิเสธ", count: bookings.filter(b => b.status === "rejected").length, color: "#EF4444" }, { label: "เสร็จสิ้น", count: bookings.filter(b => b.status === "completed").length, color: "#6366F1" }].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 80, fontSize: 11, color: C.textSecondary }}>{item.label}</div>
              <div style={{ flex: 1, height: 7, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${(item.count / Math.max(bookings.length, 1)) * 100}%`, background: item.color, borderRadius: 4 }} /></div>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.color, width: 18 }}>{item.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: isMobile ? 12 : 20, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>การจองล่าสุด</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 450 }}>
            <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}>{["ผู้จอง", "รถ", "วันที่", "สถานะ"].map(h => (<th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.textSecondary, fontWeight: 600, fontSize: 10 }}>{h}</th>))}</tr></thead>
            <tbody>
              {bookings.slice(0, 5).map(b => {
                const user = users.find(u => u.id === b.userId); const car = cars.find(c => c.id === b.carId); return (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span>{user?.avatar}</span><div><div style={{ fontWeight: 600 }}>{user?.name}</div><div style={{ fontSize: 10, color: C.textMuted }}>{user?.department}</div></div></div></td>
                    <td style={{ padding: "10px" }}>{car?.image} {car?.name}</td>
                    <td style={{ padding: "10px", color: C.textSecondary, whiteSpace: "nowrap" }}>{formatDT(b.startDate)}</td>
                    <td style={{ padding: "10px" }}><Badge status={b.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Cars Page ───────────────────────────────────────────────
function CarsPage({ cars, isAdmin, onBook, bookings, isMobile }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? cars : cars.filter(c => c.type === filter);
  const types = ["all", ...new Set(cars.map(c => c.type))];
  const typeLabels = { all: "ทั้งหมด", Sedan: "Sedan", SUV: "SUV", Pickup: "กระบะ", Van: "ตู้" };
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", marginBottom: 20, flexDirection: isMobile ? "column" : "row", gap: 10 }}>
        <div><h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: 0 }}>{isAdmin ? "จัดการรถ" : "จองรถ"}</h1><p style={{ color: C.textSecondary, fontSize: 13, margin: "4px 0 0" }}>{isAdmin ? "รายการรถทั้งหมด" : "เลือกรถที่ต้องการจอง"}</p></div>
        <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 9, padding: 3, border: `1px solid ${C.border}`, overflowX: "auto" }}>
          {types.map(t => (<button key={t} onClick={() => setFilter(t)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: filter === t ? C.accent : "transparent", color: filter === t ? "#fff" : C.textSecondary, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>{typeLabels[t] || t}</button>))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
        {filtered.map(car => {
          const isAvailable = car.status === "available";
          const activeBooking = bookings.find(b => b.carId === car.id && (b.status === "approved" || b.status === "pending"));
          return (
            <div key={car.id} style={{ background: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div style={{ height: isMobile ? 90 : 110, background: `linear-gradient(135deg, ${car.color}15, ${car.color}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 42 : 52, position: "relative" }}>
                {car.image}<div style={{ position: "absolute", top: 10, right: 10 }}><Badge status={car.status} /></div>
              </div>
              <div style={{ padding: "14px 16px 16px" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{car.name}</div>
                <div style={{ display: "flex", gap: 14, margin: "6px 0 14px" }}><span style={{ fontSize: 11, color: C.textSecondary }}>🔖 {car.licensePlate}</span><span style={{ fontSize: 11, color: C.textSecondary }}>🏷️ {car.type}</span></div>
                {!isAdmin && (
                  <button onClick={() => isAvailable && !activeBooking && onBook(car)} disabled={!isAvailable || !!activeBooking} style={{
                    width: "100%", padding: "9px", borderRadius: 9, border: "none", fontFamily: font,
                    background: isAvailable && !activeBooking ? C.accent : "#E2E8F0", color: isAvailable && !activeBooking ? "#fff" : C.textMuted,
                    fontWeight: 600, fontSize: 12, cursor: isAvailable && !activeBooking ? "pointer" : "not-allowed",
                  }}>{!isAvailable ? "ไม่พร้อมใช้งาน" : activeBooking ? "ถูกจองแล้ว" : "จองรถคันนี้"}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Booking Modal ───────────────────────────────────────────
function BookingModal({ car, onClose, onSubmit, isMobile }) {
  const [form, setForm] = useState({ startDate: "", endDate: "", purpose: "" });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s ease", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: isMobile ? "18px 18px 0 0" : 18, padding: isMobile ? "28px 20px 32px" : "28px 32px", width: isMobile ? "100%" : 420, maxHeight: "90vh", overflow: "auto", animation: isMobile ? "slideUp 0.25s ease" : "scaleIn 0.25s ease", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>จองรถ</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textMuted }}>✕</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: `${car.color}08`, borderRadius: 10, marginBottom: 20, border: `1px solid ${car.color}20` }}>
          <span style={{ fontSize: 36 }}>{car.image}</span>
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>{car.name}</div><div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>🔖 {car.licensePlate} · 🏷️ {car.type}</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>วันที่-เวลาเริ่ม</label><input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ width: "100%", padding: "9px 10px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font }} /></div>
          <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>วันที่-เวลาสิ้นสุด</label><input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={{ width: "100%", padding: "9px 10px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font }} /></div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>วัตถุประสงค์</label>
          <textarea value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} rows={3} placeholder="เช่น พบลูกค้า, ขนส่งสินค้า..." style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: font, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 9, background: "transparent", color: C.textSecondary, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>ยกเลิก</button>
          <button onClick={() => { if (form.startDate && form.endDate && form.purpose) onSubmit(car.id, form); }} disabled={!form.startDate || !form.endDate || !form.purpose} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 9, fontFamily: font, background: form.startDate && form.endDate && form.purpose ? C.accent : "#E2E8F0", color: form.startDate && form.endDate && form.purpose ? "#fff" : C.textMuted, fontWeight: 700, fontSize: 13, cursor: form.startDate && form.endDate && form.purpose ? "pointer" : "not-allowed" }}>ส่งคำขอจอง</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bookings Management (Admin) ─────────────────────────────
function BookingsPage({ bookings, cars, users, onApprove, onReject, isMobile }) {
  const [tab, setTab] = useState("pending");
  const tabs = [{ key: "pending", label: "รอดำเนินการ", count: bookings.filter(b => b.status === "pending").length }, { key: "approved", label: "อนุมัติแล้ว", count: bookings.filter(b => b.status === "approved").length }, { key: "all", label: "ทั้งหมด", count: bookings.length }];
  const filtered = tab === "all" ? bookings : bookings.filter(b => b.status === tab);
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: 0 }}>คำขอจองรถ</h1><p style={{ color: C.textSecondary, fontSize: 13, margin: "4px 0 0" }}>อนุมัติหรือปฏิเสธคำขอจองรถ</p></div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.card, borderRadius: 9, padding: 3, border: `1px solid ${C.border}`, width: "fit-content", overflowX: "auto" }}>
        {tabs.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", fontFamily: font, display: "flex", alignItems: "center", gap: 6, background: tab === t.key ? C.accent : "transparent", color: tab === t.key ? "#fff" : C.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}<span style={{ background: tab === t.key ? "rgba(255,255,255,0.2)" : "#F1F5F9", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: tab === t.key ? "#fff" : C.textMuted }}>{t.count}</span></button>))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>ไม่มีรายการ</div>}
        {filtered.map(b => {
          const user = users.find(u => u.id === b.userId); const car = cars.find(c => c.id === b.carId);
          return (
            <div key={b.id} style={{ background: C.card, borderRadius: 12, padding: isMobile ? "14px 16px" : "16px 20px", border: `1px solid ${C.border}`, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: isMobile ? 10 : 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <span style={{ fontSize: 28 }}>{car?.image}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}><span style={{ fontWeight: 700, fontSize: 14 }}>{car?.name}</span><Badge status={b.status} /></div>
                  <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.7 }}>{user?.avatar} {user?.name} · 📅 {formatDT(b.startDate)} → {formatDT(b.endDate)} · 📝 {b.purpose}</div>
                </div>
              </div>
              {b.status === "pending" && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0, ...(isMobile ? { width: "100%" } : {}) }}>
                  <button onClick={() => onApprove(b.id)} style={{ flex: isMobile ? 1 : "none", padding: "7px 18px", borderRadius: 7, border: "none", background: "#10B981", color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font }}>อนุมัติ</button>
                  <button onClick={() => onReject(b.id)} style={{ flex: isMobile ? 1 : "none", padding: "7px 18px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.textSecondary, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: font }}>ปฏิเสธ</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── My Bookings (User) ─────────────────────────────────────
function MyBookings({ bookings, cars, isMobile }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: 0 }}>การจองของฉัน</h1><p style={{ color: C.textSecondary, fontSize: 13, margin: "4px 0 0" }}>ประวัติการจองรถทั้งหมด</p></div>
      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}><div style={{ fontSize: 44, marginBottom: 10 }}>🚗</div><div style={{ fontSize: 15, fontWeight: 600 }}>ยังไม่มีการจอง</div><div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>เริ่มจองรถได้ที่หน้า "จองรถ"</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bookings.map(b => {
            const car = cars.find(c => c.id === b.carId);
            return (
              <div key={b.id} style={{ background: C.card, borderRadius: 12, padding: isMobile ? "14px 16px" : "16px 20px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 30 }}>{car?.image}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}><span style={{ fontWeight: 700, fontSize: 14 }}>{car?.name}</span><span style={{ fontSize: 11, color: C.textMuted }}>🔖 {car?.licensePlate}</span><Badge status={b.status} /></div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>📅 {formatDT(b.startDate)}{b.startDate !== b.endDate ? ` → ${formatDT(b.endDate)}` : ""} · 📝 {b.purpose}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
