# FleetBook — แผน Backend ระบบแจ้งเตือน

## ภาพรวม Architecture

```
พนักงานจองรถ → Backend API → Notification Service ─┬─→ In-App (WebSocket/SSE)
                                                    ├─→ Email (Resend/SendGrid)
                                                    └─→ LINE Notify API
```

ระบบแจ้งเตือนถูกออกแบบเป็น **Event-Driven Architecture** โดยแยก Notification Service ออกเป็น module อิสระ เมื่อเกิด event (จองรถ, อนุมัติ, ปฏิเสธ) ระบบจะ dispatch ไปทุกช่องทางที่ user เปิดไว้พร้อมกัน


## 1. In-App Notification

วิธีที่เร็วที่สุดสำหรับ admin ที่เปิดเว็บอยู่แล้ว

### Database Schema

```sql
CREATE TABLE notifications (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id),
  type          VARCHAR(50) NOT NULL,       -- 'new_booking', 'booking_approved', 'booking_rejected'
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  booking_id    INT REFERENCES bookings(id),
  channels      TEXT[] DEFAULT '{inapp}',   -- ช่องทางที่ส่งไปแล้ว
  read          BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user_read ON notifications(user_id, read);
```

### Real-time Delivery: WebSocket หรือ SSE

**แนะนำ: Server-Sent Events (SSE)** เพราะง่ายกว่า WebSocket สำหรับ notification แบบทางเดียว

```javascript
// Backend — SSE endpoint (Node.js/Express)
app.get('/api/notifications/stream', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userId = req.user.id;

  // Listen for new notifications
  notificationEmitter.on(`notify:${userId}`, (notification) => {
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  });

  req.on('close', () => {
    notificationEmitter.removeAllListeners(`notify:${userId}`);
  });
});
```

```javascript
// Frontend — Subscribe to SSE
const eventSource = new EventSource('/api/notifications/stream');
eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // แสดง badge + popup notification
  addNotification(notification);
  playNotificationSound();
};
```

### REST API Endpoints

```
GET    /api/notifications          — ดึงรายการแจ้งเตือนทั้งหมด (?unread=true)
PATCH  /api/notifications/:id/read — mark as read
PATCH  /api/notifications/read-all — mark all as read
GET    /api/notifications/count    — นับจำนวน unread
```


## 2. Email Notification

เหมาะสำหรับแจ้งเตือนที่ admin อาจไม่ได้เปิดเว็บ

### เลือก Email Service

| Service     | ข้อดี                          | ราคา (ต่อเดือน)         |
|-------------|-------------------------------|------------------------|
| **Resend**  | API ง่าย, React Email template | ฟรี 3,000 emails       |
| **SendGrid**| เสถียร, analytics ดี           | ฟรี 100 emails/วัน     |
| **Nodemailer + Gmail** | ฟรีทั้งหมด         | ฟรี (จำกัด 500/วัน)    |

### โค้ดตัวอย่าง (Resend)

```javascript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingEmail(admin, booking, car, requester) {
  await resend.emails.send({
    from: 'FleetBook <noreply@yourcompany.com>',
    to: admin.email,
    subject: `🚗 คำขอจองรถใหม่ — ${car.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2>คำขอจองรถใหม่</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #666;">ผู้ขอจอง</td><td style="padding: 8px; font-weight: bold;">${requester.name}</td></tr>
          <tr><td style="padding: 8px; color: #666;">แผนก</td><td style="padding: 8px;">${requester.department}</td></tr>
          <tr><td style="padding: 8px; color: #666;">รถ</td><td style="padding: 8px;">${car.name} (${car.licensePlate})</td></tr>
          <tr><td style="padding: 8px; color: #666;">วันที่</td><td style="padding: 8px;">${booking.startDate} → ${booking.endDate}</td></tr>
          <tr><td style="padding: 8px; color: #666;">วัตถุประสงค์</td><td style="padding: 8px;">${booking.purpose}</td></tr>
        </table>
        <div style="margin-top: 24px;">
          <a href="${process.env.APP_URL}/bookings/${booking.id}" 
             style="background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            ดูรายละเอียด & อนุมัติ
          </a>
        </div>
      </div>
    `,
  });
}
```


## 3. LINE Notify

ยอดนิยมในไทย เพราะทีมส่วนใหญ่ใช้ LINE กันอยู่แล้ว

### ขั้นตอนตั้งค่า

1. ไปที่ https://notify-bot.line.me/ แล้ว Login
2. กด "Generate Token" เลือกกลุ่มหรือ 1-on-1
3. เก็บ Token ไว้ใน environment variable

### โค้ดตัวอย่าง

```javascript
async function sendLineNotify(token, message) {
  await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  });
}

// เรียกใช้
await sendLineNotify(
  process.env.LINE_NOTIFY_TOKEN,
  `\n🚗 คำขอจองรถใหม่\n` +
  `ผู้ขอ: ${requester.name}\n` +
  `รถ: ${car.name} (${car.licensePlate})\n` +
  `วันที่: ${booking.startDate} → ${booking.endDate}\n` +
  `วัตถุประสงค์: ${booking.purpose}\n` +
  `\nดูรายละเอียด: ${process.env.APP_URL}/bookings/${booking.id}`
);
```

### LINE Notify vs LINE Messaging API

| คุณสมบัติ       | LINE Notify          | LINE Messaging API       |
|----------------|----------------------|--------------------------|
| ความง่าย        | ง่ายมาก (1 API)      | ซับซ้อน (ต้อง Bot)        |
| ราคา            | ฟรีทั้งหมด            | มี Free tier             |
| ส่งรูป/Sticker  | ได้                   | ได้ + Rich Menu          |
| Interactive     | ไม่ได้               | ได้ (ปุ่มอนุมัติใน LINE)  |

สำหรับ prototype แนะนำ LINE Notify ก่อน ถ้าต้องการปุ่มอนุมัติใน LINE ค่อยอัปเกรดเป็น Messaging API


## 4. Notification Service (รวมทุกช่องทาง)

```javascript
// services/notification.service.js

class NotificationService {
  async dispatch(event) {
    const { type, userId, data } = event;
    
    // 1. ดึง user preferences
    const prefs = await db.notificationPrefs.findByUserId(userId);
    
    // 2. สร้าง notification record
    const notification = await db.notifications.create({
      userId, type,
      title: this.getTitle(type, data),
      message: this.getMessage(type, data),
      bookingId: data.bookingId,
      channels: [],
    });

    // 3. Dispatch ไปทุกช่องทางที่เปิดไว้ (parallel)
    const promises = [];
    
    if (prefs.inapp) {
      promises.push(this.sendInApp(userId, notification));
      notification.channels.push('inapp');
    }
    
    if (prefs.email) {
      promises.push(this.sendEmail(userId, notification, data));
      notification.channels.push('email');
    }
    
    if (prefs.line && prefs.lineToken) {
      promises.push(this.sendLine(prefs.lineToken, notification));
      notification.channels.push('line');
    }

    await Promise.allSettled(promises);
    await notification.save();
    
    return notification;
  }

  getTitle(type, data) {
    const titles = {
      new_booking: 'คำขอจองรถใหม่',
      booking_approved: 'การจองได้รับอนุมัติ',
      booking_rejected: 'การจองถูกปฏิเสธ',
      booking_reminder: 'เตือนการจองรถ',
    };
    return titles[type] || 'แจ้งเตือน';
  }
}
```

### User Preferences Schema

```sql
CREATE TABLE notification_preferences (
  user_id     INT PRIMARY KEY REFERENCES users(id),
  inapp       BOOLEAN DEFAULT true,
  email       BOOLEAN DEFAULT true,
  line        BOOLEAN DEFAULT false,
  line_token  VARCHAR(200),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```


## 5. Event Types ที่ควรมี

| Event                  | แจ้งใคร  | ความเร่งด่วน |
|------------------------|---------|-------------|
| `new_booking`          | Admin   | สูง          |
| `booking_approved`     | User    | สูง          |
| `booking_rejected`     | User    | สูง          |
| `booking_reminder`     | User    | ปานกลาง      |
| `car_returned`         | Admin   | ต่ำ          |
| `booking_cancelled`    | Admin   | ปานกลาง      |
| `maintenance_due`      | Admin   | ปานกลาง      |


## 6. Tech Stack แนะนำ

```
Frontend:   React + SSE (EventSource)
Backend:    Node.js + Express / NestJS
Database:   PostgreSQL + Prisma ORM
Email:      Resend (ง่ายที่สุด) หรือ SendGrid
LINE:       LINE Notify API (ฟรี)
Real-time:  SSE (ง่ายกว่า WebSocket สำหรับ notification)
Queue:      Bull + Redis (ถ้าต้องการ retry logic)
```


## 7. ขั้นตอนการพัฒนาแนะนำ

**Phase 1 (1-2 สัปดาห์):** In-App Notification — สร้าง notifications table, REST API, SSE real-time, UI bell + dropdown (ทำแล้วใน prototype)

**Phase 2 (1 สัปดาห์):** Email — เชื่อมต่อ Resend/SendGrid, สร้าง email template, ตั้งค่า notification preferences

**Phase 3 (2-3 วัน):** LINE Notify — สร้างหน้าเชื่อมต่อ LINE token, ส่ง notification ผ่าน LINE Notify API

**Phase 4 (เสริม):** Queue system, retry logic, notification history, digest email (สรุปรายวัน)
