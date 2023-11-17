require('dotenv').config();
const express = require('express');
const app = express();
const fs = require('fs');
const { PORT } = process.env;

app.set('view engine', 'ejs');
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/chat', (req, res) => res.render('index'));
app.get('/', (req, res) => res.render('home'));
app.get('/notification', (req, res) => {
  let { userId } = req.query;
  let db = require('./db.json');
  let notifications = db.notifications;
  if (userId) {
    notifications = notifications.filter((i) => i.userId == userId);
  }
  res.render('notification', { notifications, userId });
});

// config websoket
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.post('/notification', (req, res) => {
  let { userId, title, body } = req.body;
  let db = require('./db.json');

  let newNotification = {
    id: db.notificationId++,
    userId,
    title,
    body,
    isRead: false,
  };
  db.notifications.push(newNotification);

  // save to json
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 4));

  // kirim notifikasi baru
  io.emit(`user-${userId}`, newNotification);

  res.json({
    status: true,
    data: newNotification,
  });
});

app.get('/notification/:id/mark-is-read', (req, res) => {
  let notificationId = parseInt(req.params.id);
  let db = require('./db.json');

  let notification = db.notifications.find((n) => n.id === notificationId);
  // let userId = notification.userId;
  if (notification) {
    notification.isRead = true;

    // save to database
    fs.writeFileSync('./db.json', JSON.stringify(db, null, 4));

    res.redirect(`/notification?userId=${notification.userId}`);

    res.json({
      status: true,
      message: `Notification ${notificationId} marked as read`,
    });
  } else {
    res.status(404).json({
      status: false,
      message: `Notification ${notificationId} not found`,
    });
  }
});

io.on('connection', (client) => {
  client.on('chat message', (msg) => {
    console.log('Server', msg);
    io.emit('chat message', msg);
  });
});

server.listen(PORT, () => {
  console.log(`server running in port ${PORT}`);
});
