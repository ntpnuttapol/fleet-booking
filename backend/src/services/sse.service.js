const EventEmitter = require('events');

class SSEService extends EventEmitter {
    constructor() {
        super();
        // increase max listeners if many users connect
        this.setMaxListeners(100);
    }

    // Called when a user connects to the SSE endpoint
    addClient(userId, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial ping to keep connection open
        res.write('data: {"type": "ping"}\n\n');

        const listener = (notification) => {
            res.write(`data: ${JSON.stringify(notification)}\n\n`);
        };

        const eventName = `notify:${userId}`;
        this.on(eventName, listener);

        return () => {
            this.off(eventName, listener);
        };
    }

    // Called by NotificationService to send an event
    sendToUser(userId, data) {
        this.emit(`notify:${userId}`, data);
    }
}

module.exports = new SSEService();
