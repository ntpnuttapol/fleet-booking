class LineService {
    async sendLineNotify(token, notification) {
        if (!token) {
            console.log(`[LINE Mock] No token provided for ${notification.type}`);
            return;
        }

        try {
            const response = await fetch('https://notify-api.line.me/api/notify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ message: `\n${notification.message}` }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${await response.text()}`);
            }
            console.log(`[LINE] Sent notify for event ${notification.type}`);
        } catch (error) {
            console.error(`[LINE Error] Failed to send LINE Notify:`, error);
        }
    }
}

module.exports = new LineService();
